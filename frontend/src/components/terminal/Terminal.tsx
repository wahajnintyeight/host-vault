import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { TerminalOutputEvent, TerminalClosedEvent } from '../../types/terminal';
import { WriteToTerminal, ResizeTerminal } from '../../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime';
import { getTerminalThemeFromCSS } from '../../lib/terminalTheme';
import { useUserConfigStore } from '../../store/userConfigStore';

interface TerminalProps {
  sessionId: string;
  onClose?: () => void;
}

// Font size constraints
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const DEFAULT_FONT_SIZE = 14;

/**
 * Terminal component that wraps xterm.js and integrates with the Wails backend.
 * 
 * Features:
 * - Theme-aware styling that matches the app theme (updates on theme change)
 * - Zoom in/out with Ctrl++ / Ctrl+- / Ctrl+0
 * - Auto-fit on resize with debouncing
 * - Web links support
 * - Bidirectional communication with backend
 */
const Terminal: React.FC<TerminalProps> = ({ sessionId, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  
  // Get current theme from store to react to changes
  const { config } = useUserConfigStore();

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (xtermRef.current) {
      // Small delay to ensure CSS variables are updated
      setTimeout(() => {
        const newTheme = getTerminalThemeFromCSS();
        xtermRef.current!.options.theme = newTheme;
        // Force a refresh by writing an empty string
        xtermRef.current!.refresh(0, xtermRef.current!.rows - 1);
      }, 100);
    }
  }, [config.theme]);

  // Handle zoom keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!terminalRef.current?.contains(document.activeElement) &&
          document.activeElement !== terminalRef.current) {
        return;
      }

      // Ctrl++ or Ctrl+= (zoom in)
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setFontSize((prev) => Math.min(MAX_FONT_SIZE, prev + 1));
        return;
      }

      // Ctrl+- (zoom out)
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        setFontSize((prev) => Math.max(MIN_FONT_SIZE, prev - 1));
        return;
      }

      // Ctrl+0 (reset zoom)
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setFontSize(DEFAULT_FONT_SIZE);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update terminal font size when it changes
  useEffect(() => {
    if (xtermRef.current && fitAddonRef.current) {
      xtermRef.current.options.fontSize = fontSize;

      setTimeout(() => {
        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit();
          const cols = xtermRef.current.cols;
          const rows = xtermRef.current.rows;
          ResizeTerminal(sessionId, cols, rows).catch((error) => {
            console.error('Failed to resize terminal after zoom:', error);
          });
        }
      }, 0);
    }
  }, [fontSize, sessionId]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Get theme from CSS variables
    const theme = getTerminalThemeFromCSS();

    // Initialize xterm.js terminal
    const term = new XTerm({
      cursorBlink: true,
      fontSize,
      fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
      theme,
      allowTransparency: false,
      scrollback: 10000,
      lineHeight: 1.2,
    });

    // Initialize addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal in container
    term.open(terminalRef.current);

    // Initial fit
    fitAddon.fit();

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send initial resize to backend after fit
    const cols = term.cols;
    const rows = term.rows;
    ResizeTerminal(sessionId, cols, rows).catch((error) => {
      console.error('Failed to send initial resize:', error);
    });

    // Handle user input - send to backend
    const inputDisposable = term.onData((data) => {
      WriteToTerminal(sessionId, data).catch((error) => {
        console.error('Failed to write to terminal:', error);
      });
    });

    // Listen for terminal output from backend
    EventsOn('terminal:output', (event: TerminalOutputEvent) => {
      if (event.SessionID === sessionId && xtermRef.current) {
        xtermRef.current.write(event.Data);
      }
    });

    // Listen for terminal closed events
    EventsOn('terminal:closed', (event: TerminalClosedEvent) => {
      if (event.SessionID === sessionId) {
        onClose?.();
      }
    });

    // Setup resize observer with debouncing
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        if (fitAddonRef.current && xtermRef.current) {
          try {
            fitAddonRef.current.fit();
            const cols = xtermRef.current.cols;
            const rows = xtermRef.current.rows;
            ResizeTerminal(sessionId, cols, rows).catch((error) => {
              console.error('Failed to resize terminal:', error);
            });
          } catch (error) {
            console.error('Failed to fit terminal:', error);
          }
        }
      }, 100);
    };

    if (terminalRef.current) {
      resizeObserverRef.current = new ResizeObserver(handleResize);
      resizeObserverRef.current.observe(terminalRef.current);
    }

    // Cleanup function
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      inputDisposable.dispose();
      EventsOff('terminal:output');
      EventsOff('terminal:closed');

      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }

      fitAddonRef.current = null;
    };
  }, [sessionId, onClose]);

  return (
    <div
      ref={terminalRef}
      className="w-full h-full overflow-hidden bg-background p-2"
      tabIndex={0}
    />
  );
};

export default Terminal;
