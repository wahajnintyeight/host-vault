package terminal

import (
	"fmt"
	"io"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

type SSHSession struct {
	id           string
	client       *ssh.Client
	session      *ssh.Session
	stdin        io.WriteCloser
	stdout       io.Reader
	stderr       io.Reader
	metadata     SessionMetadata
	mu           sync.RWMutex
	closed       bool
	buffer       chan []byte
	connectionID string
	keepAliveTicker *time.Ticker
	done         chan struct{}
}

type ConnectionConfig struct {
	Host       string
	Port       int
	Username   string
	Password   string
	PrivateKey string
}

func NewSSHSession(connectionID string, config ConnectionConfig) (*SSHSession, error) {
	sessionID := uuid.New().String()
	log.Printf("[SSH] Creating new SSH session %s for connection %s", sessionID, connectionID)

	var authMethods []ssh.AuthMethod

	if config.Password != "" {
		authMethods = append(authMethods, ssh.Password(config.Password))
	}

	if config.PrivateKey != "" {
		signer, err := ssh.ParsePrivateKey([]byte(config.PrivateKey))
		if err == nil {
			authMethods = append(authMethods, ssh.PublicKeys(signer))
		}
	}

	clientConfig := &ssh.ClientConfig{
		User:            config.Username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         30 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)
	client, err := ssh.Dial("tcp", addr, clientConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to dial SSH: %w", err)
	}

	session, err := client.NewSession()
	if err != nil {
		client.Close()
		return nil, fmt.Errorf("%w", err)
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderr, err := session.StderrPipe()
	if err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	if err := session.RequestPty("xterm-256color", 80, 24, modes); err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to request PTY: %w", err)
	}

	if err := session.Shell(); err != nil {
		session.Close()
		client.Close()
		return nil, fmt.Errorf("failed to start shell: %w", err)
	}

	sshSession := &SSHSession{
		id:           sessionID,
		client:       client,
		session:      session,
		stdin:        stdin,
		stdout:       stdout,
		metadata: SessionMetadata{
			WorkingDirectory: "",
			Shell:            "remote-shell",
			Environment:      make(map[string]string),
			ConnectionID:     connectionID,
			CreatedAt:        time.Now(),
			State:            SessionStateActive,
		},
		buffer:       make(chan []byte, 1000), // Increased buffer size
		closed:       false,
		connectionID: connectionID,
		done:         make(chan struct{}),
	}

	// Start keep-alive mechanism
	sshSession.keepAliveTicker = time.NewTicker(30 * time.Second)
	go sshSession.keepAlive()

	go sshSession.readOutput(stdout)
	go sshSession.readOutput(stderr)

	log.Printf("[SSH] SSH session %s connected successfully to %s:%d", sessionID, config.Host, config.Port)
	return sshSession, nil
}

func (s *SSHSession) readOutput(reader io.Reader) {
	buf := make([]byte, 4096)
	consecutiveErrors := 0
	maxConsecutiveErrors := 5

	for {
		select {
		case <-s.done:
			return
		default:
			n, err := reader.Read(buf)
			if err != nil {
				if err != io.EOF {
					consecutiveErrors++
			if consecutiveErrors >= maxConsecutiveErrors {
				// Too many consecutive errors - connection is likely broken
				log.Printf("[SSH] Session %s disconnected due to %d consecutive read errors", s.id, consecutiveErrors)
				return
			}

					// Brief pause before retry
					select {
					case <-time.After(100 * time.Millisecond):
					case <-s.done:
						return
					}
					continue
				}
				return
			}

			// Reset error counter on successful read
			consecutiveErrors = 0

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

func (s *SSHSession) keepAlive() {
	log.Printf("[SSH] Keep-alive started for session %s", s.id)
	for {
		select {
		case <-s.keepAliveTicker.C:
			s.mu.RLock()
			if s.closed {
				s.mu.RUnlock()
				log.Printf("[SSH] Keep-alive stopped for session %s (session closed)", s.id)
				return
			}

			// Send a keep-alive message
			if s.session != nil {
				_, err := s.session.SendRequest("keepalive@host-vault", true, nil)
				if err != nil {
					log.Printf("[SSH] Keep-alive failed for session %s: %v", s.id, err)
				} else {
					log.Printf("[SSH] Keep-alive sent for session %s", s.id)
				}
			}
			s.mu.RUnlock()

		case <-s.done:
			log.Printf("[SSH] Keep-alive stopped for session %s (done signal)", s.id)
			return
		}
	}
}

func (s *SSHSession) ID() string {
	return s.id
}

func (s *SSHSession) Type() SessionType {
	return SessionTypeSSH
}

func (s *SSHSession) Write(data []byte) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.closed {
		return nil
	}

	_, err := s.stdin.Write(data)
	return err
}

func (s *SSHSession) Resize(cols, rows int) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.closed {
		return nil
	}

	return s.session.WindowChange(rows, cols)
}

func (s *SSHSession) Close() error {
	log.Printf("[SSH] Closing session %s", s.id)
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		log.Printf("[SSH] Session %s already closed", s.id)
		return nil
	}

	s.closed = true

	// Signal all goroutines to stop
	close(s.done)

	// Close connection
	s.closeConnection()

	// Close buffer channel (but don't panic if already closed)
	select {
	case <-s.buffer:
		// Channel already closed or has data
	default:
		close(s.buffer)
	}

	return nil
}

func (s *SSHSession) GetMetadata() SessionMetadata {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.metadata
}

func (s *SSHSession) ReadOutput() []byte {
	data, ok := <-s.buffer
	if !ok {
		return nil
	}
	return data
}

func (s *SSHSession) Reconnect(config ConnectionConfig) error {
	log.Printf("[SSH] Attempting to reconnect session %s to %s:%d", s.id, config.Host, config.Port)
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.closed {
		// Close existing connection if it's still open
		s.closeConnection()
	}

	// Reset done channel
	s.done = make(chan struct{})

	// Attempt to create new connection
	var authMethods []ssh.AuthMethod

	if config.Password != "" {
		authMethods = append(authMethods, ssh.Password(config.Password))
	}

	if config.PrivateKey != "" {
		signer, err := ssh.ParsePrivateKey([]byte(config.PrivateKey))
		if err == nil {
			authMethods = append(authMethods, ssh.PublicKeys(signer))
		}
	}

	clientConfig := &ssh.ClientConfig{
		User:            config.Username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         30 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)
	client, err := ssh.Dial("tcp", addr, clientConfig)
	if err != nil {
		return fmt.Errorf("failed to reconnect SSH: %w", err)
	}

	session, err := client.NewSession()
	if err != nil {
		client.Close()
		return fmt.Errorf("failed to create session: %w", err)
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		session.Close()
		client.Close()
		return fmt.Errorf("failed to create stdin pipe: %w", err)
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		session.Close()
		client.Close()
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderr, err := session.StderrPipe()
	if err != nil {
		session.Close()
		client.Close()
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	// Start output reading for stderr
	go s.readOutput(stderr)

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	if err := session.RequestPty("xterm-256color", 80, 24, modes); err != nil {
		session.Close()
		client.Close()
		return fmt.Errorf("failed to request PTY: %w", err)
	}

	if err := session.Shell(); err != nil {
		session.Close()
		client.Close()
		return fmt.Errorf("failed to start shell: %w", err)
	}

	// Update session fields
	s.client = client
	s.session = session
	s.stdin = stdin
	s.stdout = stdout
	s.stderr = stderr
	s.metadata.State = SessionStateActive

	// Restart keep-alive
	s.keepAliveTicker = time.NewTicker(30 * time.Second)
	go s.keepAlive()

	// Restart output reading
	go s.readOutput(s.stdout)
	go s.readOutput(s.stderr)

	log.Printf("[SSH] Session %s reconnected successfully", s.id)
	return nil
}

func (s *SSHSession) closeConnection() {
	if s.keepAliveTicker != nil {
		s.keepAliveTicker.Stop()
	}

	if s.session != nil {
		s.session.Close()
		s.session = nil
	}

	if s.client != nil {
		s.client.Close()
		s.client = nil
	}

	if s.stdin != nil {
		s.stdin.Close()
		s.stdin = nil
	}

	s.stdout = nil
	s.stderr = nil
}
