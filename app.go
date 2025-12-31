package main

import (
	"context"
	"errors"
	"fmt"
	"host-vault/internal/terminal"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx             context.Context
	terminalManager *terminal.TerminalManager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.terminalManager = terminal.NewTerminalManager(ctx)
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// SaveToKeychain saves a value to Windows Credential Manager
// This is a placeholder - actual implementation will use golang.org/x/sys/windows
func (a *App) SaveToKeychain(key string, value string) error {
	// TODO: Implement Windows Credential Manager integration
	// For now, return an error indicating it's not implemented
	return errors.New("Windows Credential Manager integration not yet implemented")
}

// GetFromKeychain retrieves a value from Windows Credential Manager
func (a *App) GetFromKeychain(key string) (string, error) {
	// TODO: Implement Windows Credential Manager integration
	return "", errors.New("Windows Credential Manager integration not yet implemented")
}

// DeleteFromKeychain removes a value from Windows Credential Manager
func (a *App) DeleteFromKeychain(key string) error {
	// TODO: Implement Windows Credential Manager integration
	return errors.New("Windows Credential Manager integration not yet implemented")
}

// GetAppDataPath returns the application data directory path
// On Windows: %APPDATA%\host-vault
func (a *App) GetAppDataPath() (string, error) {
	appDataDir := os.Getenv("APPDATA")
	if appDataDir == "" {
		return "", errors.New("APPDATA environment variable not set")
	}

	appPath := filepath.Join(appDataDir, "host-vault")

	// Create directory if it doesn't exist
	if err := os.MkdirAll(appPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create app data directory: %w", err)
	}

	return appPath, nil
}

// GetDatabasePath returns the path to the SQLite database file
func (a *App) GetDatabasePath() (string, error) {
	appPath, err := a.GetAppDataPath()
	if err != nil {
		return "", err
	}

	dbPath := filepath.Join(appPath, "db", "main.db")

	// Create db directory if it doesn't exist
	dbDir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create db directory: %w", err)
	}

	return dbPath, nil
}

// GetBackupPath returns the path to the backups directory
func (a *App) GetBackupPath() (string, error) {
	appPath, err := a.GetAppDataPath()
	if err != nil {
		return "", err
	}

	backupPath := filepath.Join(appPath, "backups")

	// Create backups directory if it doesn't exist
	if err := os.MkdirAll(backupPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create backups directory: %w", err)
	}

	return backupPath, nil
}

// GetGuestConfigPath returns the path to the guest config file
// Path: %APPDATA%\host-vault\guest\config.json
func (a *App) GetGuestConfigPath() (string, error) {
	appPath, err := a.GetAppDataPath()
	if err != nil {
		return "", err
	}

	guestPath := filepath.Join(appPath, "guest")

	// Create guest directory if it doesn't exist
	if err := os.MkdirAll(guestPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create guest directory: %w", err)
	}

	configPath := filepath.Join(guestPath, "config.json")
	return configPath, nil
}

// GetUserConfigPath returns the path to a user's config file
// Path: %APPDATA%\host-vault\users\{userId}\config.json
func (a *App) GetUserConfigPath(userId string) (string, error) {
	appPath, err := a.GetAppDataPath()
	if err != nil {
		return "", err
	}

	userPath := filepath.Join(appPath, "users", userId)

	// Create user directory if it doesn't exist
	if err := os.MkdirAll(userPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create user directory: %w", err)
	}

	configPath := filepath.Join(userPath, "config.json")
	return configPath, nil
}

// GetGuestSnippetsPath returns the path to the guest snippets file
// Path: %APPDATA%\host-vault\guest\commands.json
func (a *App) GetGuestSnippetsPath() (string, error) {
	appPath, err := a.GetAppDataPath()
	if err != nil {
		return "", err
	}

	guestPath := filepath.Join(appPath, "guest")

	if err := os.MkdirAll(guestPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create guest directory: %w", err)
	}

	return filepath.Join(guestPath, "commands.json"), nil
}

