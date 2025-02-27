import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "react-query";
import { Toaster } from "react-hot-toast";
import { ConfigProvider, useConfig } from "./context/ConfigContext";
import { ThemeProvider } from "./context/ThemeContext";
import SetupWizard from "./components/SetupWizard/SetupWizard";
import DashboardLayout from "./components/Layout/DashboardLayout";
import LoadingScreen from "./components/common/LoadingScreen";
import PlexActivity from "./components/PlexActivity/PlexActivity";
import RecentlyAdded from "./components/RecentlyAdded/RecentlyAdded";
import Libraries from "./components/Libraries/Libraries";
import Users from "./components/Users/Users";
import FormatSettings from "./components/FormatSettings/FormatSettings";
import ApiEndpoints from "./components/FormatSettings/ApiEndpoints";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

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
              const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || ""}/api/downloads`
              );
              if (!response.ok)
                throw new Error("Failed to fetch Plex activities");
              const data = await response.json();
              return data.activities || [];
            }),

            queryClient.prefetchQuery(["recentlyAdded"], async () => {
              const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || ""}/api/recent/movies`
              );
              if (!response.ok)
                throw new Error("Failed to fetch recently added");
              return await response.json();
            }),

            queryClient.prefetchQuery(["libraries"], async () => {
              const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || ""}/api/libraries`
              );
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
          console.error("Error prefetching data:", error);
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
              const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || ""}/api/downloads`
              );
              if (!response.ok)
                throw new Error("Failed to fetch Plex activities");
              const data = await response.json();
              return data.activities || [];
            }),

            queryClient.prefetchQuery(["recentlyAdded"], async () => {
              const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || ""}/api/recent/movies`
              );
              if (!response.ok)
                throw new Error("Failed to fetch recently added");
              return await response.json();
            }),

            queryClient.prefetchQuery(["libraries"], async () => {
              const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || ""}/api/libraries`
              );
              if (!response.ok) throw new Error("Failed to fetch libraries");
              return await response.json();
            }),
          ]);
        } catch (error) {
          console.error("Error preloading data:", error);
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
    <Routes>
      <Route path="/setup" element={<SetupWizard />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
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

// Main App component - Router is here
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <ThemeProvider>
          <Router>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#1F2937",
                  color: "#fff",
                },
                success: {
                  style: {
                    border: "1px solid #059669",
                    padding: "16px",
                    background: "#064E3B",
                  },
                  iconTheme: {
                    primary: "#10B981",
                    secondary: "#fff",
                  },
                },
                error: {
                  style: {
                    border: "1px solid #DC2626",
                    padding: "16px",
                    background: "#7F1D1D",
                  },
                  iconTheme: {
                    primary: "#EF4444",
                    secondary: "#fff",
                  },
                },
              }}
            />
          </Router>
        </ThemeProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
