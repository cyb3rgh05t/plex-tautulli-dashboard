import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This allows all hosts
    port: 3005,
    strictPort: false,
    ...(process.env.VITE_ALLOWED_HOSTS && {
      allowedHosts: (() => {
        const hosts =
          process.env.VITE_ALLOWED_HOSTS === "*"
            ? "all"
            : process.env.VITE_ALLOWED_HOSTS.split(",");
        console.log("Allowed Hosts:", hosts);
        return hosts;
      })(),
    }),

    // This disables host checking completely
    ...(process.env.VITE_ALLOW_ALL_HOSTS === "true" && {
      host: "0.0.0.0",
      disableHostCheck: true,
    }),

    proxy: {
      // General API proxy
      "/api": {
        target: "http://localhost:3006",
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            console.log(
              "Received Response from the Target:",
              proxyRes.statusCode,
              req.url
            );
          });
        },
      },
      // Plex proxy
      "/api/plex": {
        target: process.env.PLEX_URL || "http://your-plex-server:32400",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/plex/, ""),
        secure: false,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("Plex proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("Sending Request to Plex:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            console.log(
              "Received Response from Plex:",
              proxyRes.statusCode,
              req.url
            );
          });
        },
      },
      // Tautulli proxy
      "/api/tautulli": {
        target: process.env.TAUTULLI_URL || "http://your-tautulli-server:8181",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tautulli/, ""),
        secure: false,
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("Tautulli proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("Sending Request to Tautulli:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            console.log(
              "Received Response from Tautulli:",
              proxyRes.statusCode,
              req.url
            );
          });
        },
      },
    },
  },
});
