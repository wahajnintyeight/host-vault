//go:build windows

package terminal

import (
	"context"
	"io"
	"log"
	"os"
	"sync"
	"time"

	"github.com/UserExistsError/conpty"
	"github.com/google/uuid"
)

type LocalPTYSession struct {
	id              string
	cpty            *conpty.ConPty
	metadata        SessionMetadata
	mu              sync.RWMutex
	closed          bool
	buffer          chan []byte
	done            chan struct{}
	bufferCloseOnce sync.Once
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
	go session.waitForExit()

	return session, nil
}

// waitForExit waits for the process to exit and closes the buffer
func (s *LocalPTYSession) waitForExit() {
	log.Printf("[LOCAL] Session %s starting waitForExit goroutine", s.id)

	// Wait for the process to exit
	exitCode, err := s.cpty.Wait(context.Background())

	if err != nil {
		log.Printf("[LOCAL] Session %s Wait error: %v", s.id, err)
	} else {
		log.Printf("[LOCAL] Session %s process exited with code: %d", s.id, exitCode)
	}

	// Close the buffer to signal that output has ended
	// This will cause ReadOutput to return nil, triggering terminal:closed event
	s.bufferCloseOnce.Do(func() {
		log.Printf("[LOCAL] Session %s closing buffer channel from waitForExit", s.id)
		close(s.buffer)
	})
}

func (s *LocalPTYSession) readOutput() {
	buf := make([]byte, 4096)
	zeroReadCount := 0
	const maxZeroReads = 10 // After 10 consecutive zero reads (1 second), assume process exited

	for {
		select {
		case <-s.done:
			log.Printf("[LOCAL] Session %s readOutput received done signal, exiting", s.id)
			return
		default:
			n, err := s.cpty.Read(buf)
			if err != nil {
				if err != io.EOF {
					// For non-EOF errors, check if it's a "broken pipe" or similar
					// which indicates the process has exited
					if err.Error() == "EOF" ||
						err.Error() == "read: The handle is invalid" ||
						err.Error() == "read: The pipe is being closed" {
						log.Printf("[LOCAL] Session %s readOutput detected process exit (error: %v), closing buffer", s.id, err)
						s.bufferCloseOnce.Do(func() {
							log.Printf("[LOCAL] Session %s closing buffer channel", s.id)
							close(s.buffer)
						})
						return
					}
					// Log error but don't close immediately - might be recoverable
					log.Printf("[LOCAL] Session %s readOutput non-fatal error: %v, retrying...", s.id, err)
					select {
					case <-time.After(100 * time.Millisecond):
						// Brief pause before retry
					case <-s.done:
						return
					}
					continue
				}
				// EOF detected - close buffer channel to signal streamOutput
				log.Printf("[LOCAL] Session %s readOutput received EOF, closing buffer", s.id)
				s.bufferCloseOnce.Do(func() {
					log.Printf("[LOCAL] Session %s closing buffer channel", s.id)
					close(s.buffer)
				})
				return
			}
			if n > 0 {
				zeroReadCount = 0 // Reset counter on successful read
				data := make([]byte, n)
				copy(data, buf[:n])

				// Block until buffer has space - NEVER drop data
				// The large buffer (1000) should handle temporary slowdowns
				// If frontend is truly stuck, user will close the tab anyway
				select {
				case s.buffer <- data:
				case <-s.done:
					return
				}
			} else if n == 0 {
				// Zero-length read might indicate process exit
				zeroReadCount++
				if zeroReadCount >= maxZeroReads {
					// Too many zero reads - process likely exited
					// When PowerShell exits, ConPTY may not immediately close the pipe,
					// but we get zero-length reads. After multiple consecutive zeros,
					// we assume the process has exited.
					log.Printf("[LOCAL] Session %s readOutput detected %d consecutive zero reads, assuming process exited, closing buffer", s.id, zeroReadCount)
					s.bufferCloseOnce.Do(func() {
						log.Printf("[LOCAL] Session %s closing buffer channel", s.id)
						close(s.buffer)
					})
					return
				}
				// Give it a brief moment and check again
				select {
				case <-time.After(100 * time.Millisecond):
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
		log.Printf("[LOCAL] Session %s already closed, skipping", s.id)
		return nil
	}

	log.Printf("[LOCAL] Session %s closing...", s.id)
	s.closed = true

	// Signal readOutput goroutine to stop
	close(s.done)

	// Ensure buffer is closed (only once)
	s.bufferCloseOnce.Do(func() {
		log.Printf("[LOCAL] Session %s closing buffer channel in Close()", s.id)
		close(s.buffer)
	})

	if s.cpty != nil {
		s.cpty.Close()
	}

	log.Printf("[LOCAL] Session %s closed successfully", s.id)
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
		log.Printf("[LOCAL] Session %s ReadOutput received nil (buffer closed), returning nil to trigger terminal:closed", s.id)
		return nil
	}
	return data
}
