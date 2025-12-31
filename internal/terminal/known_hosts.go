package terminal

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/ssh"
)

// KnownHostsManager manages SSH known_hosts file
type KnownHostsManager struct {
	knownHostsPath string
	mu             sync.RWMutex
	knownHosts     map[string]*KnownHostEntry
}

// KnownHostEntry represents a known host entry
type KnownHostEntry struct {
	Host        string
	Port        int
	Fingerprint string
	KeyType     string
	PublicKey   ssh.PublicKey
}

// HostKeyInfo contains information about a host's SSH key
type HostKeyInfo struct {
	FingerprintSHA256   string
	FingerprintMD5      string
	KeyType             string
	KeyBase64           string // Base64 encoded public key for storage
	IsKnown             bool
	IsMismatch          bool
	ExpectedFingerprint string
}

// NewKnownHostsManager creates a new known hosts manager
func NewKnownHostsManager(appDataPath string) (*KnownHostsManager, error) {
	knownHostsPath := filepath.Join(appDataPath, "known_hosts")
	
	manager := &KnownHostsManager{
		knownHostsPath: knownHostsPath,
		knownHosts:     make(map[string]*KnownHostEntry),
	}

	// Load existing known hosts
	if err := manager.loadKnownHosts(); err != nil {
		// If file doesn't exist, that's okay - we'll create it when needed
		if !os.IsNotExist(err) {
			return nil, fmt.Errorf("failed to load known hosts: %w", err)
		}
	}

	return manager, nil
}

// GetHostKeyInfo retrieves the host key fingerprint without connecting
func (khm *KnownHostsManager) GetHostKeyInfo(host string, port int) (*HostKeyInfo, error) {
	addr := fmt.Sprintf("%s:%d", host, port)
	
	// Capture the host key during handshake
	var capturedKey ssh.PublicKey
	var keyType string
	
	config := &ssh.ClientConfig{
		// Use a dummy user - SSH requires a username even if auth fails
		User: "hostkey-check",
		// This callback triggers as soon as the server presents its key
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			capturedKey = key
			keyType = key.Type()
			return nil
		},
		Timeout: 5 * time.Second,
		// No auth methods - we only want the handshake, not full authentication
		Auth: []ssh.AuthMethod{},
	}

	// Dial the TCP connection manually
	netConn, err := net.DialTimeout("tcp", addr, config.Timeout)
	if err != nil {
		return nil, fmt.Errorf("network connection failed: %w", err)
	}
	defer netConn.Close()

	// Perform the SSH handshake
	// This will almost certainly return an error (no auth), but the callback 
	// above will have already captured the key during the handshake phase.
	sshConn, _, _, err := ssh.NewClientConn(netConn, addr, config)
	if sshConn != nil {
		defer sshConn.Close()
	}

	// Check if we captured the key (even if handshake/auth failed)
	if capturedKey == nil {
		if err != nil {
			return nil, fmt.Errorf("could not capture host key during handshake: %w", err)
		}
		return nil, fmt.Errorf("could not capture host key during handshake")
	}

	// Calculate fingerprints
	fingerprintSHA256 := sha256.Sum256(capturedKey.Marshal())
	fingerprintSHA256Str := base64.StdEncoding.EncodeToString(fingerprintSHA256[:])
	
	// MD5 fingerprint (legacy, but still useful)
	fingerprintMD5 := ssh.FingerprintLegacyMD5(capturedKey)
	
	// Encode the key for storage
	keyBase64 := base64.StdEncoding.EncodeToString(capturedKey.Marshal())

	// Check if this host is known
	khm.mu.RLock()
	knownEntry := khm.getHostKey(host, port)
	khm.mu.RUnlock()
	
	isKnown := knownEntry != nil
	isMismatch := false
	expectedFingerprint := ""
	
	if isKnown {
		expectedFingerprint = knownEntry.Fingerprint
		// Compare fingerprints
		if knownEntry.Fingerprint != fingerprintSHA256Str {
			isMismatch = true
		}
	}

	return &HostKeyInfo{
		FingerprintSHA256:   fingerprintSHA256Str,
		FingerprintMD5:      fingerprintMD5,
		KeyType:             keyType,
		KeyBase64:           keyBase64,
		IsKnown:             isKnown,
		IsMismatch:          isMismatch,
		ExpectedFingerprint: expectedFingerprint,
	}, nil
}

