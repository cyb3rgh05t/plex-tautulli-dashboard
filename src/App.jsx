import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
import { ConfigProvider, useConfig } from "./context/ConfigContext";
import SetupWizard from "./components/SetupWizard/SetupWizard";
import DashboardLayout from "./components/Layout/DashboardLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
    },
  },
});

const AppContent = () => {
  const { isConfigured } = useConfig();
  console.log("Configuration status:", isConfigured());

  return isConfigured() ? <DashboardLayout /> : <SetupWizard />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <Router>
          <Routes>
            <Route path="/" element={<AppContent />} />
          </Routes>
        </Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1F2937",
              color: "#fff",
              padding: "16px",
            },
            success: {
              style: {
                background: "#064E3B",
                border: "1px solid #059669",
                padding: "16px",
              },
              iconTheme: {
                primary: "#10B981",
                secondary: "#fff",
              },
            },
            error: {
              style: {
                background: "#7F1D1D",
                border: "1px solid #DC2626",
                padding: "16px",
              },
              iconTheme: {
                primary: "#EF4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
