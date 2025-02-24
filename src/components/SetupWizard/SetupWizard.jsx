import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "react-query";
import { useConfig } from "../../context/ConfigContext";
import { testPlexConnection } from "../../services/plexService";
import { testTautulliConnection } from "../../services/tautulliService";
import { logInfo, logError } from "../../utils/logger";
import {
  FaServer,
  FaDatabase,
  FaCheckCircle,
  FaTimesCircle,
  FaGithub,
  FaExternalLinkAlt,
  FaTrash,
  FaExclamationTriangle,
  FaCog,
  FaPlus,
  FaKey,
  FaLink,
} from "react-icons/fa";
import * as Icons from "lucide-react";
import toast from "react-hot-toast";
import BackdropSlideshow from "./BackdropSlideshow";
import LoadingScreen from "../common/LoadingScreen";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const HelpLink = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs text-brand-primary-400 hover:text-brand-primary-300 transition-colors"
  >
    <Icons.HelpCircle size={12} />
    {children}
  </a>
);

const SetupWizard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateConfig } = useConfig();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTesting(true);

    try {
      const loadingToast = toast.loading("Testing connections...");

      // Configure the proxy server first
      await fetch(`${API_BASE_URL}/api/config`, {
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
    // Remove trailing slashes from URLs
    const formattedValue = name.includes("Url")
      ? value.replace(/\/$/, "")
      : value;
    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Icons.ActivitySquare className="text-brand-primary-500 text-3xl" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Plex & Tautulli Dashboard
            </h1>
          </div>
          <p className="text-gray-400">
            Configure your Plex and Tautulli connections
          </p>
        </div>

        {/* Setup Form */}
        <div className="w-full max-w-lg">
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900/85 rounded-xl p-6 border border-gray-700/50 shadow-xl"
          >
            <div className="space-y-6">
              {/* Plex Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-700/50">
                  <Icons.Server size={16} className="text-brand-primary-400" />
                  <h2 className="text-lg font-medium text-white">
                    Plex Configuration
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Plex Server URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        name="plexUrl"
                        value={formData.plexUrl}
                        onChange={handleChange}
                        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2.5 
                          text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary-500/50
                          focus:ring-1 focus:ring-brand-primary-500/50"
                        placeholder="http://your-plex-server:32400"
                        required
                        disabled={testing}
                      />
                      <ConnectionStatus type="plex" status={testResults.plex} />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 flex items-center justify-between">
                      <span>
                        The URL where your Plex Media Server is running
                      </span>
                      <HelpLink href="https://support.plex.tv/articles/200288666-opening-plex-web-app/">
                        How to find your server URL
                      </HelpLink>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Plex Token
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.plexToken ? "text" : "password"}
                        name="plexToken"
                        value={formData.plexToken}
                        onChange={handleChange}
                        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2.5 
                          text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary-500/50
                          focus:ring-1 focus:ring-brand-primary-500/50 pr-24"
                        required
                        disabled={testing}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("plexToken")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 
                          hover:text-white transition-colors"
                      >
                        {showPasswords.plexToken ? (
                          <Icons.EyeOff size={16} />
                        ) : (
                          <Icons.Eye size={16} />
                        )}
                      </button>
                      <ConnectionStatus type="plex" status={testResults.plex} />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 flex items-center justify-between">
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
                  <Icons.Database
                    size={16}
                    className="text-brand-primary-400"
                  />
                  <h2 className="text-lg font-medium text-white">
                    Tautulli Configuration
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Tautulli URL
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        name="tautulliUrl"
                        value={formData.tautulliUrl}
                        onChange={handleChange}
                        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2.5 
                          text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary-500/50
                          focus:ring-1 focus:ring-brand-primary-500/50"
                        placeholder="http://your-tautulli-server:8181"
                        required
                        disabled={testing}
                      />
                      <ConnectionStatus
                        type="tautulli"
                        status={testResults.tautulli}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 flex items-center justify-between">
                      <span>
                        The URL where your Tautulli instance is running
                      </span>
                      <HelpLink href="https://github.com/Tautulli/Tautulli/wiki/Installation">
                        How to install Tautulli
                      </HelpLink>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
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
                        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2.5 
                          text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary-500/50
                          focus:ring-1 focus:ring-brand-primary-500/50 pr-24"
                        required
                        disabled={testing}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          togglePasswordVisibility("tautulliApiKey")
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 
                          hover:text-white transition-colors"
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
                    <p className="mt-1.5 text-xs text-gray-500 flex items-center justify-between">
                      <span>Your Tautulli API key for authentication</span>
                      <HelpLink href="https://github.com/Tautulli/Tautulli/wiki/Frequently-Asked-Questions#general-q14">
                        How to find your API key
                      </HelpLink>
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={testing}
                className="w-full bg-brand-primary-500/10 border border-brand-primary-500/20 
                  text-brand-primary-400 py-2.5 rounded-lg font-medium
                  hover:bg-brand-primary-500/20 focus:outline-none focus:ring-2 
                  focus:ring-brand-primary-500/50 focus:ring-offset-2 focus:ring-offset-gray-900
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
                  flex items-center justify-center gap-2"
              >
                {testing ? (
                  <>
                    <Icons.Loader2 size={16} className="animate-spin" />
                    Testing Connections...
                  </>
                ) : (
                  <>
                    <Icons.CheckCircle2 size={16} />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <a
              href="https://github.com/cyb3rgh05t/plex-tautulli-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <FaGithub size={16} />
              <span className="text-sm">View on GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default SetupWizard;
