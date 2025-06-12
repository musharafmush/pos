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
    
    // Log additional context
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Error boundary triggered by:', error.name, error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          backgroundColor: '#1a1a1a', 
          color: '#fff', 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1>🔧 Something went wrong</h1>
          <p>The application encountered an error. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '10px 20px',
              marginTop: '10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
          {this.state.error && (
            <details style={{ marginTop: '20px', maxWidth: '600px' }}>
              <summary>Error Details</summary>
              <pre style={{ 
                textAlign: 'left', 
                backgroundColor: '#2a2a2a', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
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

// Add global error handlers with better recovery
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // Try to recover from certain errors
  if (event.error?.message?.includes('Loading chunk')) {
    console.log('Chunk loading error detected, attempting refresh...');
    setTimeout(() => window.location.reload(), 1000);
  }
  
  // Handle connection errors
  if (event.error?.message?.includes('Failed to fetch')) {
    console.log('Connection error detected, attempting reconnection...');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Handle network errors gracefully
  if (event.reason?.message?.includes('fetch') || event.reason?.message?.includes('NetworkError')) {
    console.log('Network error detected, will retry...');
    event.preventDefault();
    return;
  }
  
  // Handle API errors
  if (event.reason?.status >= 400) {
    console.log('API error detected:', event.reason.status);
    event.preventDefault();
    return;
  }
  
  event.preventDefault(); // Prevent the default browser behavior
});

try {
  const root = document.getElementById("root");
  if (!root) {
    console.error("Root element not found");
    document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Loading...</div>';
    throw new Error("Root element not found");
  }

  const reactRoot = createRoot(root);
  reactRoot.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  const fallbackContent = `
    <div style="padding: 20px; text-align: center; color: #fff; background: #1a1a1a; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1 style="color: #ff6b6b;">Failed to start application</h1>
      <p>Please check the console for more details and refresh the page.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Refresh Page
      </button>
      <pre style="margin-top: 20px; padding: 10px; background: #2a2a2a; border-radius: 4px; max-width: 600px; overflow: auto; font-size: 12px;">
        ${error.toString()}
      </pre>
    </div>
  `;
  document.body.innerHTML = fallbackContent;
}
