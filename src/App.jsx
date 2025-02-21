import React from "react";
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
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1F2937",
              color: "#fff",
            },
            success: {
              iconTheme: {
                primary: "#10B981",
                secondary: "#fff",
              },
            },
            error: {
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
