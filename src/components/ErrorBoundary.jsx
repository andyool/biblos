import { Component } from 'react';
import { exportBackup } from '../lib/device.js';

/** If something breaks while drawing a screen, offer a way back instead of a blank page. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, saved: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info?.componentStack);
  }

  render() {
    const { error, saved } = this.state;
    if (!error) return this.props.children;

    const backup = async () => {
      try {
        const result = await exportBackup();
        if (result !== 'cancelled') this.setState({ saved: true });
      } catch {
        /* nothing more we can do here */
      }
    };

    return (
      <div className="crash" role="alert">
        <h1 className="screen-title">
          <span className="gold-text">Something went wrong</span>
        </h1>
        <p className="lead">Biblos ran into a problem showing this page. Your progress is kept on this phone, so reloading is safe.</p>
        <button className="btn btn-gold btn-block" onClick={() => window.location.reload()}>
          Reload Biblos
        </button>
        <button className="btn btn-ghost btn-block" onClick={backup}>
          {saved ? 'Backup saved' : 'Save a backup first'}
        </button>
        <p className="small-print">{String(error?.message || error)}</p>
      </div>
    );
  }
}
