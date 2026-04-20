import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center">
                        <div className="text-6xl mb-6">⚠️</div>
                        <h1 className="font-display text-2xl font-black text-[var(--text)] mb-3">Something went wrong</h1>
                        <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
                            We're sorry — an unexpected error occurred. Please try refreshing the page.
                            If this keeps happening, contact support.
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <pre className="text-left text-xs text-red-400 bg-red-500/10 rounded-xl p-4 mb-5 overflow-auto max-h-32">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="btn btn-primary gap-2">
                                🔄 Refresh Page
                            </button>
                            <button
                                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
                                className="btn btn-secondary">
                                🏠 Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
