import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import {
  TerminalOutputEvent,
  TerminalClosedEvent,
  TerminalDisconnectedEvent,
  TerminalReconnectNeededEvent,
} from '../../types/terminal';
import { WriteToTerminal, ResizeTerminal } from '../../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime';
import { getTerminalThemeFromCSS } from '../../lib/terminalTheme';
import { useUserConfigStore } from '../../store/userConfigStore';

const isWailsAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.go?.main?.App;
};

// Global terminal instance cache
interface TerminalInstance {
  term: XTerm;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  container: HTMLDivElement;
  outputBuffer: string[];
  isConsuming: boolean;
  inputDisposable: { dispose: () => void } | null;
  resizeObserver: ResizeObserver | null;
  resizeTimeout: NodeJS.Timeout | null;
  onClose: (() => void) | null;
}

const terminalInstances = new Map<string, TerminalInstance>();

// Global event handlers - registered once, dispatch to correct instance
let globalEventsRegistered = false;

function registerGlobalEvents() {
  if (globalEventsRegistered) return;
  globalEventsRegistered = true;

  EventsOn('terminal:output', (event: TerminalOutputEvent) => {
    const inst = terminalInstances.get(event.SessionID);
    if (inst) {
      if (inst.isConsuming) {
        inst.term.write(event.Data);
      } else {
        inst.outputBuffer.push(event.Data);
        if (inst.outputBuffer.length > 10000) {
          inst.outputBuffer = inst.outputBuffer.slice(-5000);
        }
      }
    }
  });

  EventsOn('terminal:closed', (event: TerminalClosedEvent) => {
    const inst = terminalInstances.get(event.SessionID);
    if (inst?.onClose) {
      inst.onClose();
    }
  });

  EventsOn('terminal:disconnected', (event: TerminalDisconnectedEvent) => {
    const inst = terminalInstances.get(event.SessionID);
    if (inst) {
      const msg = '\r\n\x1b[31m[DISCONNECTED] Connection lost.\x1b[0m\r\n';
      if (inst.isConsuming) inst.term.write(msg);
      else inst.outputBuffer.push(msg);
    }
  });

  EventsOn('terminal:reconnect-needed', (event: TerminalReconnectNeededEvent) => {
    const inst = terminalInstances.get(event.SessionID);
    if (inst) {
      const msg = '\r\n\x1b[33m[RECONNECT] Use reconnect button.\x1b[0m\r\n';
      if (inst.isConsuming) inst.term.write(msg);
      else inst.outputBuffer.push(msg);
    }
  });

  EventsOn('terminal:reconnected', (event: TerminalClosedEvent) => {
    const inst = terminalInstances.get(event.SessionID);
    if (inst) {
      const msg = '\r\n\x1b[32m[RECONNECTED] Connection restored.\x1b[0m\r\n';
      if (inst.isConsuming) inst.term.write(msg);
      else inst.outputBuffer.push(msg);
    }
  });
}

interface TerminalProps {
  sessionId: string;
  isVisible?: boolean;
  onClose?: () => void;
}

export interface TerminalHandle {
  search: (query: string) => boolean;
  searchNext: (query: string) => boolean;
  searchPrevious: (query: string) => boolean;
  clearSearch: () => void;
  writeCommand: (command: string) => void;
}

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const DEFAULT_FONT_SIZE = 14;

