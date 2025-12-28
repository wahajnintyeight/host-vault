//go:build windows

package terminal

import (
	"io"
	"os"
	"sync"
	"time"

	"github.com/UserExistsError/conpty"
	"github.com/google/uuid"
)

type LocalPTYSession struct {
	id       string
	cpty     *conpty.ConPty
	metadata SessionMetadata
	mu       sync.RWMutex
	closed   bool
	buffer   chan []byte
}

func NewLocalPTYSession(shell, cwd string, env map[string]string) (*LocalPTYSession, error) {
	sessionID := uuid.New().String()

	if shell == "" {
		shell = "powershell.exe"
	}

	if cwd == "" {
		cwd, _ = os.Getwd()
	}

	// Build ConPTY options
	opts := []conpty.ConPtyOption{
		conpty.ConPtyDimensions(120, 30),
		conpty.ConPtyWorkDir(cwd),
	}

	// Create ConPTY with options including working directory
	cpty, err := conpty.Start(shell, opts...)
	if err != nil {
		return nil, err
	}

	session := &LocalPTYSession{
		id:   sessionID,
		cpty: cpty,
		metadata: SessionMetadata{
			WorkingDirectory: cwd,
			Shell:            shell,
			Environment:      env,
			CreatedAt:        time.Now(),
		},
		buffer: make(chan []byte, 100),
		closed: false,
	}

	go session.readOutput()

	return session, nil
}

func (s *LocalPTYSession) readOutput() {
	buf := make([]byte, 4096)
	for {
		n, err := s.cpty.Read(buf)
		if err != nil {
			if err != io.EOF {
				// Log error if needed
			}
			close(s.buffer)
			return
		}
		if n > 0 {
			data := make([]byte, n)
			copy(data, buf[:n])
			select {
			case s.buffer <- data:
			default:
				// Buffer full, drop data
			}
		}
	}
}

func (s *LocalPTYSession) ID() string {
	return s.id
}

func (s *LocalPTYSession) Type() SessionType {
	return SessionTypeLocal
}

func (s *LocalPTYSession) Write(data []byte) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.closed {
		return nil
	}

	_, err := s.cpty.Write(data)
	return err
}

func (s *LocalPTYSession) Resize(cols, rows int) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.closed {
		return nil
	}

	return s.cpty.Resize(cols, rows)
}

func (s *LocalPTYSession) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return nil
	}

	s.closed = true

	if s.cpty != nil {
		s.cpty.Close()
	}

	return nil
}

func (s *LocalPTYSession) GetMetadata() SessionMetadata {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.metadata
}

func (s *LocalPTYSession) ReadOutput() []byte {
	data, ok := <-s.buffer
	if !ok {
		return nil
	}
	return data
}
