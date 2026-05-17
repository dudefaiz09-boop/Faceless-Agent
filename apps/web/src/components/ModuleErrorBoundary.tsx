import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.moduleName || 'Module'}] Error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="max-w-md space-y-6 rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm dark:bg-slate-900 dark:border-red-900/30">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {this.props.moduleName || 'Module'} Error
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Something went wrong while loading this module. Please try refreshing the page.
              </p>
              {this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-400">
                    Technical Details
                  </summary>
                  <pre className="mt-2 overflow-auto rounded-xl bg-slate-50 p-4 text-[10px] text-red-600 dark:bg-slate-950 dark:text-red-400">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              <RefreshCcw size={18} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Made with Bob
