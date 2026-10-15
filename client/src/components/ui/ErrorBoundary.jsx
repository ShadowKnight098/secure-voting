import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI exception in ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-lavender flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface border-3 border-ink rounded-[16px] p-6 shadow-neo-xl text-ink space-y-4">
            <div className="w-12 h-12 bg-coral border-2 border-ink rounded-[12px] shadow-neo-sm flex items-center justify-center text-ink">
              <AlertTriangle size={24} />
            </div>
            
            <h2 className="text-xl font-black text-ink">Something went wrong</h2>
            <p className="text-xs font-medium text-ink/70">
              The application encountered an unexpected interface error. We have prevented a blank screen.
            </p>

            {this.state.error && (
              <div className="p-3 bg-lavender/50 border-2 border-ink rounded-[10px] text-[11px] font-mono text-ink/80 break-words max-h-32 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button 
                variant="primary" 
                onClick={this.handleReload} 
                icon={RefreshCw}
                className="flex-1"
              >
                Reload
              </Button>
              <Button 
                variant="secondary" 
                onClick={this.handleGoHome} 
                icon={Home}
                className="flex-1"
              >
                Return Home
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
