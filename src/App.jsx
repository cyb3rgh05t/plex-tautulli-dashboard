import React, { useState, useEffect, useRef } from "react";
import { logError, logInfo, logDebug, logWarn } from "./utils/logger";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "react-query";
import { Toaster } from "react-hot-toast";
import { ConfigProvider, useConfig } from "./context/ConfigContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext.jsx";
import GlobalPreloader from "./components/common/GlobalPreloader.jsx";
import MediaContentMonitor from "./components/common/MediaContentMonitor.jsx";
import SetupWizard from "./components/SetupWizard/SetupWizard";
import ThemedDashboardLayout from "./components/Layout/ThemedDashboardLayout";
import LoadingScreen from "./components/common/LoadingScreen";
import PlexActivity from "./components/PlexActivity/PlexActivity";
import RecentlyAdded from "./components/RecentlyAdded/RecentlyAdded";
import Libraries from "./components/Libraries/Libraries";
import Users from "./components/Users/Users";
import FormatSettings from "./components/FormatSettings/FormatSettings";
import ApiEndpoints from "./components/Settings/ApiEndpoints";
import SettingsPage from "./components/Settings/Settings";

// Enhanced QueryClient with improved caching strategy
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes default stale time
      cacheTime: 30 * 60 * 1000, // 30 minutes default cache time
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      // Add a customized onError handler for all queries
      onError: (error) => {
        logError("Query error:", error);
      },
    },
    mutations: {
      // Configure mutations to retry on network errors
      retry: (failureCount, error) => {
        // Only retry for network errors, not for 4xx/5xx responses
        if (
          error.message &&
          (error.message.includes("Network Error") ||
            error.message.includes("timeout"))
        ) {
          return failureCount < 2; // Retry up to 2 times for network issues
        }
        return false; // Don't retry other errors
      },
    },
  },
});

// Try to set up query cache persistence if available in the browser environment
try {
  // Function to handle persistence setup
  const setupPersistence = async () => {
    // Completely disable React Query persistence to prevent cache size errors
    logInfo("Query persistence disabled to prevent cache size issues");

    // Keep TMDB poster cache functionality which is essential for image display
    try {
      // Create a simple cache for just TMDB poster URLs
      const tmdbCache = JSON.parse(
        localStorage.getItem("tmdbPosterCache") || "{}"
      );

      // Clean up any expired items
      const now = Date.now();
      let expiredCount = 0;

      Object.keys(tmdbCache).forEach((key) => {
        if (tmdbCache[key].expires < now) {
          delete tmdbCache[key];
          expiredCount++;
        }
      });

      // Save back cleaned cache
      localStorage.setItem("tmdbPosterCache", JSON.stringify(tmdbCache));

      if (expiredCount > 0) {
        logInfo(
          `TMDB poster cache cleaned up (removed ${expiredCount} expired items)`
        );
      }
    } catch (e) {
      logWarn("TMDB cache cleanup failed:", e);
    }
  };

  // Only attempt to set up persistence if we're in a browser environment
  if (typeof window !== "undefined") {
    setupPersistence();
  }
} catch (err) {
  logWarn("Query persistence unavailable:", err.message);
}

// Wrapper to apply theme classes safely
const ThemeWrapper = ({ children }) => {
  const { theme, accentColor, isLoading } = useTheme();

  // Only apply theme-specific inline styles once theme is loaded
  const wrapperStyle = !isLoading
    ? {
        minHeight: "100vh",
        backgroundColor: "var(--main-bg-color)",
        color: "var(--text)",
      }
    : {
        minHeight: "100vh",
        backgroundColor: "#0f172a", // Safe fallback dark color
        color: "#f8fafc",
      };

  return (
    <div
      className={`theme-${theme} accent-${accentColor}`}
      style={wrapperStyle}
    >
      {children}
    </div>
  );
};

