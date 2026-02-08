import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) { return { hasError: true }; }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isTr = (this.props.language || 'english') === 'turkish';
      const title = isTr ? 'Bir şeyler yanlış gitti' : 'Something went wrong';
      const message = isTr ? 'Verdiğimiz rahatsızlık için özür dileriz. Lütfen sayfayı yenileyin.' : "We're sorry for the inconvenience. Please try refreshing.";
      const reload = isTr ? 'Yenile' : 'Reload';
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="card p-10 max-w-md text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-gray-500 text-sm">{message}</p>
            <button onClick={() => window.location.reload()} className="btn-primary mx-auto">
              <RotateCcw className="w-4 h-4" /> {reload}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