// VerifyHostKey verifies a host key against known hosts
func (khm *KnownHostsManager) VerifyHostKey(host string, port int, remoteAddr net.Addr, key ssh.PublicKey) error {
	khm.mu.RLock()
	defer khm.mu.RUnlock()

	hostKey := khm.getHostKey(host, port)
	if hostKey == nil {
		// Host not known - return error to trigger user prompt
		return fmt.Errorf("host key not known")
	}

	// Verify the fingerprint matches
	fingerprintSHA256 := sha256.Sum256(key.Marshal())
	fingerprintSHA256Str := base64.StdEncoding.EncodeToString(fingerprintSHA256[:])

	if hostKey.Fingerprint != fingerprintSHA256Str {
		return fmt.Errorf("host key mismatch - possible MITM attack")
	}

	return nil
}

// AddHostKey adds a host key to known hosts
// If isGuest is true, the key is only stored in memory for the current session
// and not persisted to the filesystem (for privacy in guest mode)
func (khm *KnownHostsManager) AddHostKey(host string, port int, key ssh.PublicKey, isGuest bool) error {
	khm.mu.Lock()
	defer khm.mu.Unlock()

	// Calculate fingerprint
	fingerprintSHA256 := sha256.Sum256(key.Marshal())
	fingerprintSHA256Str := base64.StdEncoding.EncodeToString(fingerprintSHA256[:])

	entry := &KnownHostEntry{
		Host:        host,
		Port:        port,
		Fingerprint: fingerprintSHA256Str,
		KeyType:     key.Type(),
		PublicKey:   key,
	}

	hostKey := fmt.Sprintf("%s:%d", host, port)
	khm.knownHosts[hostKey] = entry

	// Only save to file if not in guest mode (for privacy)
	if isGuest {
		return nil
	}

	// Save to file for persistent storage
	return khm.saveKnownHosts()
}

// RemoveHostKey removes a host key from known hosts
func (khm *KnownHostsManager) RemoveHostKey(host string, port int) error {
	khm.mu.Lock()
	defer khm.mu.Unlock()

	hostKey := fmt.Sprintf("%s:%d", host, port)
	delete(khm.knownHosts, hostKey)

	return khm.saveKnownHosts()
}

// getHostKey gets a known host entry (must be called with lock held)
func (khm *KnownHostsManager) getHostKey(host string, port int) *KnownHostEntry {
	hostKey := fmt.Sprintf("%s:%d", host, port)
	return khm.knownHosts[hostKey]
}

// loadKnownHosts loads known hosts from file
func (khm *KnownHostsManager) loadKnownHosts() error {
	data, err := os.ReadFile(khm.knownHostsPath)
	if err != nil {
		return err
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Parse known_hosts format: host port key-type base64-key [comment]
		parts := strings.Fields(line)
		if len(parts) < 3 {
			continue
		}

		hostPort := parts[0]
		keyType := parts[1]
		base64Key := parts[2]

		// Parse host:port
		var host string
		var port int
		if strings.Contains(hostPort, ":") {
			parts2 := strings.Split(hostPort, ":")
			host = parts2[0]
			fmt.Sscanf(parts2[1], "%d", &port)
		} else {
			host = hostPort
			port = 22
		}

		// Decode public key
		keyBytes, err := base64.StdEncoding.DecodeString(base64Key)
		if err != nil {
			continue
		}

		pubKey, err := ssh.ParsePublicKey(keyBytes)
		if err != nil {
			continue
		}

		// Calculate fingerprint
		fingerprintSHA256 := sha256.Sum256(pubKey.Marshal())
		fingerprintSHA256Str := base64.StdEncoding.EncodeToString(fingerprintSHA256[:])

		entry := &KnownHostEntry{
			Host:        host,
			Port:        port,
			Fingerprint: fingerprintSHA256Str,
			KeyType:     keyType,
			PublicKey:   pubKey,
		}

		hostKey := fmt.Sprintf("%s:%d", host, port)
		khm.knownHosts[hostKey] = entry
	}

	return nil
}

// saveKnownHosts saves known hosts to file
func (khm *KnownHostsManager) saveKnownHosts() error {
	// Create directory if it doesn't exist
	dir := filepath.Dir(khm.knownHostsPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	var lines []string
	for _, entry := range khm.knownHosts {
		// Format: host port key-type base64-key
		base64Key := base64.StdEncoding.EncodeToString(entry.PublicKey.Marshal())
		line := fmt.Sprintf("%s:%d %s %s", entry.Host, entry.Port, entry.KeyType, base64Key)
		lines = append(lines, line)
	}

	data := strings.Join(lines, "\n")
	return os.WriteFile(khm.knownHostsPath, []byte(data), 0600)
}

