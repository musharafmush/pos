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
  if (event.error?.message?.includes('Loading chunk') || 
      event.error?.message?.includes('Failed to fetch') ||
      event.error?.message?.includes('import')) {
    console.log('Module loading error detected, attempting refresh...');
    setTimeout(() => window.location.reload(), 1500);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Handle network and Vite connection errors gracefully
  if (event.reason?.message?.includes('fetch') ||
      event.reason?.message?.includes('WebSocket') ||
      event.reason?.message?.includes('ERR_NETWORK')) {
    console.log('Network/Vite connection error detected, will retry...');
    // Don't prevent default for network errors, let them be handled
    return;
  }
  
  event.preventDefault(); // Prevent the default browser behavior
});

// Enhanced Vite connection monitoring with aggressive recovery
if (typeof window !== 'undefined' && 'WebSocket' in window) {
  let reconnectAttempts = 0;
  let connectionLost = false;
  let connectionFailures = 0;
  const maxReconnectAttempts = 5; // Increased from 3
  const maxConnectionFailures = 8; // New threshold
  
  // More aggressive connection monitoring
  const checkViteConnection = () => {
    const checkInterval = setInterval(() => {
      if (connectionLost && reconnectAttempts >= maxReconnectAttempts) {
        console.log('🔄 Vite connection permanently lost, forcing reload...');
        clearInterval(checkInterval);
        window.location.reload();
      }
      
      if (connectionFailures >= maxConnectionFailures) {
        console.log('❌ Too many connection failures, forcing complete reload...');
        clearInterval(checkInterval);
        window.location.reload();
      }
    }, 3000); // Check every 3 seconds instead of 5
    
    // Clear interval after successful connection restoration
    setTimeout(() => {
      if (!connectionLost && connectionFailures < 3) {
        clearInterval(checkInterval);
      }
    }, 20000); // Reduced from 30 seconds
  };
  
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = new originalWebSocket(url, protocols);
    
    if (url.includes('vite') || url.includes('5173') || url.includes('5000')) {
      ws.addEventListener('error', (event) => {
        console.warn('🔌 Vite WebSocket error:', event);
        connectionLost = true;
        connectionFailures++;
      });
      
      ws.addEventListener('close', (event) => {
        connectionLost = true;
        reconnectAttempts++;
        connectionFailures++;
        console.log(`📡 Vite connection closed (code: ${event.code}), attempt ${reconnectAttempts}/${maxReconnectAttempts}, failures: ${connectionFailures}`);
        
        if (reconnectAttempts === 1) {
          checkViteConnection();
        }
        
        // More aggressive reload for certain error codes
        if (event.code === 1006 || event.code === 1011) {
          console.log('💥 Critical connection error detected, forcing immediate reload...');
          setTimeout(() => window.location.reload(), 2000);
        }
      });
      
      ws.addEventListener('open', () => {
        if (connectionLost) {
          console.log('✅ Vite WebSocket reconnected successfully');
        }
        connectionLost = false;
        reconnectAttempts = 0;
        connectionFailures = Math.max(0, connectionFailures - 2); // Reduce failure count on success
      });
    }
    
    return ws;
  };
  
  // Enhanced health check with exponential backoff
  let healthCheckInterval = 5000; // Start with 5 seconds
  let viteHealthCheck = setInterval(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    fetch('/__vite_ping', { 
      signal: controller.signal,
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(response => {
        clearTimeout(timeoutId);
        if (response.ok) {
          if (connectionLost || connectionFailures > 0) {
            console.log('🎯 Vite server health check passed, connection stable');
            connectionLost = false;
            reconnectAttempts = 0;
            connectionFailures = Math.max(0, connectionFailures - 1);
            healthCheckInterval = 5000; // Reset interval
          }
        } else {
          throw new Error(`Health check failed: ${response.status}`);
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        connectionFailures++;
        
        if (error.name === 'AbortError') {
          console.log('⏰ Vite health check timeout');
        } else {
          console.log('⚠️ Vite health check failed:', error.message);
        }
        
        if (!connectionLost) {
          connectionLost = true;
        }
        
        // Exponential backoff for health checks
        healthCheckInterval = Math.min(healthCheckInterval * 1.5, 15000);
        
        // Force reload on persistent failures
        if (connectionFailures >= maxConnectionFailures) {
          console.log('🔄 Persistent health check failures, reloading application...');
          setTimeout(() => window.location.reload(), 1000);
        }
      });
  }, healthCheckInterval);
  
  // Shorter monitoring window for faster recovery
  setTimeout(() => {
    if (viteHealthCheck && connectionFailures < 3) {
      clearInterval(viteHealthCheck);
      viteHealthCheck = null;
      console.log('🏁 Vite connection monitoring completed successfully');
    }
  }, 30000); // Reduced from 45 seconds
}

// Initialize React app safely
function initializeApp() {
  try {
    const root = document.getElementById("root");
    if (!root) {
      console.error("Root element not found");
      document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: #333; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;"><h2>Loading POS System...</h2></div>';
      return;
    }

    console.log('Initializing React app...');
    const reactRoot = createRoot(root);
    
    reactRoot.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    console.log('React app initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #fff; background: #1a1a1a; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: Arial, sans-serif;">
        <h1 style="color: #ff6b6b; margin-bottom: 16px;">⚠️ POS System Error</h1>
        <p style="margin-bottom: 20px;">Application failed to start. Please refresh to try again.</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
          🔄 Refresh Application
        </button>
        <details style="margin-top: 20px; max-width: 600px;">
          <summary style="cursor: pointer; color: #ccc;">Show Error Details</summary>
          <pre style="margin-top: 10px; padding: 10px; background: #2a2a2a; border-radius: 4px; overflow: auto; font-size: 12px; text-align: left;">
            ${error.toString()}
          </pre>
        </details>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already ready
  initializeApp();
}
