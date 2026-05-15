import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-slate-200 border border-slate-100 max-w-lg w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={40} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
              <p className="text-slate-500 leading-relaxed">
                An unexpected error occurred in the application. Our team has been notified.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="p-4 bg-slate-900 rounded-2xl text-left overflow-auto max-h-40">
                <code className="text-xs text-pink-400 font-mono">
                  {this.state.error?.toString()}
                </code>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <RotateCcw size={20} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
