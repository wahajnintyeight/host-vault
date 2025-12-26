import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getUserFriendlyError } from '../lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-danger" size={32} />
                <h1 className="text-2xl font-bold text-text-primary">Something went wrong</h1>
              </div>

              <div className="p-4 bg-danger/20 border border-danger rounded-md">
                <p className="text-sm text-danger font-medium mb-2">Error Details:</p>
                <p className="text-sm text-text-primary">
                  {getUserFriendlyError(this.state.error)}
                </p>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="p-4 bg-background rounded-md border border-border">
                  <summary className="text-sm text-text-muted cursor-pointer mb-2">
                    Technical Details (Development Only)
                  </summary>
                  <pre className="text-xs text-text-muted overflow-auto mt-2">
                    {this.state.error.toString()}
                    {this.state.errorInfo && (
                      <>
                        {'\n\n'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={this.handleReset}
                  leftIcon={<RefreshCw size={16} />}
                >
                  Try Again
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

