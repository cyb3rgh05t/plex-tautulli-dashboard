import React, { useState } from "react";
import {
  FaExclamationTriangle,
  FaGithub,
  FaCog,
  FaKey,
  FaExternalLinkAlt,
  FaTrash,
  FaChevronLeft,
} from "react-icons/fa";
import axios from "axios";
import { useConfig } from "../../context/ConfigContext";
import toast from "react-hot-toast";
import { appVersion } from "../../../version";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

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

const Settings = ({ onClose }) => {
  const { clearConfig } = useConfig();
  const [activeSubTab, setActiveSubTab] = useState("api");

  const handleApiDocumentationClick = () => {
    // Dispatch custom event to change tab
    window.dispatchEvent(
      new CustomEvent("changeTab", { detail: "apiEndpoints" })
    );
    onClose();
  };

  return (
    <div className="min-h-screen bg-gray-900 bg-[radial-gradient(at_0%_0%,rgba(0,112,243,0.1)_0px,transparent_50%),radial-gradient(at_98%_100%,rgba(82,0,243,0.1)_0px,transparent_50%)]">
      {/* Header */}
      <header className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50 mr-4"
              >
                <FaChevronLeft size={24} />
              </button>
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
                href="https://github.com/cyb3rgh05t/plex-tautulli-dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
              >
                <FaGithub size={24} />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-3">
            <nav className="space-y-2 sticky top-8">
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

          {/* Content Area */}
          <div className="col-span-9 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
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
                          {API_BASE_URL}
                        </code>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                        <h3 className="font-medium text-white mb-2">
                          API Version
                        </h3>
                        <code className="text-sm text-brand-primary-400 font-mono">
                          {appVersion}
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
                        onClick={handleApiDocumentationClick}
                        className="text-brand-primary-400 hover:text-brand-primary-300 font-medium inline-flex items-center gap-2"
                      >
                        View Documentation <FaExternalLinkAlt size={12} />
                      </button>
                    </div>
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
                              .post(`${API_BASE_URL}/api/reset-all`)
                              .then(() => {
                                clearConfig();
                                toast.success(
                                  "All configurations have been reset"
                                );
                                onClose();
                              })
                              .catch((error) => {
                                console.error(
                                  "Reset all configurations failed:",
                                  error
                                );
                                toast.error("Failed to reset configurations");
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
