package terminal

import (
	"context"
	"fmt"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type TerminalManager struct {
	sessions map[string]Session
	mu       sync.RWMutex
	ctx      context.Context
}

func NewTerminalManager(ctx context.Context) *TerminalManager {
	return &TerminalManager{
		sessions: make(map[string]Session),
		ctx:      ctx,
	}
}

func (tm *TerminalManager) CreateLocalSession(shell, cwd string, env map[string]string) (string, error) {
	session, err := NewLocalPTYSession(shell, cwd, env)
	if err != nil {
		return "", fmt.Errorf("failed to create local session: %w", err)
	}

	tm.mu.Lock()
	tm.sessions[session.ID()] = session
	tm.mu.Unlock()

	go tm.streamOutput(session)

	return session.ID(), nil
}

func (tm *TerminalManager) CreateSSHSession(connectionID string, config ConnectionConfig) (string, error) {
	session, err := NewSSHSession(connectionID, config)
	if err != nil {
		return "", fmt.Errorf("failed to create SSH session: %w", err)
	}

	tm.mu.Lock()
	tm.sessions[session.ID()] = session
	tm.mu.Unlock()

	go tm.streamOutput(session)

	return session.ID(), nil
}

func (tm *TerminalManager) DuplicateSession(sessionID string) (string, error) {
	tm.mu.RLock()
	originalSession, exists := tm.sessions[sessionID]
	tm.mu.RUnlock()

	if !exists {
		return "", fmt.Errorf("session not found: %s", sessionID)
	}

	metadata := originalSession.GetMetadata()

	if originalSession.Type() == SessionTypeLocal {
		return tm.CreateLocalSession(metadata.Shell, metadata.WorkingDirectory, metadata.Environment)
	}

	return "", fmt.Errorf("session duplication not supported for SSH sessions yet")
}

func (tm *TerminalManager) WriteToSession(sessionID string, data []byte) error {
	tm.mu.RLock()
	session, exists := tm.sessions[sessionID]
	tm.mu.RUnlock()

	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	return session.Write(data)
}

func (tm *TerminalManager) ResizeSession(sessionID string, cols, rows int) error {
	tm.mu.RLock()
	session, exists := tm.sessions[sessionID]
	tm.mu.RUnlock()

	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	return session.Resize(cols, rows)
}

func (tm *TerminalManager) CloseSession(sessionID string) error {
	tm.mu.Lock()
	session, exists := tm.sessions[sessionID]
	if exists {
		delete(tm.sessions, sessionID)
	}
	tm.mu.Unlock()

	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	err := session.Close()
	
	runtime.EventsEmit(tm.ctx, "terminal:closed", TerminalClosedEvent{
		SessionID: sessionID,
	})

	return err
}

func (tm *TerminalManager) GetSessionMetadata(sessionID string) (SessionMetadata, error) {
	tm.mu.RLock()
	session, exists := tm.sessions[sessionID]
	tm.mu.RUnlock()

	if !exists {
		return SessionMetadata{}, fmt.Errorf("session not found: %s", sessionID)
	}

	return session.GetMetadata(), nil
}

func (tm *TerminalManager) streamOutput(session Session) {
	sessionID := session.ID()
	
	for {
		data := session.ReadOutput()
		if data == nil {
			runtime.EventsEmit(tm.ctx, "terminal:closed", TerminalClosedEvent{
				SessionID: sessionID,
			})
			
			tm.mu.Lock()
			delete(tm.sessions, sessionID)
			tm.mu.Unlock()
			
			break
		}

		runtime.EventsEmit(tm.ctx, "terminal:output", TerminalOutputEvent{
			SessionID: sessionID,
			Data:      string(data),
		})
	}
}

func (tm *TerminalManager) CloseAll() {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	for _, session := range tm.sessions {
		session.Close()
	}

	tm.sessions = make(map[string]Session)
}
