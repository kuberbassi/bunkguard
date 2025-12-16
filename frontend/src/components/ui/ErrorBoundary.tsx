import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from './Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        // Log to error reporting service in production
        if (import.meta.env.PROD) {
            // Could integrate with Sentry, LogRocket, etc.
            console.error('Error caught by boundary:', error, errorInfo);
        }
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-error/10 text-error">
                            <AlertTriangle className="w-8 h-8" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-on-surface">
                                Something went wrong
                            </h2>
                            <p className="text-on-surface-variant">
                                We encountered an unexpected error. Please try refreshing or go back to the home page.
                            </p>
                        </div>

                        {import.meta.env.DEV && this.state.error && (
                            <details className="p-4 bg-surface-container rounded-xl text-left text-sm">
                                <summary className="cursor-pointer text-error font-medium">
                                    Error Details
                                </summary>
                                <pre className="mt-2 overflow-auto text-xs text-on-surface-variant">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outlined"
                                icon={<Home className="w-4 h-4" />}
                                onClick={this.handleGoHome}
                            >
                                Go Home
                            </Button>
                            <Button
                                icon={<RefreshCw className="w-4 h-4" />}
                                onClick={this.handleRetry}
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