// This component is still useful for routes requiring protection
// But initial loading is now handled by GlobalPreloader
const ProtectedRoute = ({ children }) => {
  const { isConfigured, isLoading } = useConfig();

  if (isLoading) {
    return <LoadingScreen progress={50} message="Checking configuration..." />;
  }

  if (!isConfigured()) {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

// AppRoutes component - Define routes inside Router context
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/setup" element={<SetupWizard />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ThemedDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/activities" replace />} />
        <Route path="activities" element={<PlexActivity />} />
        <Route path="recent" element={<RecentlyAdded />} />
        <Route path="libraries" element={<Libraries />} />
        <Route path="users" element={<Users />} />
        <Route path="format" element={<FormatSettings />} />
        <Route path="api-endpoints" element={<ApiEndpoints />} />
        {/* Add Settings as a child route inside the layout */}
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="*"
        element={
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-red-500 mb-4">
                Page Not Found
              </h1>
              <p className="text-gray-400 mb-6">
                The page you're looking for doesn't exist.
              </p>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-4 py-2 bg-brand-primary-500 text-white rounded-lg"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

// Main App component - Router is here - Now wrapped with ThemeProvider
const App = () => {
  // Add error boundary to catch issues
  const [error, setError] = useState(null);

  // Add error handler
  React.useEffect(() => {
    const handleError = (event) => {
      logError("Global error caught:", event.error);
      setError(event.error?.message || "An unexpected error occurred");
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (error) {
    return (
      <div
        style={{
          padding: "2rem",
          backgroundColor: "#1e293b",
          color: "white",
          minHeight: "100vh",
        }}
      >
        <h1 style={{ color: "#ef4444", marginBottom: "1rem" }}>
          Application Error
        </h1>
        <p style={{ marginBottom: "1rem" }}>
          The application encountered an error:
        </p>
        <pre
          style={{
            backgroundColor: "#0f172a",
            padding: "1rem",
            borderRadius: "0.5rem",
            overflow: "auto",
            maxWidth: "100%",
          }}
        >
          {error}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "1rem",
            backgroundColor: "#3b82f6",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Reload Application
        </button>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <ThemeProvider>
          <ThemeWrapper>
            <GlobalPreloader>
              <Router>
                <MediaContentMonitor />
                <AppRoutes />
                <Toaster
                  position="top-right"
                  gutter={12}
                  containerStyle={{
                    top: 60,
                  }}
                  toastOptions={{
                    duration: 5000,
                    className: "toast-theme",
                    style: {
                      background: "rgba(17, 24, 39, 0.85)",
                      color: "#fff",
                      maxWidth: "380px",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      border: "1px solid rgba(var(--accent-color), 0.3)",
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                    },
                    // Default toast styling
                    success: {
                      duration: 5000,
                      iconTheme: {
                        primary: "#10B981",
                        secondary: "#FFFFFF",
                      },
                      style: {
                        background: "rgba(17, 24, 39, 0.9)",
                        borderLeft: "4px solid #10B981", // Green accent
                      },
                    },
                    error: {
                      duration: 6000, // Longer duration for errors
                      iconTheme: {
                        primary: "#EF4444",
                        secondary: "#FFFFFF",
                      },
                      style: {
                        background: "rgba(17, 24, 39, 0.9)",
                        borderLeft: "4px solid #EF4444", // Red accent
                      },
                    },
                    info: {
                      iconTheme: {
                        primary: "rgb(var(--accent-color))",
                        secondary: "#FFFFFF",
                      },
                      style: {
                        background: "rgba(17, 24, 39, 0.9)",
                        borderLeft: "4px solid rgba(var(--accent-color), 1)",
                      },
                    },
                    loading: {
                      iconTheme: {
                        primary: "rgb(var(--accent-color))",
                        secondary: "#FFFFFF",
                      },
                      style: {
                        background: "rgba(17, 24, 39, 0.9)",
                        borderLeft: "4px solid rgba(var(--accent-color), 1)",
                      },
                    },
                  }}
                />
              </Router>
            </GlobalPreloader>
          </ThemeWrapper>
        </ThemeProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
