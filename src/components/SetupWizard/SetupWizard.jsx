import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { useTheme } from "../../context/ThemeContext";
import { testPlexConnection } from "../../services/plexService";
import { testTautulliConnection } from "../../services/tautulliService";
import { logInfo, logError } from "../../utils/logger";
import { FaExternalLinkAlt, FaGithub } from "react-icons/fa";
import * as Icons from "lucide-react";
import toast from "react-hot-toast";
import BackdropSlideshow from "./BackdropSlideshow";
import LoadingScreen from "../common/LoadingScreen";
import ThemedButton from "../common/ThemedButton";
import ThemeToggle from "../common/ThemeToggle";

const API_BASE_URL = "";

const HelpLink = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs text-accent-base hover:text-accent-hover transition-colors"
  >
    <Icons.HelpCircle size={12} />
    {children}
  </a>
);

const SetupWizard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateConfig } = useConfig();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    plexUrl: "",
    plexToken: "",
    tautulliUrl: "",
    tautulliApiKey: "",
  });
  const [testing, setTesting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [testResults, setTestResults] = useState({
    plex: null,
    tautulli: null,
  });
  const [showPasswords, setShowPasswords] = useState({
    plexToken: false,
    tautulliApiKey: false,
  });

  // Backup restore states
  const [isRestoreMode, setIsRestoreMode] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTesting(true);

    try {
      const loadingToast = toast.loading("Testing connections...");

      // Configure the proxy server first
      await fetch(`/api/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      // Test connections
      await Promise.all([
        testPlexConnection(formData.plexUrl, formData.plexToken),
        testTautulliConnection(formData.tautulliUrl, formData.tautulliApiKey),
      ]);

      toast.success("Setup completed successfully!", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
        id: loadingToast,
        duration: 3000,
      });

      logInfo("Setup completed successfully");

      // Show initializing screen while preloading data
      setInitializing(true);

      // Update config to trigger the app to recognize we're configured
      await updateConfig(formData);

      // Start preloading dashboard data
      try {
        await Promise.all([
          queryClient.prefetchQuery("plexActivities"),
          queryClient.prefetchQuery("recentlyAdded"),
          queryClient.prefetchQuery("libraries"),
        ]);
      } catch (error) {
        console.error("Error preloading data:", error);
      }

      // Navigate to the main dashboard
      navigate("/activities");
    } catch (err) {
      toast.error(err.message || "Setup failed. Please check your settings.", {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
        duration: 4000,
      });
      logError("Setup failed", err);
      setInitializing(false);
      setTesting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Allow typing '/' in URL fields - only remove trailing slashes when needed
    let formattedValue = value;

    // For URL fields, we'll only remove a trailing slash if it's not part of typing a path
    // This allows users to type a slash, but cleans up trailing slashes upon completion
    if (name.includes("Url") && value.endsWith("/") && !value.endsWith("://")) {
      // Only remove trailing slash if it's not immediately after protocol (http://)
      formattedValue = value.replace(/\/$/, "");
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Toggle restore mode
  const toggleRestoreMode = () => {
    setIsRestoreMode(!isRestoreMode);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle backup file restore
  const handleRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsRestoreLoading(true);
    try {
      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      // Validate backup file
      if (
        !backupData.version ||
        !backupData.config ||
        !backupData.formats ||
        !backupData.sections
      ) {
        throw new Error("Invalid backup file");
      }

      // Extract configuration data
      const configData = backupData.config;

      // Set form data from backup
      setFormData({
        plexUrl: configData.plexUrl || "",
        plexToken: configData.plexToken || "",
        tautulliUrl: configData.tautulliUrl || "",
        tautulliApiKey: configData.tautulliApiKey || "",
      });

      // Show success message
      toast.success("Backup data loaded successfully", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
        duration: 3000,
      });

      // Exit restore mode
      setIsRestoreMode(false);
    } catch (error) {
      console.error("Restore failed:", error);
      toast.error("Failed to restore from backup: " + error.message, {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
        duration: 4000,
      });
    } finally {
      setIsRestoreLoading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const ConnectionStatus = ({ type, status }) => {
    if (status === null) return null;

    return (
      <div
        className={`absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1.5 
          px-2 py-1 rounded-lg backdrop-blur-sm border ${
            status
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}
      >
        {status ? (
          <Icons.CheckCircle2 size={14} />
        ) : (
          <Icons.XCircle size={14} />
        )}
        <span className="text-xs font-medium">
          {status ? "Connected" : "Failed"}
        </span>
      </div>
    );
  };

  // If we're initializing the dashboard, show a loading screen
  if (initializing) {
    return <LoadingScreen message="Initializing Dashboard..." />;
  }

  return (
    <>
      <BackdropSlideshow />

      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        {/* Theme toggle in top right */}
        <div className="absolute top-4 right-4">
          <ThemeToggle variant="simple" />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Icons.ActivitySquare className="text-accent-base text-3xl" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Plex & Tautulli Dashboard
            </h1>
          </div>
          <p className="text-theme-muted">
            Configure your Plex and Tautulli connections
          </p>
        </div>

        {/* Restore from backup toggle */}
        <div className="w-full max-w-lg mb-4 flex justify-center">
          <button
            onClick={toggleRestoreMode}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/60 border border-gray-700/70 text-theme hover:bg-gray-800/70 transition-all duration-200"
          >
            {isRestoreMode ? (
              <>
                <Icons.ArrowLeft size={16} />
                Back to manual setup
              </>
            ) : (
              <>
                <Icons.Upload size={16} />
                Restore from backup
              </>
            )}
          </button>
        </div>

        {/* Setup Form or Restore UI */}
        <div className="w-full max-w-lg p-6 rounded-xl shadow-xl shadow-black/30 bg-gray-900/90 border border-gray-700/50">
          {isRestoreMode ? (
            /* Restore from backup UI */
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-700/50">
                <Icons.Save size={16} className="text-accent-base" />
                <h2 className="text-lg font-medium text-white">
                  Restore Configuration
                </h2>
              </div>

              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 space-y-4">
                <p className="text-theme-muted text-sm">
                  Upload a backup file to quickly restore your dashboard
                  configuration.
                </p>

                <div className="flex items-center justify-center flex-col space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    className="hidden"
                    onChange={handleRestore}
                  />

                  <ThemedButton
                    onClick={triggerFileInput}
                    variant="accent"
                    icon={isRestoreLoading ? Icons.Loader2 : Icons.Upload}
                    disabled={isRestoreLoading}
                    className="w-full sm:w-auto"
                  >
                    {isRestoreLoading ? "Processing..." : "Select Backup File"}
                  </ThemedButton>

                  <div className="text-xs text-theme-muted text-center">
                    Only upload backup files from trusted sources
                  </div>
                </div>
              </div>

              <div className="bg-accent-light/10 border border-accent-base/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Icons.Info size={16} className="text-accent-base mt-0.5" />
                  <p className="text-sm text-theme-muted">
                    After restoring your configuration, you'll still need to
                    test the connections before proceeding to the dashboard.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Manual configuration form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Plex Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-700/50">
                  <Icons.Server size={16} className="text-accent-base" />
                  <h2 className="text-lg font-medium text-white">
                    Plex Configuration
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-theme font-medium mb-1.5">
                      Plex Server URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        name="plexUrl"
                        value={formData.plexUrl}
                        onChange={handleChange}
                        className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg px-4 py-2.5 
                          text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                          transition-all duration-200"
                        placeholder="http://your-plex-server:32400"
                        required
                        disabled={testing}
                      />
                      <ConnectionStatus type="plex" status={testResults.plex} />
                    </div>
                    <p className="mt-1.5 text-xs text-theme-muted flex items-center justify-between">
                      <span>
                        The URL where your Plex Media Server is running
                      </span>
                      <HelpLink href="https://support.plex.tv/articles/200288666-opening-plex-web-app/">
                        How to find your server URL
                      </HelpLink>
                    </p>
                  </div>

                  <div>
                    <label className="block text-theme font-medium mb-1.5">
                      Plex Token
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.plexToken ? "text" : "password"}
                        name="plexToken"
                        value={formData.plexToken}
                        onChange={handleChange}
                        className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg px-4 py-2.5 
                          text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                          transition-all duration-200 font-mono pr-24"
                        required
                        disabled={testing}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("plexToken")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 
                          hover:text-white transition-colors bg-transparent border-none outline-none focus:outline-none focus:ring-0"
                      >
                        {showPasswords.plexToken ? (
                          <Icons.EyeOff size={16} />
                        ) : (
                          <Icons.Eye size={16} />
                        )}
                      </button>
                      <ConnectionStatus type="plex" status={testResults.plex} />
                    </div>
                    <p className="mt-1.5 text-xs text-theme-muted flex items-center justify-between">
                      <span>Your Plex authentication token</span>
                      <HelpLink href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/">
                        How to find your token
                      </HelpLink>
                    </p>
                  </div>
                </div>
              </div>

              {/* Tautulli Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-700/50">
                  <Icons.Database size={16} className="text-accent-base" />
                  <h2 className="text-lg font-medium text-white">
                    Tautulli Configuration
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-theme font-medium mb-1.5">
                      Tautulli URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        name="tautulliUrl"
                        value={formData.tautulliUrl}
                        onChange={handleChange}
                        className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg px-4 py-2.5 
                          text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                          transition-all duration-200"
                        placeholder="http://your-tautulli-server:8181"
                        required
                        disabled={testing}
                      />
                      <ConnectionStatus
                        type="tautulli"
                        status={testResults.tautulli}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-theme-muted flex items-center justify-between">
                      <span>
                        The URL where your Tautulli instance is running
                      </span>
                      <HelpLink href="https://github.com/Tautulli/Tautulli/wiki/Installation">
                        How to install Tautulli
                      </HelpLink>
                    </p>
                  </div>

                  <div>
                    <label className="block text-theme font-medium mb-1.5">
                      Tautulli API Key
                    </label>
                    <div className="relative">
                      <input
                        type={
                          showPasswords.tautulliApiKey ? "text" : "password"
                        }
                        name="tautulliApiKey"
                        value={formData.tautulliApiKey}
                        onChange={handleChange}
                        className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg px-4 py-2.5 
                          text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                          transition-all duration-200 font-mono pr-24"
                        required
                        disabled={testing}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          togglePasswordVisibility("tautulliApiKey")
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 
                          hover:text-white transition-colors bg-transparent border-none outline-none focus:outline-none focus:ring-0"
                      >
                        {showPasswords.tautulliApiKey ? (
                          <Icons.EyeOff size={16} />
                        ) : (
                          <Icons.Eye size={16} />
                        )}
                      </button>
                      <ConnectionStatus
                        type="tautulli"
                        status={testResults.tautulli}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-theme-muted flex items-center justify-between">
                      <span>Your Tautulli API key for authentication</span>
                      <HelpLink href="https://github.com/Tautulli/Tautulli/wiki/Frequently-Asked-Questions#general-q14">
                        How to find your API key
                      </HelpLink>
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <ThemedButton
                type="submit"
                disabled={testing}
                variant="accent"
                className="w-full"
                icon={testing ? Icons.Loader2 : Icons.CheckCircle2}
              >
                {testing ? "Testing Connections..." : "Save Configuration"}
              </ThemedButton>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <a
            href="https://github.com/cyb3rgh05t/plex-tautulli-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-theme-muted hover:text-theme-hover transition-colors"
          >
            <FaGithub size={16} />
            <span className="text-sm">View on GitHub</span>
          </a>
        </div>
      </div>
    </>
  );
};

export default SetupWizard;
