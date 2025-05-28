import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  console.error("Root element not found");
  document.body.innerHTML = '<div>Loading...</div>';
} else {
  try {
    createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Error rendering app:", error);
    document.body.innerHTML = '<div>Error loading application</div>';
  }
}
