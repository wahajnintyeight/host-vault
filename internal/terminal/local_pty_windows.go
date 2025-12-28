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
	done     chan struct{}
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
			State:            SessionStateActive,
		},
		buffer: make(chan []byte, 1000), // Increased buffer size
		closed: false,
		done:   make(chan struct{}),
	}

	go session.readOutput()

	return session, nil
}

func (s *LocalPTYSession) readOutput() {
	buf := make([]byte, 4096)
	for {
		select {
		case <-s.done:
			return
		default:
			n, err := s.cpty.Read(buf)
			if err != nil {
				if err != io.EOF {
					// Log error but don't close immediately - might be recoverable
					select {
					case <-time.After(100 * time.Millisecond):
						// Brief pause before retry
					case <-s.done:
						return
					}
					continue
				}
				// Close buffer channel when EOF is reached
				close(s.buffer)
				return
			}
			if n > 0 {
				data := make([]byte, n)
				copy(data, buf[:n])

				// Use timeout to prevent blocking indefinitely
				select {
				case s.buffer <- data:
				case <-time.After(1 * time.Second):
					// Buffer full, drop data to prevent blocking
				case <-s.done:
					return
				}
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

	// Signal readOutput goroutine to stop
	close(s.done)

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
