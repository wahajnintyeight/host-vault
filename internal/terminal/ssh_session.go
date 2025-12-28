package terminal

import (
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

type SSHSession struct {
	id         string
	client     *ssh.Client
	session    *ssh.Session
	stdin      io.WriteCloser
	stdout     io.Reader
	metadata   SessionMetadata
	mu         sync.RWMutex
	closed     bool
	buffer     chan []byte
	connectionID string
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
		return nil, fmt.Errorf("failed to create SSH session: %w", err)
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
		},
		buffer:       make(chan []byte, 100),
		closed:       false,
		connectionID: connectionID,
	}

	go sshSession.readOutput(stdout)
	go sshSession.readOutput(stderr)

	return sshSession, nil
}

func (s *SSHSession) readOutput(reader io.Reader) {
	buf := make([]byte, 4096)
	for {
		n, err := reader.Read(buf)
		if err != nil {
			if err != io.EOF {
			}
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
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return nil
	}

	s.closed = true

	if s.session != nil {
		s.session.Close()
	}

	if s.client != nil {
		s.client.Close()
	}

	close(s.buffer)

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
