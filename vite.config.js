import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Get environment variables with fallbacks
const allowedHosts =
  process.env.VITE_ALLOWED_HOSTS === "*"
    ? "all"
    : process.env.VITE_ALLOWED_HOSTS?.split(",") || [];

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === "production";

  // For development, we use a local URL for the backend
  // For production, we use relative URLs
  const backendUrl = isProduction
    ? "" // Empty for production - use relative URLs
    : "http://0.0.0.0:3006";

  return {
    plugins: [react()],
    base: "/",
    server: {
      host: true,
      port: 3005,
      strictPort: false,
      ...(process.env.VITE_ALLOWED_HOSTS && {
        allowedHosts: allowedHosts,
      }),

      // This disables host checking completely if configured
      ...(process.env.VITE_ALLOW_ALL_HOSTS === "true" && {
        host: "0.0.0.0",
        disableHostCheck: true,
      }),

      proxy: {
        // General API proxy
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on("error", (err, req, res) => {
              console.log("Proxy error:", err);
            });
            proxy.on("proxyReq", (proxyReq, req, res) => {
              console.log("Sending Request:", req.method, req.url);
              // Add headers that might be needed
              proxyReq.setHeader("x-forwarded-proto", "http");
              proxyReq.setHeader("x-forwarded-host", req.headers.host);
            });
            proxy.on("proxyRes", (proxyRes, req, res) => {
              console.log("Received Response:", proxyRes.statusCode, req.url);
            });
          },
        },

        // Plex proxy - proxied through backend
        "/api/plex": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on("error", (err, req, res) => {
              console.log("Plex proxy error:", err);
            });
          },
        },

        // Tautulli proxy - proxied through backend
        "/api/tautulli": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on("error", (err, req, res) => {
              console.log("Tautulli proxy error:", err);
            });
          },
        },
      },
    },
    build: {
      // Set output directory for production build
      outDir: "dist",
      // Generate sourcemaps for easier debugging
      sourcemap: true,
      // Ensure assets use relative paths - this is critical for production
      assetsDir: "assets",
      // Needed for proper resource loading
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
});
