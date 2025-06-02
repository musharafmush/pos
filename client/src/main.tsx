import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Enhanced Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          fontFamily: 'Arial, sans-serif',
          color: '#333'
        }}>
          <h1 style={{ color: '#e74c3c' }}>🚨 Application Error</h1>
          <p>Something went wrong with the POS application.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🔄 Reload Application
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary>Error Details (Development)</summary>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '5px',
                overflow: 'auto',
                color: '#e74c3c'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the default browser behavior
  event.preventDefault();
  
  // You could show a toast notification here instead of crashing
  if (typeof event.reason === 'string' && event.reason.includes('fetch')) {
    console.warn('Network request failed, but continuing...');
  }
});

// Handle global errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

const root = document.getElementById("root");
if (!root) {
  console.error("Root element not found");
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>⚠️ Loading Error</h1>
      <p>Unable to find root element. Please refresh the page.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
        🔄 Reload Page
      </button>
    </div>
  `;
} else {
  try {
    createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to render app:", error);
    root.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1 style="color: #e74c3c;">🚨 Render Error</h1>
        <p>Failed to initialize the application.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
          🔄 Try Again
        </button>
      </div>
    `;
  }
}
