import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary actionLabel="Reload LUMIQ" onRecover={() => window.location.reload()}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
