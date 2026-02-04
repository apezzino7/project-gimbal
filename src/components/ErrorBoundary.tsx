import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch and handle React component errors
 * Prevents the entire app from crashing on runtime errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // TODO: Send to error tracking service (Sentry, etc.)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

/**
 * Default fallback UI shown when an error occurs
 */
function ErrorFallback({ error, onRetry }: ErrorFallbackProps): ReactNode {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-[#f5f5f5] px-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-md p-6 bg-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.1)] text-center">
        <div className="mb-4">
          <svg
            className="w-12 h-12 mx-auto text-[#d32f2f]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-lg font-bold text-[#003559] mb-2">
          Something went wrong
        </h1>

        <p className="text-sm text-[#000000] mb-4">
          An unexpected error occurred. Please try again.
        </p>

        {error && import.meta.env.DEV && (
          <details className="mb-4 text-left">
            <summary className="text-xs text-[#d32f2f] cursor-pointer">
              Error details (dev only)
            </summary>
            <pre className="mt-2 p-2 bg-red-50 rounded text-xs overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex gap-2 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="h-9 px-4 text-sm font-medium bg-[#0353a4] text-white rounded hover:bg-[#003559] transition-colors duration-200"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="h-9 px-4 text-sm font-medium bg-white text-[#0353a4] border border-[#0353a4] rounded hover:bg-[#f5f5f5] transition-colors duration-200"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
