# Host Vault

A secure, modern SSH connection manager desktop application built with Wails (Go + React + TypeScript). Host Vault provides a beautiful, intuitive interface for managing SSH connections, commands, and credentials with enterprise-grade security features.

## 🎯 Features

### ✅ Implemented Features

#### **Core Functionality**
- **Frameless Window Design**: Modern, custom window controls (minimize, maximize/restore, close)
- **Guest Mode**: Use the application without authentication (sync features disabled)
- **User Authentication**: Support for Google OAuth and local authentication
- **Master Password Protection**: AES-256-GCM encryption with PBKDF2 key derivation
- **Recovery Codes**: Secure account recovery system

#### **SSH Connection Management**
- **Create/Edit/Delete Connections**: Full CRUD operations for SSH connections
- **Connection Details**: Name, host, port, username, private key, password
- **Quick Connect**: Fast connection dialog for one-time SSH sessions
- **SSH Key Management**: Import SSH keys from file (OpenSSH format)
- **Port Forwarding Configuration**: Local, remote, and dynamic port forwarding
- **Connection Groups/Tags**: Organize connections with custom tags
- **Favorites**: Mark connections as favorites for quick access
- **Search & Filtering**: Search by name, host, username, or tags
- **Host Key Verification**: SHA256/MD5 fingerprint display and verification
- **Password Prompt**: Secure password entry modal
- **Import from OpenSSH**: Parse OpenSSH config files
- **Connection Cards**: Visual card-based connection display

#### **Command/Snippet Management**
- **Create/Edit/Delete Snippets**: Reusable command snippets
- **Snippet Variables**: Define variables with default values
- **Import/Export**: JSON import and export functionality
- **Drag & Drop Reordering**: Organize snippets with drag and drop
- **File-based Storage**: Stored in `%APPDATA%\host-vault\guest\commands.json` or user-specific path

#### **Terminal Integration**
- **SSH Terminal Sessions**: Full terminal emulation via Go backend
- **Local Terminal Sessions**: Local shell sessions with custom shell selection
- **Multiple Tabs**: Tab-based terminal interface
- **Split Pane**: Split terminals horizontally or vertically
- **Workspace Management**: Save and restore terminal layouts
- **Terminal Themes**: Multiple terminal color schemes
- **Clipboard History**: Track copied text in terminal sessions
- **Drag & Drop Tabs**: Reorganize terminal tabs
- **Reconnection Support**: Reconnect disconnected SSH sessions
- **Host Key Management**: Store and verify known hosts

#### **User Interface**
- **15 Beautiful Themes**: 
  - Dark, Minimal, Cyberpunk, Rouge, Ocean, Forest, Sunset, Monochrome
  - Midnight, Aurora, Emerald, Amber, Slate, Lavender, Crimson
- **Real-time Theme Switching**: Instant theme application with smooth transitions
- **Responsive Design**: Adaptive layout for different window sizes
- **Auto-collapsing Sidebar**: Automatically hides labels on small windows
- **User Avatar Menu**: Clickable avatar with dropdown menu for account actions

#### **Settings & Configuration**
- **Organized Settings Page**: 
  - Appearance (Theme selection)
  - General, Security, Notifications, Data, Account
- **File-based Configuration**: User preferences stored in app data directory
  - Guest: `%APPDATA%\host-vault\guest\config.json`
  - Users: `%APPDATA%\host-vault\users\{userId}\config.json`
- **Persistent State**: Zustand stores with persistence middleware

#### **Window Management**
- **Draggable Header**: Click and drag window from header area
- **Double-click Maximize**: Double-click header to maximize/restore
- **Custom Window Controls**: Native-feeling minimize, maximize, close buttons
- **Responsive Layout**: Sidebar adapts to window size

