package terminal

import (
	"time"
)

type SessionType string

const (
	SessionTypeLocal SessionType = "local"
	SessionTypeSSH   SessionType = "ssh"
)

type SessionMetadata struct {
	WorkingDirectory string            `json:"workingDirectory"`
	Shell            string            `json:"shell"`
	Environment      map[string]string `json:"environment"`
	ConnectionID     string            `json:"connectionID,omitempty"`
	CreatedAt        time.Time         `json:"createdAt"`
}

type Session interface {
	ID() string
	Type() SessionType
	Write(data []byte) error
	Resize(cols, rows int) error
	Close() error
	GetMetadata() SessionMetadata
	ReadOutput() []byte
}

type TerminalOutputEvent struct {
	SessionID string `json:"SessionID"`
	Data      string `json:"Data"`
}

type TerminalClosedEvent struct {
	SessionID string `json:"SessionID"`
}

type TerminalErrorEvent struct {
	SessionID string `json:"SessionID"`
	Error     string `json:"Error"`
}
