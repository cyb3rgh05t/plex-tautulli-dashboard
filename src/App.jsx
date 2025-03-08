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
import { prefetchRecentlyAdded } from "./utils/prefetch";
import { Toaster } from "react-hot-toast";
import { ConfigProvider, useConfig } from "./context/ConfigContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext.jsx";
import ImagePreloader from "./components/ImagePreloader.jsx";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

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

// Setup Completion Handler - Inside Router context
const SetupCompletionHandler = ({ onComplete }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isConfigured, isLoading } = useConfig();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isLoading && isConfigured() && !hasRun.current) {
      hasRun.current = true;

      const prefetchData = async () => {
        try {
          await Promise.all([
            queryClient.prefetchQuery(["plexActivities"], async () => {
              const response = await fetch(`/api/downloads`);
              if (!response.ok)
                throw new Error("Failed to fetch Plex activities");
              const data = await response.json();
              return data.activities || [];
            }),

            // Properly prefetch recently added content
            prefetchRecentlyAdded(queryClient),

            queryClient.prefetchQuery(["libraries"], async () => {
              const response = await fetch(`/api/libraries`);
              if (!response.ok) throw new Error("Failed to fetch libraries");
              return await response.json();
            }),
          ]);

          // Only navigate if we're on the root path
          const pathname = window.location.pathname;
          if (pathname === "/" || pathname === "/setup") {
            navigate("/activities");
          }

          if (onComplete) onComplete();
        } catch (error) {
          logError("Error prefetching data:", error);
          if (onComplete) onComplete();
        }
      };

      prefetchData();
    }
  }, [isConfigured, isLoading, navigate, queryClient, onComplete]);

  return null;
};

// Protected Route - Inside Router context
const ProtectedRoute = ({ children }) => {
  const { isConfigured, isLoading } = useConfig();
  const [isPreloading, setIsPreloading] = useState(true);
  const queryClient = useQueryClient();
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (!isLoading && isConfigured() && !hasPreloaded.current) {
      hasPreloaded.current = true;

      const preloadData = async () => {
        try {
          await Promise.all([
            queryClient.prefetchQuery(["plexActivities"], async () => {
              const response = await fetch(`/api/downloads`);
              if (!response.ok)
                throw new Error("Failed to fetch Plex activities");
              const data = await response.json();
              return data.activities || [];
            }),

            // Prefetch with improved function
            prefetchRecentlyAdded(queryClient),

            queryClient.prefetchQuery(["libraries"], async () => {
              const response = await fetch(`/api/libraries`);
              if (!response.ok) throw new Error("Failed to fetch libraries");
              return await response.json();
            }),
          ]);
        } catch (error) {
          logError("Error preloading data:", error);
        } finally {
          setIsPreloading(false);
        }
      };

      preloadData();
    } else if (!isLoading) {
      setIsPreloading(false);
    }
  }, [isConfigured, isLoading, queryClient]);

  if (isLoading || isPreloading) {
    return <LoadingScreen />;
  }

  if (!isConfigured()) {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

// AppRoutes component - Define routes inside Router context
const AppRoutes = () => {
  const [setupComplete, setSetupComplete] = useState(false);

  return (
    <>
      <SetupCompletionHandler onComplete={() => setSetupComplete(true)} />
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
    </>
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
            <Router>
              <ImagePreloader />
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: `rgba(var(--accent-color), 0.55)`,
                    color: "#fff",
                    border: `1px solid rgba(var(--accent-color), 0.5)`,
                    backdropFilter: "blur(10px)",
                    boxShadow: `0 0 10px rgba(var(--accent-color), 0.5), 0 0 20px rgba(var(--accent-color), 0.3)`,
                    textShadow:
                      "1px 1px 2px rgba(0,0,0,0.5), 0 0 5px rgba(0,0,0,0.3)",
                  },
                  success: {
                    style: {
                      background: `rgba(var(--accent-color), 0.55)`,
                      border: `1px solid rgba(var(--accent-color), 0.7)`,
                      backdropFilter: "blur(10px)",
                      boxShadow: `0 0 10px rgba(var(--accent-color), 0.5), 0 0 20px rgba(var(--accent-color), 0.3)`,
                      textShadow:
                        "1px 1px 2px rgba(0,0,0,0.5), 0 0 5px rgba(0,0,0,0.3)",
                    },
                    iconTheme: {
                      primary: "#10B981",
                      secondary: "#fff",
                    },
                  },
                  error: {
                    style: {
                      background: "rgba(232, 12, 11, 0.85)",
                      border: "1px solid rgba(232, 12, 11, 0.7)",
                      backdropFilter: "blur(10px)",
                      boxShadow:
                        "0 0 10px rgba(232, 12, 11, 0.5), 0 0 20px rgba(232, 12, 11, 0.3)",
                      textShadow:
                        "1px 1px 2px rgba(0,0,0,0.5), 0 0 5px rgba(0,0,0,0.3)",
                    },
                    iconTheme: {
                      primary: "#EF4444",
                      secondary: "#fff",
                    },
                  },
                }}
              />
            </Router>
          </ThemeWrapper>
        </ThemeProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