#### **Frontend Architecture**
- **React Router**: Client-side routing with protected routes
- **State Management**: Zustand stores for auth, connections, app state, user config, snippets, terminal
- **API Client**: Axios-based HTTP client with interceptors
- **Type Safety**: Full TypeScript implementation
- **Component Library**: Reusable UI components (Button, Card, Input, Modal, Toast, ThemePicker, etc.)

#### **Backend (Go)**
- **File System Operations**: Read/Write/Exists/Delete methods for config files
- **Path Management**: App data directory, database, backup, and config paths
- **Window Controls**: Minimize, maximize, close, and state checking
- **Native Dialogs**: File open and save dialogs with custom filters
- **Terminal Manager**: Full SSH and local terminal session management
- **Host Key Operations**: Get/accept/verify SSH host keys

### 🚧 Remaining Features / TODO

#### **High Priority**
- [ ] **SQLite Database Integration**
  - [ ] Full database schema implementation in Go backend
  - [ ] CRUD operations for connections and commands via Wails bindings
  - [ ] Version history tracking
  - [ ] Soft delete and recovery

- [ ] **Windows Credential Manager Integration**
  - [ ] Save credentials to Windows Credential Manager
  - [ ] Retrieve credentials securely
  - [ ] Delete credentials

- [ ] **Cloud Sync**
  - [ ] Push/pull synchronization
  - [ ] Conflict resolution
  - [ ] Sync status indicators
  - [ ] Offline mode support

#### **Medium Priority**
- [ ] **Security Features**
  - [ ] Two-factor authentication (2FA)
  - [ ] Session management
  - [ ] Password strength meter
  - [ ] Security audit log

- [ ] **Backup & Recovery**
  - [ ] Automatic backups
  - [ ] Manual backup/restore
  - [ ] Export/import functionality
  - [ ] Backup encryption

- [ ] **Settings Sections**
  - [ ] General settings (language, startup behavior)
  - [ ] Security settings (master password change, 2FA)
  - [ ] Notification preferences
  - [ ] Data management (backup, export, import)
  - [ ] Account management (profile, preferences)

#### **Low Priority**
- [ ] **Advanced Features**
  - [ ] Connection templates
  - [ ] Bulk operations
  - [ ] Search and filtering enhancements
  - [ ] Keyboard shortcuts
  - [ ] Command palette
  - [ ] Plugin system

- [ ] **UI/UX Enhancements**
  - [ ] File transfer (SFTP)
  - [ ] Connection statistics
  - [ ] Usage analytics

## 🛠️ Technology Stack

### Frontend
- **React 18.2** - UI framework
- **TypeScript 4.6** - Type safety
- **React Router DOM 6.20** - Client-side routing
- **Zustand 4.4** - State management
- **Tailwind CSS 3.3** - Utility-first CSS
- **Headless UI 1.7** - Accessible UI components
- **Lucide React** - Icon library
- **Axios 1.6** - HTTP client
- **Crypto-JS 4.2** - Encryption utilities
- **Vite 3.0** - Build tool and dev server

### Backend
- **Go 1.23** - Backend language
- **Wails v2.11** - Desktop app framework
- **Windows API** - Native Windows integration (planned)

## 📦 Installation

### Prerequisites

1. **Go** (1.23 or later)
   ```bash
   # Download from https://go.dev/dl/
   # Verify installation
   go version
   ```

2. **Node.js** (16.x or later) and npm
   ```bash
   # Download from https://nodejs.org/
   # Verify installation
   node --version
   npm --version
   ```

3. **Wails CLI**
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   # Verify installation
   wails version
   ```

4. **Windows Build Tools** (for Windows development)
   - Visual Studio Build Tools or Visual Studio Community
   - C/C++ compiler (MSVC)

### Clone Repository

```bash
git clone <repository-url>
cd host-vault
```

### Install Dependencies

```bash
# Install Go dependencies
go mod download

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## 🚀 Development

### Run Development Server