// GetUserSnippetsPath returns the path to a user's snippets file
// Path: %APPDATA%\host-vault\users\{userId}\commands.json
func (a *App) GetUserSnippetsPath(userId string) (string, error) {
	appPath, err := a.GetAppDataPath()
	if err != nil {
		return "", err
	}

	userPath := filepath.Join(appPath, "users", userId)

	if err := os.MkdirAll(userPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create user directory: %w", err)
	}

	return filepath.Join(userPath, "commands.json"), nil
}

// GetGuestConnectionsPath returns the path to the guest connections file
// Path: %APPDATA%\host-vault\guest\connections.json
func (a *App) GetGuestConnectionsPath() (string, error) {
	appPath, err := a.GetAppDataPath()
	if err != nil {
		return "", err
	}

	guestPath := filepath.Join(appPath, "guest")

	if err := os.MkdirAll(guestPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create guest directory: %w", err)
	}

	return filepath.Join(guestPath, "connections.json"), nil
}

// GetUserConnectionsPath returns the path to a user's connections file
// Path: %APPDATA%\host-vault\users\{userId}\connections.json
func (a *App) GetUserConnectionsPath(userId string) (string, error) {
	appPath, err := a.GetAppDataPath()
	if err != nil {
		return "", err
	}

	userPath := filepath.Join(appPath, "users", userId)

	if err := os.MkdirAll(userPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create user directory: %w", err)
	}

	return filepath.Join(userPath, "connections.json"), nil
}

// ShowMessageDialog shows a native Windows message dialog
// This is a placeholder - actual implementation will use Windows API
func (a *App) ShowMessageDialog(title string, message string, dialogType string) (string, error) {
	// TODO: Implement Windows native dialog using Windows API
	// For now, return an error indicating it's not implemented
	// dialogType can be: "info", "warning", "error", "question"
	return "", errors.New("Native message dialog not yet implemented")
}

// ShowOpenFileDialog shows a native Windows file open dialog
func (a *App) ShowOpenFileDialog(title string, fileType string) (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: title,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
}

// ShowSaveFileDialog shows a native Windows file save dialog
func (a *App) ShowSaveFileDialog(title string, defaultFilename string, fileType string) (string, error) {
	return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})
}

// FileExists checks if a file exists
func (a *App) FileExists(filePath string) bool {
	_, err := os.Stat(filePath)
	return !os.IsNotExist(err)
}

// ReadFile reads the contents of a file
func (a *App) ReadFile(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}
	return string(data), nil
}

