import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { MapsProvider } from './MapsProvider'
import { ErrorBoundary } from './ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <MapsProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </MapsProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