```bash
# Start Wails dev server (includes hot reload)
wails dev

# Frontend dev server runs on http://localhost:5188
# Wails dev server runs on http://localhost:34115
```

### Frontend Development (Browser Mode)

```bash
cd frontend
npm run dev
# Runs on http://localhost:5188
```

### Build for Production

```bash
# Build executable
wails build

# Output: build/bin/host-vault.exe
```

### Frontend Build Only

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

## 📁 Project Structure

```
host-vault/
├── app.go                 # Go backend application logic
├── main.go               # Wails application entry point
├── go.mod                # Go module dependencies
├── go.sum                # Go module checksums
├── wails.json            # Wails configuration
├── build/                # Build output directory
│   └── bin/
│       └── host-vault.exe
│
└── frontend/
    ├── package.json      # Frontend dependencies
    ├── vite.config.ts    # Vite configuration
    ├── tailwind.config.js # Tailwind CSS configuration
    ├── tsconfig.json     # TypeScript configuration
    │
    └── src/
        ├── main.tsx      # React entry point
        ├── App.tsx       # Main app component with routing
        ├── style.css     # Global styles
        │
        ├── components/   # React components
        │   ├── auth/     # Authentication components
        │   ├── layout/   # Layout components (Header, Sidebar, etc.)
        │   └── ui/       # Reusable UI components
        │
        ├── pages/        # Page components
        │   ├── LoginPage.tsx
        │   ├── DashboardPage.tsx
        │   ├── ConnectionsPage.tsx
        │   ├── SettingsPage.tsx
        │   └── ...
        │
        ├── store/        # Zustand stores
        │   ├── authStore.ts
        │   ├── connectionStore.ts
        │   ├── appStore.ts
        │   └── userConfigStore.ts
        │
        ├── lib/          # Utility libraries
        │   ├── api/      # API client and endpoints
        │   ├── encryption/ # Encryption utilities
        │   ├── storage/  # Storage utilities
        │   ├── sync/     # Sync utilities
        │   ├── themes.ts # Theme definitions
        │   └── utils.ts  # General utilities
        │
        ├── types/        # TypeScript type definitions
        │   ├── index.ts
        │   └── config.ts
        │
        └── hooks/        # Custom React hooks
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

### Wails Configuration

Edit `wails.json` to customize:
- Application name
- Output filename
- Frontend build commands
- Author information

### Frontend Port

The frontend dev server runs on port **5188** (configured in `frontend/vite.config.ts`).

## 🔐 Security

- **Master Password**: AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations)
- **Local Storage**: Encrypted sensitive data
- **File-based Config**: User preferences stored securely in app data directory
- **Guest Mode**: Limited functionality without authentication
- **Recovery Codes**: Secure account recovery mechanism

## 📝 Development Notes

### State Management

- **Auth Store**: User authentication, guest mode, master password state
- **Connection Store**: SSH connections, filters, search
- **App Store**: Theme, sidebar state, modals, toasts
- **User Config Store**: User preferences, theme selection

### Theme System

Themes are defined in `frontend/src/lib/themes.ts` and applied via CSS variables. All themes ensure proper contrast for buttons and text visibility.

### File Storage

User configurations are stored in:
- **Guest**: `%APPDATA%\host-vault\guest\config.json`
- **Users**: `%APPDATA%\host-vault\users\{userId}\config.json`

### Window Controls

Custom window controls are implemented using Wails Go bindings:
- `WindowMinimize()` - Minimize window
- `WindowMaximize()` - Maximize/restore window
- `WindowClose()` - Close window
- `WindowIsMaximised()` - Check maximized state

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

[Add your license here]

## 👤 Author

**Wahaj**
- Email: wahajdorift@yahoo.com

## 🙏 Acknowledgments

- [Wails](https://wails.io/) - Desktop app framework
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Headless UI](https://headlessui.com/) - Accessible components

---

**Note**: This project is in active development. Some features are placeholders and will be implemented in future releases.
