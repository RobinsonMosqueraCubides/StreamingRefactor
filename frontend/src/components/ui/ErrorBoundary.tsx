import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center gap-5">
            <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400">
              <AlertTriangle className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Algo salió mal</h2>
              <p className="text-sm text-slate-400">
                La aplicación detectó un error inesperado al renderizar la interfaz.
              </p>
            </div>

            {this.state.error && (
              <pre className="w-full text-[10px] font-mono text-left bg-slate-950 p-4 rounded-xl border border-slate-850 text-slate-500 overflow-x-auto max-h-32">
                {this.state.error.stack || this.state.error.message}
              </pre>
            )}

            <Button
              onClick={this.handleReload}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              <RefreshCw className="w-4 h-4" /> Recargar Aplicación
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
