import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { useUserConfigStore } from './store/userConfigStore'
import { useAuthStore } from './store/authStore'
import { applyTheme } from './lib/themes'

// Load initial config based on auth state
const { isGuestMode, user } = useAuthStore.getState();
const { config, loadUserConfig, loadGuestConfig } = useUserConfigStore.getState();

if (isGuestMode) {
  loadGuestConfig();
} else if (user?.id) {
  loadUserConfig(user.id);
} else {
  loadGuestConfig();
}

// Apply initial theme
const initialTheme = config.theme || 'dark';
applyTheme(initialTheme);

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <ThemeProvider>
            <App/>
        </ThemeProvider>
    </React.StrictMode>
)
