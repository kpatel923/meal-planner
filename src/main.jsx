import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

// Global error boundary — catches crashes and shows them instead of blank screen
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          fontFamily: 'monospace', padding: '40px', maxWidth: '700px',
          margin: '60px auto', background: '#fff8f6', border: '2px solid #cc6040',
          borderRadius: '12px'
        }}>
          <h2 style={{ color: '#cc6040', marginTop: 0 }}>🔴 App crashed — here's why:</h2>
          <pre style={{
            background: '#f4f4f4', padding: '16px', borderRadius: '8px',
            overflowX: 'auto', fontSize: '13px', color: '#333', whiteSpace: 'pre-wrap'
          }}>
            {this.state.error.message}
          </pre>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: 0 }}>
            Most common cause: <strong>.env.local</strong> is missing or has wrong values.<br/>
            Check the browser console (⌘ Option J) for more details.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
