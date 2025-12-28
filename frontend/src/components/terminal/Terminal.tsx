import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
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

export interface TerminalHandle {
  search: (query: string) => boolean;
  searchNext: (query: string) => boolean;
  searchPrevious: (query: string) => boolean;
  clearSearch: () => void;
  writeCommand: (command: string) => void;
}

// Font size constraints
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const DEFAULT_FONT_SIZE = 14;

/**
 * Terminal component that wraps xterm.js and integrates with the Wails backend.
 */
const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ sessionId, onClose }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const { config } = useUserConfigStore();

  // Expose search methods to parent
  useImperativeHandle(ref, () => ({
    search: (query: string) => {
      if (searchAddonRef.current && query) {
        return searchAddonRef.current.findNext(query, {
          caseSensitive: false,
          regex: false,
          decorations: {
            matchBackground: '#FFFF0050',
            matchBorder: '#FFFF00',
            matchOverviewRuler: '#FFFF00',
            activeMatchBackground: '#FF880080',
            activeMatchBorder: '#FF8800',
            activeMatchColorOverviewRuler: '#FF8800',
          },
        });
      }
      return false;
    },
    searchNext: (query: string) => {
      if (searchAddonRef.current && query) {
        return searchAddonRef.current.findNext(query, {
          caseSensitive: false,
          regex: false,
          decorations: {
            matchBackground: '#FFFF0050',
            matchBorder: '#FFFF00',
            matchOverviewRuler: '#FFFF00',
            activeMatchBackground: '#FF880080',
            activeMatchBorder: '#FF8800',
            activeMatchColorOverviewRuler: '#FF8800',
          },
        });
      }
      return false;
    },
    searchPrevious: (query: string) => {
      if (searchAddonRef.current && query) {
        return searchAddonRef.current.findPrevious(query, {
          caseSensitive: false,
          regex: false,
          decorations: {
            matchBackground: '#FFFF0050',
            matchBorder: '#FFFF00',
            matchOverviewRuler: '#FFFF00',
            activeMatchBackground: '#FF880080',
            activeMatchBorder: '#FF8800',
            activeMatchColorOverviewRuler: '#FF8800',
          },
        });
      }
      return false;
    },
    clearSearch: () => {
      searchAddonRef.current?.clearDecorations();
    },
    writeCommand: (command: string) => {
      if (sessionId) {
        WriteToTerminal(sessionId, command).catch(console.error);
      }
    },
  }));

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (xtermRef.current) {
      setTimeout(() => {
        const newTheme = getTerminalThemeFromCSS();
        xtermRef.current!.options.theme = newTheme;
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

      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setFontSize((prev) => Math.min(MAX_FONT_SIZE, prev + 1));
        return;
      }

      if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        setFontSize((prev) => Math.max(MIN_FONT_SIZE, prev - 1));
        return;
      }

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
          ResizeTerminal(sessionId, cols, rows).catch(console.error);
        }
      }, 0);
    }
  }, [fontSize, sessionId]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const theme = getTerminalThemeFromCSS();

    const term = new XTerm({
      cursorBlink: true,
      fontSize,
      fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
      theme,
      allowTransparency: false,
      scrollback: 10000,
      lineHeight: 1.2,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    const cols = term.cols;
    const rows = term.rows;
    ResizeTerminal(sessionId, cols, rows).catch(console.error);

    const inputDisposable = term.onData((data) => {
      WriteToTerminal(sessionId, data).catch(console.error);
    });

    EventsOn('terminal:output', (event: TerminalOutputEvent) => {
      if (event.SessionID === sessionId && xtermRef.current) {
        xtermRef.current.write(event.Data);
      }
    });

    EventsOn('terminal:closed', (event: TerminalClosedEvent) => {
      if (event.SessionID === sessionId) {
        onClose?.();
      }
    });

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
            ResizeTerminal(sessionId, cols, rows).catch(console.error);
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

    return () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
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
      searchAddonRef.current = null;
    };
  }, [sessionId, onClose]);

  return (
    <div
      ref={terminalRef}
      className="w-full h-full overflow-hidden bg-background p-2"
      tabIndex={0}
    />
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
