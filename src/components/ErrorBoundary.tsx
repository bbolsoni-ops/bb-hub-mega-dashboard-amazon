import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha de renderização:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-slate-800 dark:text-slate-200 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            {this.props.fallbackTitle || 'Ops! Algo deu errado na exibição deste módulo.'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
            Houve uma falha inesperada durante a formatação dos dados. Você pode recarregar a visualização com segurança.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar Visualização</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
