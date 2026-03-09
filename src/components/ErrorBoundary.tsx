import React from 'react';

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-zinc-900 gap-4 p-8">
                    <p className="text-zinc-300 text-center">Something went wrong. Please refresh the page.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-emerald-500 text-zinc-900 rounded-xl text-sm font-semibold"
                    >
                        Refresh
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
