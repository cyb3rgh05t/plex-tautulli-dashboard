import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
import { ConfigProvider, useConfig } from "./context/ConfigContext";
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
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isConfigured, isLoading } = useConfig();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isConfigured()) {
    return <Navigate to="/setup" replace />;
  }

  return children;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <Router>
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

            {/* Fix: Redirect all unknown routes to the main dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

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
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
