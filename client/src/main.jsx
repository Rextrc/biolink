import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'sans-serif', gap: 12 }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Something went wrong</div>
        <div style={{ fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: 8, maxWidth: 360, wordBreak: 'break-all' }}>{this.state.error.message}</div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '8px 18px', background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Reload</button>
      </div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
