package terminal

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/crypto/ssh"
)

type TerminalManager struct {
	sessions      map[string]Session
	mu            sync.RWMutex
	ctx           context.Context
	knownHostsMgr *KnownHostsManager
}

func NewTerminalManager(ctx context.Context) *TerminalManager {
	// Initialize known hosts manager
	// Try to get app data path from environment or use default
	appDataPath := os.Getenv("APPDATA")
	if appDataPath == "" {
		// Fallback for non-Windows or if APPDATA is not set
		homeDir, err := os.UserHomeDir()
		if err != nil {
			log.Printf("[TERM] Failed to get home directory: %v", err)
			appDataPath = "."
		} else {
			appDataPath = filepath.Join(homeDir, "AppData", "Roaming")
		}
	}
	appPath := filepath.Join(appDataPath, "host-vault")

	knownHostsMgr, err := NewKnownHostsManager(appPath)
	if err != nil {
		log.Printf("[TERM] Failed to initialize known hosts manager: %v", err)
		knownHostsMgr = nil
	} else {
		log.Printf("[TERM] Known hosts manager initialized at: %s", appPath)
	}

	return &TerminalManager{
		sessions:      make(map[string]Session),
		ctx:           ctx,
		knownHostsMgr: knownHostsMgr,
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
	log.Printf("[TERM] Creating SSH session for connection %s", connectionID)
	session, err := NewSSHSession(connectionID, config, tm.knownHostsMgr)
	if err != nil {
		log.Printf("[TERM] Failed to create SSH session for connection %s: %v", connectionID, err)
		return "", fmt.Errorf("%w", err)
	}

	log.Printf("[TERM] SSH session %s created successfully", session.ID())
	tm.mu.Lock()
	tm.sessions[session.ID()] = session
	tm.mu.Unlock()

	go tm.streamOutput(session)

	return session.ID(), nil
}

// GetHostKeyInfo gets the host key fingerprint for a host
func (tm *TerminalManager) GetHostKeyInfo(host string, port int) (*HostKeyInfo, error) {
	if tm.knownHostsMgr == nil {
		return nil, fmt.Errorf("known hosts manager not initialized")
	}
	return tm.knownHostsMgr.GetHostKeyInfo(host, port)
}

// AcceptHostKey accepts and stores a host key (keyBase64 is base64 encoded public key)
// If isGuest is true, the key is only stored in memory and not persisted to disk
func (tm *TerminalManager) AcceptHostKey(host string, port int, keyBase64 string, isGuest bool) error {
	if tm.knownHostsMgr == nil {
		return fmt.Errorf("known hosts manager not initialized")
	}

	// Decode base64 key
	keyBytes, err := base64.StdEncoding.DecodeString(keyBase64)
	if err != nil {
		return fmt.Errorf("failed to decode key: %w", err)
	}

	// Parse the public key
	key, err := ssh.ParsePublicKey(keyBytes)
	if err != nil {
		return fmt.Errorf("failed to parse public key: %w", err)
	}

	return tm.knownHostsMgr.AddHostKey(host, port, key, isGuest)
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
	log.Printf("[TERM] CloseSession called for session %s", sessionID)
	tm.mu.Lock()
	session, exists := tm.sessions[sessionID]
	if exists {
		log.Printf("[TERM] Removing session %s from sessions map", sessionID)
		delete(tm.sessions, sessionID)
	}
	tm.mu.Unlock()

	if !exists {
		log.Printf("[TERM] Session %s not found for closing (may already be closed)", sessionID)
		return fmt.Errorf("session not found: %s", sessionID)
	}

	log.Printf("[TERM] Calling Close() on session %s", sessionID)
	err := session.Close()

	log.Printf("[TERM] Emitting terminal:closed event for session %s", sessionID)
	runtime.EventsEmit(tm.ctx, "terminal:closed", TerminalClosedEvent{
		SessionID: sessionID,
	})

	log.Printf("[TERM] Session %s closed successfully", sessionID)
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

// GetSessionScrollback retrieves all scrollback history for an SSH session
func (tm *TerminalManager) GetSessionScrollback(sessionID string) ([][]byte, error) {
	tm.mu.RLock()
	session, exists := tm.sessions[sessionID]
	tm.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	// Only SSH sessions have scrollback
	if sshSession, ok := session.(*SSHSession); ok {
		return sshSession.GetScrollbackHistory(), nil
	}

	return nil, nil
}

func (tm *TerminalManager) streamOutput(session Session) {
	sessionID := session.ID()
	log.Printf("[TERM] Starting output stream for session %s", sessionID)

	for {
		data := session.ReadOutput()
		if data == nil {
			log.Printf("[TERM] Session %s output stream ended - will emit terminal:closed", sessionID)

			// Clean up the session from our map
			tm.mu.Lock()
			_, exists := tm.sessions[sessionID]
			if exists {
				delete(tm.sessions, sessionID)
				log.Printf("[TERM] Removed session %s from sessions map", sessionID)
			}
			tm.mu.Unlock()

			// Emit closed event so frontend can close the tab
			log.Printf("[TERM] Emitting terminal:closed for session %s", sessionID)
			runtime.EventsEmit(tm.ctx, "terminal:closed", TerminalClosedEvent{
				SessionID: sessionID,
			})
			break
		}

		runtime.EventsEmit(tm.ctx, "terminal:output", TerminalOutputEvent{
			SessionID: sessionID,
			Data:      string(data),
		})
	}
	log.Printf("[TERM] Output stream ended for session %s", sessionID)
}

func (tm *TerminalManager) IsSessionReferenced(sessionID string) bool {
	return true
}

func (tm *TerminalManager) ReconnectSession(sessionID string, config ConnectionConfig) error {
	log.Printf("[TERM] Attempting to reconnect session %s", sessionID)
	tm.mu.RLock()
	session, exists := tm.sessions[sessionID]
	tm.mu.RUnlock()

	if !exists {
		log.Printf("[TERM] Session %s not found for reconnection", sessionID)
		return fmt.Errorf("session not found: %s", sessionID)
	}

	if session.Type() != SessionTypeSSH {
		log.Printf("[TERM] Reconnection not supported for session type: %s", session.Type())
		return fmt.Errorf("reconnection only supported for SSH sessions")
	}

	sshSession, ok := session.(*SSHSession)
	if !ok {
		log.Printf("[TERM] Failed to cast session %s to SSH session", sessionID)
		return fmt.Errorf("failed to cast session to SSH session")
	}

	err := sshSession.Reconnect(config)
	if err != nil {
		log.Printf("[TERM] Failed to reconnect session %s: %v", sessionID, err)
		return fmt.Errorf("failed to reconnect session: %w", err)
	}

	go tm.streamOutput(session)

	runtime.EventsEmit(tm.ctx, "terminal:reconnected", TerminalClosedEvent{
		SessionID: sessionID,
	})

	log.Printf("[TERM] Session %s reconnected successfully", sessionID)
	return nil
}

func (tm *TerminalManager) CloseAll() {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	for _, session := range tm.sessions {
		session.Close()
	}

	tm.sessions = make(map[string]Session)
}
