import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ModuleErrorState } from './ui/ModuleErrorState';

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
          <ModuleErrorState
            moduleName={this.props.moduleName || 'Module'}
            error={this.state.error || 'Unknown Error'}
            onRetry={this.handleReset}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

// Made with Bob
