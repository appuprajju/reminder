import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let display = error?.message || 'Unexpected application error.';
    try {
      const parsed = JSON.parse(display);
      if (parsed && typeof parsed.error === 'string') {
        display = parsed.error;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: display };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught error:', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050712] p-6 text-slate-100">
        <div className="glass-elevated w-full max-w-md rounded-3xl p-6 text-center">
          <h1 className="font-display text-lg font-bold text-white">Something went wrong</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="liquid-primary-btn ios-spring-press mt-5 min-h-[46px] w-full rounded-xl text-sm font-semibold text-white"
          >
            Reload reminderme
          </button>
        </div>
      </div>
    );
  }
}
