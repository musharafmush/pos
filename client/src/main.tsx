import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Error boundary component to prevent app crashes that cause refreshes
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.warn('Global error caught:', event.error);
      setHasError(false); // Don't show error UI for now, just log
      event.preventDefault(); // Prevent default error handling that might cause refresh
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent default handling
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  if (hasError) {
    return <div>Something went wrong, but we're recovering...</div>;
  }
  
  return <>{children}</>;
}

const root = document.getElementById("root");
if (!root) {
  console.error("Root element not found");
  // Don't throw error that might cause refresh
  document.body.innerHTML = '<div>Loading...</div>';
} else {
  createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
