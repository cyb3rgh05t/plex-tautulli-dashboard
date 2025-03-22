/**
 * Theme Utilities for handling special cases like Cyberpunk Theme
 * This file contains functions for direct CSS manipulation
 */

/**
 * Apply Cyberpunk theme with direct CSS injection
 * This ensures the theme is properly displayed by forcing styles
 */
export const applyCyberpunkTheme = () => {
  // Check if we're in a browser environment
  if (typeof document === "undefined") return;

  // Create a style element if it doesn't exist
  let styleElement = document.getElementById("cyberpunk-theme-override");
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "cyberpunk-theme-override";
    document.head.appendChild(styleElement);
  }

  // Define the CSS
  const cyberpunkCSS = `
      /* Direct body element styling */
      body.theme-cyberpunk {
        background: linear-gradient(135deg, #160133 0%, #0c0221 40%, #06021a 80%, #000000 100%) !important;
        background-color: #160133 !important; 
        background-attachment: fixed !important;
        
        background-image: 
          linear-gradient(rgba(191, 0, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(191, 0, 255, 0.05) 1px, transparent 1px) !important;
        background-size: 20px 20px !important;
        background-repeat: repeat !important;
        background-position: center center !important;
      }
      
      /* Root level CSS variables */
      :root.theme-cyberpunk {
        --main-bg-color: linear-gradient(135deg, #160133 0%, #0c0221 40%, #06021a 80%, #000000 100%) !important;
        --modal-bg-color: linear-gradient(180deg, #160133 0%, #06021a 100%) !important;
        --modal-header-color: linear-gradient(180deg, #160133 0%, #06021a 100%) !important;
        --modal-footer-color: linear-gradient(180deg, #160133 0%, #06021a 100%) !important;
        --drop-down-menu-bg: #160133 !important;
        --button-color: #e0ff00 !important;
        --button-color-hover: #bf00ff !important;
        --button-text: #000000 !important;
        --button-text-hover: #ffffff !important;
        --accent-color: 191, 0, 255 !important;
        --link-color: #e0ff00 !important;
        --link-color-hover: #ffffff !important;
        --text: #d6c5ff !important;
        --text-hover: #ffffff !important;
        --text-muted: #6b46a9 !important;
        --theme-bg-primary: linear-gradient(135deg, #160133 0%, #0c0221 40%, #06021a 80%, #000000 100%) !important;
        --theme-bg-secondary: linear-gradient(180deg, #160133 0%, #06021a 100%) !important;
        --theme-bg-tertiary: #160133 !important;
      }
      
      /* Apply to app containers */
      body.theme-cyberpunk #root,
      body.theme-cyberpunk #app,
      body.theme-cyberpunk .app-container,
      body.theme-cyberpunk main,
      body.theme-cyberpunk [class*="container"] {
        background: transparent !important;
      }
  
      /* Header styling */
      body.theme-cyberpunk header {
        background-color: rgba(22, 1, 51, 0.7) !important;
        border-bottom-color: rgba(224, 255, 0, 0.2) !important;
      }
  
      /* Navigation elements */
      body.theme-cyberpunk nav {
        background-color: rgba(12, 2, 33, 0.8) !important;
        border-color: rgba(191, 0, 255, 0.2) !important;
      }
  
      /* Progress bars */
      body.theme-cyberpunk [class*="progress-bar"] {
        background-color: rgba(191, 0, 255, 0.2) !important;
      }
      
      body.theme-cyberpunk [class*="progress-bar"] > * {
        background-color: #e0ff00 !important;
      }
      
      /* Card and container styling */
      body.theme-cyberpunk [class*="card"],
      body.theme-cyberpunk [class*="Card"],
      body.theme-cyberpunk [class*="panel"],
      body.theme-cyberpunk [class*="Panel"] {
        background-color: rgba(22, 1, 51, 0.7) !important;
        border-color: rgba(191, 0, 255, 0.3) !important;
      }
      
      /* Button styling */
      body.theme-cyberpunk button[class*="accent"],
      body.theme-cyberpunk [class*="button-accent"],
      body.theme-cyberpunk [class*="btn-accent"] {
        background-color: #e0ff00 !important;
        color: #160133 !important;
      }
  
      body.theme-cyberpunk button[class*="accent"]:hover,
      body.theme-cyberpunk [class*="button-accent"]:hover,
      body.theme-cyberpunk [class*="btn-accent"]:hover {
        background-color: #bf00ff !important;
        color: #ffffff !important;
      }
      
      /* Add neon glow effects to highlights */
      body.theme-cyberpunk .accent-base,
      body.theme-cyberpunk .text-accent,
      body.theme-cyberpunk .text-accent-base,
      body.theme-cyberpunk [class*="accent-base"] {
        color: #e0ff00 !important;
      }
    `;

  // Set the CSS content
  styleElement.textContent = cyberpunkCSS;

  // Make sure body has the right class
  const body = document.body;
  if (body && !body.classList.contains("theme-cyberpunk")) {
    body.classList.add("theme-cyberpunk");
  }

  // Add direct HTML element change for full page coverage
  const html = document.documentElement;
  if (html && !html.classList.contains("theme-cyberpunk")) {
    html.classList.add("theme-cyberpunk");
  }
};

/**
 * Remove the injected Cyberpunk theme styles
 */
export const removeCyberpunkTheme = () => {
  // Check if we're in a browser environment
  if (typeof document === "undefined") return;

  const styleElement = document.getElementById("cyberpunk-theme-override");
  if (styleElement) {
    styleElement.remove();
  }
};

/**
 * Utility to preload theme images
 * This helps prevent loading flashes when switching themes
 */
export const preloadThemeImages = () => {
  // Could add preloading functionality here if needed
};

/**
 * Check if the system has reduced motion preferences
 * This helps make animations more accessible
 */
export const hasReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export default {
  applyCyberpunkTheme,
  removeCyberpunkTheme,
  preloadThemeImages,
  hasReducedMotion,
};
