import React, { useState, useEffect } from "react";
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
import axios from "axios";
import { useConfig } from "../../context/ConfigContext";
import toast from "react-hot-toast";
import { testPlexConnection } from "../../services/plexService";
import { testTautulliConnection } from "../../services/tautulliService";

const SubTabButton = ({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
      active
        ? "bg-brand-primary-500 text-white shadow-lg shadow-brand-primary-500/20"
        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
    }`}
  >
    {Icon && <Icon className={active ? "text-white" : "text-gray-500"} />}
    {children}
  </button>
);

const ConfigField = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  helpText,
  helpLink,
}) => (
  <div className="space-y-2">
    <label className="block text-gray-300 font-medium">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="text-gray-500" />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-gray-800/50 text-white border border-gray-700 rounded-lg shadow-sm 
        focus:ring-2 focus:ring-brand-primary-500 focus:border-brand-primary-500 
        transition-all duration-200 ${Icon ? "pl-10" : "pl-4"} pr-4 py-3`}
      />
    </div>
    {helpText && (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>{helpText}</span>
        {helpLink && (
          <a
            href={helpLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary-400 hover:text-brand-primary-300 flex items-center gap-1"
          >
            Learn more <FaExternalLinkAlt size={12} />
          </a>
        )}
      </div>
    )}
  </div>
);

const ConnectionStatus = ({ status, type, showDetails = false }) => (
  <div
    className={`flex items-center gap-2 p-2 rounded-lg ${
      status === null
        ? "bg-gray-800/30 text-gray-400"
        : status
        ? "bg-green-500/10 text-green-400"
        : "bg-red-500/10 text-red-400"
    }`}
  >
    {status === true ? (
      <FaCheckCircle className="text-green-400" />
    ) : status === false ? (
      <FaTimesCircle className="text-red-400" />
    ) : (
      <div className="w-4 h-4 rounded-full border-2 border-gray-600 border-t-gray-300 animate-spin" />
    )}
    <span className="font-medium">{type}</span>
    {showDetails && status === true && (
      <span className="text-sm text-gray-400">Connected</span>
    )}
  </div>
);

