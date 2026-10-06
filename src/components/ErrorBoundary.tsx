import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-orange-100 text-[#FF6B00] rounded-2xl mx-auto flex items-center justify-center">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
              <p className="text-sm text-gray-600">
                An unexpected interface error occurred. Your data has not been lost.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 text-left font-mono break-words overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E66000] text-sm font-semibold text-white shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw size={16} />
                Reload Application
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              Al-Jalis As-Salih &bull; Cotabato Chapter Operations
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
