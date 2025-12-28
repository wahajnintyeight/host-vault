//go:build !windows

package terminal

import (
	"io"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/google/uuid"
)

type LocalPTYSession struct {
	id       string
	cmd      *exec.Cmd
	ptyFile  *os.File
	metadata SessionMetadata
	mu       sync.RWMutex
	closed   bool
	buffer   chan []byte
}

func NewLocalPTYSession(shell, cwd string, env map[string]string) (*LocalPTYSession, error) {
	sessionID := uuid.New().String()

	if shell == "" {
		if runtime.GOOS == "windows" {
			shell = "powershell.exe"
		} else {
			shell = os.Getenv("SHELL")
			if shell == "" {
				shell = "/bin/bash"
			}
		}
	}

	if cwd == "" {
		cwd, _ = os.Getwd()
	}

	cmd := exec.Command(shell)
	cmd.Dir = cwd

	if env != nil {
		cmd.Env = os.Environ()
		for k, v := range env {
			cmd.Env = append(cmd.Env, k+"="+v)
		}
	}

	ptyFile, err := pty.Start(cmd)
	if err != nil {
		return nil, err
	}

	session := &LocalPTYSession{
		id:      sessionID,
		cmd:     cmd,
		ptyFile: ptyFile,
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
		n, err := s.ptyFile.Read(buf)
		if err != nil {
			if err != io.EOF {
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

	_, err := s.ptyFile.Write(data)
	return err
}

func (s *LocalPTYSession) Resize(cols, rows int) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.closed {
		return nil
	}

	return pty.Setsize(s.ptyFile, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
}

func (s *LocalPTYSession) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return nil
	}

	s.closed = true

	if s.ptyFile != nil {
		s.ptyFile.Close()
	}

	if s.cmd != nil && s.cmd.Process != nil {
		s.cmd.Process.Kill()
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