const Settings = ({ onClose }) => {
  const { config, updateConfig, clearConfig } = useConfig();
  const [activeSubTab, setActiveSubTab] = useState("connections");
  const [formData, setFormData] = useState({
    plexUrl: config?.plexUrl || "",
    plexToken: config?.plexToken || "",
    tautulliUrl: config?.tautulliUrl || "",
    tautulliApiKey: config?.tautulliApiKey || "",
  });
  const [connectionStatus, setConnectionStatus] = useState({
    plex: null,
    tautulli: null,
  });
  const [testing, setTesting] = useState(false);
  const appVersion = "v1.0.0";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const testConnections = async () => {
    setTesting(true);
    try {
      // Validate URLs first
      try {
        new URL(formData.plexUrl);
        new URL(formData.tautulliUrl);
      } catch (urlError) {
        toast.error("Invalid URL format");
        return;
      }

      // Test Plex connection
      await testPlexConnection(formData.plexUrl, formData.plexToken);
      setConnectionStatus((prev) => ({ ...prev, plex: true }));

      // Test Tautulli connection
      await testTautulliConnection(
        formData.tautulliUrl,
        formData.tautulliApiKey
      );
      setConnectionStatus((prev) => ({ ...prev, tautulli: true }));

      toast.success("All connections tested successfully!", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
        iconTheme: {
          primary: "#10B981",
          secondary: "#ECFDF5",
        },
      });
    } catch (error) {
      toast.error(error.message, {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
        iconTheme: {
          primary: "#EF4444",
          secondary: "#FEF2F2",
        },
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.post("http://localhost:3006/api/config", formData);
      updateConfig(formData);
      toast.success("Settings saved successfully!", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
      });
    } catch (error) {
      toast.error("Failed to save settings", {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 bg-[radial-gradient(at_0%_0%,rgba(0,112,243,0.1)_0px,transparent_50%),radial-gradient(at_98%_100%,rgba(82,0,243,0.1)_0px,transparent_50%)]">
      <header className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3">
                <FaCog className="text-brand-primary-500 text-2xl" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Settings
                </h1>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-900/50 rounded-full">
                <span className="w-2 h-2 rounded-full bg-brand-primary-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-400">
                  {appVersion}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/cyb3rgh05t/custom-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
              >
                <FaGithub size={24} />
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-200 rounded-lg hover:bg-gray-700/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-3">
            <nav className="space-y-2">
              <SubTabButton
                active={activeSubTab === "connections"}
                onClick={() => setActiveSubTab("connections")}
                icon={FaLink}
              >
                Connections
              </SubTabButton>
              <SubTabButton
                active={activeSubTab === "api"}
                onClick={() => setActiveSubTab("api")}
                icon={FaKey}
              >
                API Settings
              </SubTabButton>
              <SubTabButton
                active={activeSubTab === "dangerZone"}
                onClick={() => setActiveSubTab("dangerZone")}
                icon={FaExclamationTriangle}
              >
                Danger Zone
              </SubTabButton>
            </nav>
          </div>

          {/* Main Content */}
          <div className="col-span-9 space-y-6">
            {activeSubTab === "connections" && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    Plex Connection
                  </h2>
                  <div className="space-y-4">
                    <ConfigField
                      label="Plex Server URL"
                      value={formData.plexUrl}
                      onChange={(e) => handleChange(e)}
                      name="plexUrl"
                      placeholder="http://your-plex-server:32400"
                      icon={FaServer}
                    />
                    <ConfigField
                      label="Plex Token"
                      value={formData.plexToken}
                      onChange={(e) => handleChange(e)}
                      name="plexToken"
                      type="password"
                      placeholder="Enter your Plex token"
                      icon={FaKey}
                      helpText="Need help finding your Plex token?"
                      helpLink="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/"
                    />
                  </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    Tautulli Connection
                  </h2>
                  <div className="space-y-4">
                    <ConfigField
                      label="Tautulli URL"
                      value={formData.tautulliUrl}
                      onChange={(e) => handleChange(e)}
                      name="tautulliUrl"
                      placeholder="http://your-tautulli-server:8181"
                      icon={FaDatabase}
                    />
                    <ConfigField
                      label="Tautulli API Key"
                      value={formData.tautulliApiKey}
                      onChange={(e) => handleChange(e)}
                      name="tautulliApiKey"
                      type="password"
                      placeholder="Enter your Tautulli API key"
                      icon={FaKey}
                      helpText="Need help finding your Tautulli API key?"
                      helpLink="https://github.com/Tautulli/Tautulli/wiki/Frequently-Asked-Questions#general-q1"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <ConnectionStatus
                      status={connectionStatus.plex}
                      type="Plex"
                      showDetails
                    />
                    <ConnectionStatus
                      status={connectionStatus.tautulli}
                      type="Tautulli"
                      showDetails
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={testConnections}
                      disabled={testing}
                      className="px-6 py-2 bg-brand-primary-500 text-white rounded-lg hover:bg-brand-primary-600 
                        transition-all duration-200 shadow-lg shadow-brand-primary-500/20 
                        hover:shadow-brand-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center gap-2"
                    >
                      {testing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Connections"
                      )}
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                        transition-all duration-200 shadow-lg shadow-green-500/20 
                        hover:shadow-green-500/40"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === "dangerZone" && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <FaExclamationTriangle className="text-red-500 text-2xl" />
                  <h2 className="text-xl font-semibold text-red-400">
                    Danger Zone
                  </h2>
                </div>
                <p className="text-gray-300 mb-6">
                  Actions in this section can permanently delete your
                  configuration and cannot be undone. Please proceed with
                  caution.
                </p>
                <div className="space-y-4">
                  <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-red-400">
                          Reset All Settings
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          This will reset all your settings to their default
                          values.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to reset ALL configurations? This cannot be undone."
                            )
                          ) {
                            axios
                              .post("http://localhost:3006/api/reset-all")
                              .then(() => {
                                clearConfig();
                                toast.success(
                                  "All configurations have been reset",
                                  {
                                    style: {
                                      border: "1px solid #059669",
                                      padding: "16px",
                                      background: "#064E3B",
                                    },
                                  }
                                );
                                onClose();
                              })
                              .catch((error) => {
                                console.error(
                                  "Reset all configurations failed:",
                                  error
                                );
                                toast.error("Failed to reset configurations", {
                                  style: {
                                    border: "1px solid #DC2626",
                                    padding: "16px",
                                    background: "#7F1D1D",
                                  },
                                });
                              });
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                          transition-all duration-200 flex items-center gap-2 group"
                      >
                        <FaTrash className="text-white/70 group-hover:text-white" />
                        Reset All
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === "api" && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    API Configuration
                  </h2>
                  <div className="space-y-4">
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <h3 className="font-medium text-white">API Status</h3>
                      </div>
                      <p className="text-gray-400">
                        Your API is currently active and running.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                        <h3 className="font-medium text-white mb-2">
                          Base URL
                        </h3>
                        <code className="text-sm text-brand-primary-400 font-mono">
                          http://localhost:3006
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                        <h3 className="font-medium text-white mb-2">
                          API Version
                        </h3>
                        <code className="text-sm text-brand-primary-400 font-mono">
                          v1.0.0
                        </code>
                      </div>
                    </div>

                    <div className="bg-brand-primary-500/5 border border-brand-primary-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaExternalLinkAlt className="text-brand-primary-400" />
                        <h3 className="font-medium text-white">
                          API Documentation
                        </h3>
                      </div>
                      <p className="text-gray-400 mb-3">
                        View the complete API documentation to learn about
                        available endpoints and how to use them.
                      </p>
                      <button
                        onClick={() => setActiveTab("apiEndpoints")}
                        className="text-brand-primary-400 hover:text-brand-primary-300 font-medium"
                      >
                        View Documentation →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
