// Ensure React is imported and available globally
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Import the CSS with theme system
import "./styles/globals.css";

// Make React available on window for debugging if needed
window.React = React;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
