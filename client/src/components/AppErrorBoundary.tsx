import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ReogNime UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="container error-page app-error-page">
        <p className="eyebrow">ReogNime / gangguan</p>
        <AlertTriangle size={24} />
        <h1>Ada yang tidak beres.</h1>
        <p>Halaman ini gagal dimuat. Coba muat ulang, atau kembali ke beranda.</p>
        <div className="empty-actions">
          <button className="button button-primary" onClick={() => window.location.reload()}>
            <RotateCw size={15} /> Muat ulang
          </button>
          <a href="/" className="button button-quiet">
            <ArrowLeft size={15} /> Beranda
          </a>
        </div>
      </div>
    );
  }
}