const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ sessionId, isVisible = true, onClose }, ref) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);

  const { config } = useUserConfigStore();

  // Update onClose callback in instance when it changes
  useEffect(() => {
    const instance = terminalInstances.get(sessionId);
    if (instance) {
      instance.onClose = onClose || null;
    }
  }, [sessionId, onClose]);

  const getInstance = (): TerminalInstance | null => {
    return terminalInstances.get(sessionId) || null;
  };

  useImperativeHandle(ref, () => ({
    search: (query: string) => {
      const instance = getInstance();
      if (instance?.searchAddon && query) {
        return instance.searchAddon.findNext(query, {
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
      const instance = getInstance();
      if (instance?.searchAddon && query) {
        return instance.searchAddon.findNext(query, {
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
      const instance = getInstance();
      if (instance?.searchAddon && query) {
        return instance.searchAddon.findPrevious(query, {
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
      getInstance()?.searchAddon?.clearDecorations();
    },
    writeCommand: (command: string) => {
      if (sessionId && isWailsAvailable()) {
        WriteToTerminal(sessionId, command).catch(console.error);
      }
    },
  }));

  // Update terminal theme
  useEffect(() => {
    const instance = getInstance();
    if (instance?.term) {
      setTimeout(() => {
        const newTheme = getTerminalThemeFromCSS();
        instance.term.options.theme = newTheme;
        instance.term.refresh(0, instance.term.rows - 1);
      }, 100);
    }
  }, [config.theme, sessionId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const instance = getInstance();
      if (!instance?.container.contains(document.activeElement)) return;
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setFontSize((prev) => Math.min(MAX_FONT_SIZE, prev + 1));
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        setFontSize((prev) => Math.max(MIN_FONT_SIZE, prev - 1));
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setFontSize(DEFAULT_FONT_SIZE);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionId]);

  // Font size changes
  useEffect(() => {
    const instance = getInstance();
    if (instance?.term && instance?.fitAddon) {
      instance.term.options.fontSize = fontSize;
      setTimeout(() => {
        instance.fitAddon.fit();
        const cols = instance.term.cols;
        const rows = instance.term.rows;
        if (cols > 2 && rows > 2 && isWailsAvailable()) {
          ResizeTerminal(sessionId, cols, rows).catch(console.error);
        }
      }, 0);
    }
  }, [fontSize, sessionId]);

  // Visibility changes
  useEffect(() => {
    const instance = getInstance();
    if (!instance) return;

    instance.isConsuming = isVisible;

    if (isVisible) {
      if (instance.outputBuffer.length > 0) {
        for (const data of instance.outputBuffer) {
          instance.term.write(data);
        }
        instance.outputBuffer = [];
      }
      requestAnimationFrame(() => {
        if (instance.term.element) {
          instance.fitAddon.fit();
          instance.term.focus();
          instance.term.refresh(0, instance.term.rows - 1);
        }
      });
    }
  }, [sessionId, isVisible]);

  // Main effect: create or attach terminal
  useEffect(() => {
    if (!wrapperRef.current) return;

    // Register global events once
    registerGlobalEvents();

    let instance = terminalInstances.get(sessionId);

    if (instance) {
      // Reuse existing instance
      wrapperRef.current.appendChild(instance.container);
      instance.isConsuming = isVisible;
      instance.onClose = onClose || null;

      setTimeout(() => {
        if (instance?.fitAddon) instance.fitAddon.fit();
      }, 50);

      return () => {
        if (instance?.container.parentNode) {
          instance.container.parentNode.removeChild(instance.container);
        }
      };
    }

    // Create new terminal
    const container = document.createElement('div');
    container.className = 'w-full h-full';
    container.style.cssText = 'width: 100%; height: 100%;';
    wrapperRef.current.appendChild(container);

    const theme = getTerminalThemeFromCSS();
    const term = new XTerm({
      cursorBlink: true,
      fontSize,
      fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
      theme,
      allowTransparency: false,
      scrollback: 10000,
      lineHeight: 1.2,
      wordSeparator: ' ',
      scrollOnUserInput: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    term.open(container);

    requestAnimationFrame(() => {
      fitAddon.fit();
      const cols = term.cols;
      const rows = term.rows;
      if (cols > 2 && rows > 2 && isWailsAvailable()) {
        ResizeTerminal(sessionId, cols, rows).catch(console.error);
      }
    });

    const newInstance: TerminalInstance = {
      term,
      fitAddon,
      searchAddon,
      container,
      outputBuffer: [],
      isConsuming: isVisible,
      inputDisposable: null,
      resizeObserver: null,
      resizeTimeout: null,
      onClose: onClose || null,
    };

    newInstance.inputDisposable = term.onData((data) => {
      if (isWailsAvailable()) {
        WriteToTerminal(sessionId, data).catch(console.error);
      }
    });

    const handleResize = () => {
      const inst = terminalInstances.get(sessionId);
      if (!inst) return;
      if (inst.resizeTimeout) clearTimeout(inst.resizeTimeout);
      inst.resizeTimeout = setTimeout(() => {
        if (!inst.container.parentElement) return;
        const parent = inst.container.parentElement;
        if (parent.clientWidth === 0 || parent.clientHeight === 0) return;
        try {
          inst.fitAddon.fit();
          const cols = inst.term.cols;
          const rows = inst.term.rows;
          if (cols > 2 && rows > 2 && isWailsAvailable()) {
            ResizeTerminal(sessionId, cols, rows).catch(console.error);
          }
        } catch (e) {
          console.error('Resize error:', e);
        }
      }, 100);
    };

    newInstance.resizeObserver = new ResizeObserver(handleResize);
    newInstance.resizeObserver.observe(container);
    terminalInstances.set(sessionId, newInstance);

    return () => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, [sessionId]);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full overflow-hidden bg-background p-2"
      tabIndex={0}
      onClick={() => getInstance()?.term.focus()}
    />
  );
});

Terminal.displayName = 'Terminal';

// Destroy terminal instance (call when tab is closed)
export const destroyTerminalInstance = (sessionId: string) => {
  const instance = terminalInstances.get(sessionId);
  if (instance) {
    if (instance.resizeTimeout) clearTimeout(instance.resizeTimeout);
    if (instance.resizeObserver) instance.resizeObserver.disconnect();
    if (instance.inputDisposable) instance.inputDisposable.dispose();
    instance.term.dispose();
    if (instance.container.parentNode) {
      instance.container.parentNode.removeChild(instance.container);
    }
    terminalInstances.delete(sessionId);
  }
  // Note: We do NOT call EventsOff here - global handlers stay registered
};

export default React.memo(Terminal);