// WriteFile writes data to a file
func (a *App) WriteFile(filePath string, data string) error {
	// Create directory if it doesn't exist
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(filePath, []byte(data), 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// DeleteFile deletes a file
func (a *App) DeleteFile(filePath string) error {
	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

// ListFiles lists files in a directory
func (a *App) ListFiles(dirPath string) ([]string, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() {
			files = append(files, entry.Name())
		}
	}

	return files, nil
}

// WindowMinimize minimizes the window
func (a *App) WindowMinimize() {
	runtime.WindowMinimise(a.ctx)
}

// WindowMaximize maximizes or restores the window
func (a *App) WindowMaximize() {
	if runtime.WindowIsMaximised(a.ctx) {
		runtime.WindowUnmaximise(a.ctx)
	} else {
		runtime.WindowMaximise(a.ctx)
	}
}

// WindowClose closes the window
func (a *App) WindowClose() {
	if a.terminalManager != nil {
		a.terminalManager.CloseAll()
	}
	runtime.Quit(a.ctx)
}

// WindowIsMaximised checks if window is maximized
func (a *App) WindowIsMaximised() bool {
	return runtime.WindowIsMaximised(a.ctx)
}

// CreateLocalTerminal creates a new local terminal session
func (a *App) CreateLocalTerminal(shell, cwd string, env map[string]string) (string, error) {
	if a.terminalManager == nil {
		return "", errors.New("terminal manager not initialized")
	}
	return a.terminalManager.CreateLocalSession(shell, cwd, env)
}

// CreateSSHTerminal creates a new SSH terminal session
func (a *App) CreateSSHTerminal(host string, port int, username, password, privateKey string) (string, error) {
	if a.terminalManager == nil {
		return "", errors.New("terminal manager not initialized")
	}

	fmt.Println("Creating SSH terminal for host:", host, "port:", port, "username:", username, "password:", password, "privateKey:", privateKey)
	config := terminal.ConnectionConfig{
		Host:       host,
		Port:       port,
		Username:   username,
		Password:   password,
	}
	fmt.Println("Config:", config)

	return a.terminalManager.CreateSSHSession("", config)
}

// DuplicateTerminal duplicates an existing terminal session
func (a *App) DuplicateTerminal(sessionID string) (string, error) {
	if a.terminalManager == nil {
		return "", errors.New("terminal manager not initialized")
	}
	return a.terminalManager.DuplicateSession(sessionID)
}

// WriteToTerminal writes user input to terminal
func (a *App) WriteToTerminal(sessionID string, data string) error {
	if a.terminalManager == nil {
		return errors.New("terminal manager not initialized")
	}
	return a.terminalManager.WriteToSession(sessionID, []byte(data))
}

// ResizeTerminal resizes terminal dimensions
func (a *App) ResizeTerminal(sessionID string, cols, rows int) error {
	if a.terminalManager == nil {
		return errors.New("terminal manager not initialized")
	}
	return a.terminalManager.ResizeSession(sessionID, cols, rows)
}

// CloseTerminal closes a terminal session
func (a *App) CloseTerminal(sessionID string) error {
	if a.terminalManager == nil {
		return errors.New("terminal manager not initialized")
	}
	return a.terminalManager.CloseSession(sessionID)
}

// ReconnectTerminal attempts to reconnect a disconnected SSH terminal session
func (a *App) ReconnectTerminal(sessionID, host string, port int, username, password, privateKey string) error {
	if a.terminalManager == nil {
		return errors.New("terminal manager not initialized")
	}

	config := terminal.ConnectionConfig{
		Host:       host,
		Port:       port,
		Username:   username,
		Password:   password,
		PrivateKey: privateKey,
	}

	return a.terminalManager.ReconnectSession(sessionID, config)
}

// GetTerminalMetadata returns session metadata
func (a *App) GetTerminalMetadata(sessionID string) (terminal.SessionMetadata, error) {
	if a.terminalManager == nil {
		return terminal.SessionMetadata{}, errors.New("terminal manager not initialized")
	}
	return a.terminalManager.GetSessionMetadata(sessionID)
}

// GetGuestEncryptionKeyphrase returns the encryption keyphrase for guest mode from environment/config
func (a *App) GetGuestEncryptionKeyphrase() string {
	// Try to get from environment variable first
	keyphrase := os.Getenv("HOST_VAULT_GUEST_KEYPHRASE")
	fmt.Println("Getting guest encryption keyphrase from environment variable", keyphrase)
	if keyphrase != "" {
		return keyphrase
	}
	
	// Default keyphrase (should be changed in production via .env)
	// In production, this should be set via environment variable
	return "host-vault-guest-default-keyphrase-change-in-production"
}

// GetSSHHostKeyInfo gets the host key fingerprint for an SSH host
func (a *App) GetSSHHostKeyInfo(host string, port int) (map[string]interface{}, error) {
	if a.terminalManager == nil {
		return nil, errors.New("terminal manager not initialized")
	}
	
	info, err := a.terminalManager.GetHostKeyInfo(host, port)
	if err != nil {
		return nil, fmt.Errorf("failed to get host key info: %w", err)
	}
	
	return map[string]interface{}{
		"fingerprintSHA256":   info.FingerprintSHA256,
		"fingerprintMD5":      info.FingerprintMD5,
		"keyType":             info.KeyType,
		"keyBase64":           info.KeyBase64,
		"isKnown":             info.IsKnown,
		"isMismatch":          info.IsMismatch,
		"expectedFingerprint": info.ExpectedFingerprint,
	}, nil
}

// AcceptSSHHostKey accepts and stores an SSH host key
// If isGuest is true, the key is only stored in memory and not persisted to disk (for privacy)
func (a *App) AcceptSSHHostKey(host string, port int, keyBase64 string, isGuest bool) error {
	if a.terminalManager == nil {
		return errors.New("terminal manager not initialized")
	}
	
	return a.terminalManager.AcceptHostKey(host, port, keyBase64, isGuest)
}
