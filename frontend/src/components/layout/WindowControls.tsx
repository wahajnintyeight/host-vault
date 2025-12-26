import React from 'react';
import { Minus, Maximize2, X, Square } from 'lucide-react';
import { WindowMinimize, WindowMaximize, WindowClose, WindowIsMaximised } from '../../../wailsjs/go/main/App';
import { cn } from '../../lib/utils';

// Check if Wails runtime is available
const isWailsAvailable = () => {
  return typeof window !== 'undefined' && window.go && window.go.main && window.go.main.App;
};

export const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [wailsReady, setWailsReady] = React.useState(false);

  React.useEffect(() => {
    // Wait for Wails runtime to be available
    const checkWails = () => {
      if (isWailsAvailable()) {
        setWailsReady(true);
        // Check initial maximized state
        WindowIsMaximised().then(setIsMaximized).catch(() => {
          // Silently fail if not available
        });
      } else {
        // Retry after a short delay
        setTimeout(checkWails, 100);
      }
    };

    checkWails();
  }, []);

  React.useEffect(() => {
    if (!wailsReady) return;

    // Poll for maximized state changes (Wails doesn't have events for this)
    const interval = setInterval(() => {
      if (isWailsAvailable()) {
        WindowIsMaximised().then(setIsMaximized).catch(() => {
          // Silently fail if not available
        });
      }
    }, 300);

    return () => clearInterval(interval);
  }, [wailsReady]);

  const handleMinimize = () => {
    if (isWailsAvailable()) {
      WindowMinimize().catch(() => {
        // Silently fail if not available
      });
    }
  };

  const handleMaximize = () => {
    if (isWailsAvailable()) {
      WindowMaximize().then(() => {
        // Small delay to ensure state is updated
        setTimeout(() => {
          if (isWailsAvailable()) {
            WindowIsMaximised().then(setIsMaximized).catch(() => {
              // Silently fail if not available
            });
          }
        }, 100);
      }).catch(() => {
        // Silently fail if not available
      });
    }
  };

  const handleClose = () => {
    if (isWailsAvailable()) {
      WindowClose().catch(() => {
        // Silently fail if not available
      });
    }
  };

  // Don't render if Wails is not available (e.g., in browser dev mode)
  if (!wailsReady) {
    return null;
  }

  return (
    <div className="flex items-center h-8 gap-1">
      <button
        onClick={handleMinimize}
        className={cn(
          'w-11 h-8 flex items-center justify-center rounded-md',
          'hover:bg-background-light transition-all duration-200',
          'text-text-muted hover:text-text-primary',
          'hover:scale-110 active:scale-95'
        )}
        title="Minimize"
      >
        <Minus size={16} strokeWidth={2.5} />
      </button>
      <button
        onClick={handleMaximize}
        className={cn(
          'w-11 h-8 flex items-center justify-center rounded-md',
          'hover:bg-background-light transition-all duration-200',
          'text-text-muted hover:text-text-primary',
          'hover:scale-110 active:scale-95'
        )}
        title={isMaximized ? 'Restore Down' : 'Maximize'}
      >
        {isMaximized ? (
          <Square size={12} strokeWidth={2} />
        ) : (
          <Maximize2 size={12} strokeWidth={2} />
        )}
      </button>
      <button
        onClick={handleClose}
        className={cn(
          'w-11 h-8 flex items-center justify-center rounded-md',
          'hover:bg-danger transition-all duration-200',
          'text-text-muted hover:text-white',
          'hover:scale-110 active:scale-95'
        )}
        title="Close"
      >
        <X size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
};

