import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";
import { useTheme } from "../../context/ThemeContext";
import { testPlexConnection } from "../../services/plexService";
import { testTautulliConnection } from "../../services/tautulliService";
import * as Icons from "lucide-react";
import toast from "react-hot-toast";
import ThemedButton from "../common/ThemedButton";
import ThemedTabButton from "../common/ThemedTabButton";
import ThemedCard from "../common/ThemedCard";
import BackupSettings from "./BackupSettings";
import CacheManager from "./CacheManager";
import LoggingSettings from "./LoggingSettings";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";

// Styled tab component for settings
const SettingsTab = ({ active, onClick, icon: Icon, label }) => (
  <ThemedTabButton
    active={active}
    onClick={onClick}
    icon={Icon}
    className="min-w-[140px]"
  >
    {label}
  </ThemedTabButton>
);

// Enhanced color option component for accent selection
const ColorOption = ({ color, current, onChange, displayName, rgb }) => {
  const isActive = current === color;

  return (
    <button
      onClick={() => onChange(color)}
      className={`flex flex-col items-center p-4 rounded-lg transition-all duration-200 ${
        isActive
          ? "border-2 border-white shadow-lg"
          : "border border-accent hover:border-accent/50 hover:shadow-accent-sm"
      }`}
      style={{
        backgroundColor: isActive ? `rgba(${rgb}, 0.15)` : `rgba(${rgb}, 0.05)`,
      }}
    >
      <div
        className={`w-12 h-12 rounded-full mb-2 flex items-center justify-center transition-transform duration-200 ${
          isActive ? "scale-110" : "hover:scale-105"
        }`}
        style={{
          background: `linear-gradient(135deg, rgba(${rgb}, 0.8) 0%, rgba(${rgb}, 0.4) 100%)`,
          boxShadow: isActive ? `0 0 15px rgba(${rgb}, 0.6)` : "none",
        }}
      >
        {isActive && <Icons.Check size={20} className="text-white" />}
      </div>
      <span
        className={`text-white text-sm font-medium ${
          isActive ? "text-accent-base" : ""
        }`}
      >
        {displayName}
      </span>
    </button>
  );
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { config, updateConfig, clearConfig } = useConfig();
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const [formData, setFormData] = useState({
    plexUrl: config?.plexUrl || "",
    plexToken: config?.plexToken || "",
    tautulliUrl: config?.tautulliUrl || "",
    tautulliApiKey: config?.tautulliApiKey || "",
  });
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState({
    plex: null,
    tautulli: null,
  });
  const [showPasswords, setShowPasswords] = useState({
    plexToken: false,
    tautulliApiKey: false,
  });
  const [resetConfirm, setResetConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("servers");

  // Handle connection testing and config updates
  const handleSubmit = async (e) => {
    e.preventDefault();
    setTesting(true);

    try {
      // Test connections
      const plexPromise = testPlexConnection(
        formData.plexUrl,
        formData.plexToken
      );
      const tautulliPromise = testTautulliConnection(
        formData.tautulliUrl,
        formData.tautulliApiKey
      );

      const [plexResult, tautulliResult] = await Promise.allSettled([
        plexPromise,
        tautulliPromise,
      ]);

      setTestResults({
        plex: plexResult.status === "fulfilled",
        tautulli: tautulliResult.status === "fulfilled",
      });

      if (
        plexResult.status === "fulfilled" &&
        tautulliResult.status === "fulfilled"
      ) {
        await updateConfig(formData);
        toast.success("Settings updated successfully");
        logInfo("Server settings updated successfully");
      } else {
        const error = [];
        if (plexResult.status === "rejected")
          error.push(
            `Plex: ${plexResult.reason.message || "Connection failed"}`
          );
        if (tautulliResult.status === "rejected")
          error.push(
            `Tautulli: ${tautulliResult.reason.message || "Connection failed"}`
          );
        toast.error(error.join("\n"));
      }
    } catch (err) {
      toast.error(err.message || "Failed to update settings");
      logError("Settings update error:", err);
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleReset = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }

    try {
      await clearConfig();
      toast.success("All settings have been reset");
      logInfo("Application settings have been reset");
      navigate("/setup");
    } catch (err) {
      toast.error(err.message || "Failed to reset settings");
    }
  };

  const handleApiEndpoints = () => {
    navigate("/api-endpoints");
  };

  // Map of available accent colors
  const accentColors = [
    { id: "purple", name: "Purple", rgb: "167, 139, 250" },
    { id: "grey", name: "Grey", rgb: "220, 220, 220" },
    { id: "green", name: "Green", rgb: "109, 247, 81" },
    { id: "maroon", name: "Maroon", rgb: "166, 40, 140" },
    { id: "orange", name: "Orange", rgb: "255, 153, 0" },
    { id: "blue", name: "Blue", rgb: "0, 98, 255" },
    { id: "red", name: "Red", rgb: "232, 12, 11" },
  ];

  // Tabs definition
  const tabs = [
    { id: "servers", label: "Server Configuration", icon: Icons.Server },
    { id: "theme", label: "Theme Settings", icon: Icons.Palette },
    { id: "logging", label: "Logging", icon: Icons.FileText },
    { id: "cache", label: "Cache Management", icon: Icons.Database },
    { id: "backup", label: "Backup & Restore", icon: Icons.Save },
    { id: "api", label: "API Documentation", icon: Icons.FileCode },
    { id: "reset", label: "Reset Application", icon: Icons.AlertTriangle },
  ];

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "servers":
        return (
          <ThemedCard
            title="Server Configuration"
            icon={Icons.Server}
            useAccentBorder={true}
            useAccentGradient={true}
            className="p-6"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {/* Plex URL */}
                <div>
                  <label className="block text-theme font-medium mb-2">
                    Plex URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Link className="text-accent-base opacity-70" />
                    </div>
                    <input
                      type="text"
                      name="plexUrl"
                      value={formData.plexUrl}
                      onChange={handleChange}
                      className="w-full bg-gray-900/50 border border-accent rounded-lg pl-10 px-4 py-3 
                        text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                        transition-all duration-200"
                      placeholder="http://your-plex-server:32400"
                    />
                  </div>
                </div>

                {/* Plex Token */}
                <div>
                  <label className="block text-theme font-medium mb-2">
                    Plex Token
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Key className="text-accent-base opacity-70" />
                    </div>
                    <input
                      type={showPasswords.plexToken ? "text" : "password"}
                      name="plexToken"
                      value={formData.plexToken}
                      onChange={handleChange}
                      className="w-full bg-gray-900/50 border border-accent rounded-lg pl-10 px-4 py-3 
                        text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                        transition-all duration-200 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("plexToken")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-accent-base opacity-70
                        hover:opacity-100 transition-opacity bg-transparent border-none outline-none focus:outline-none focus:ring-0"
                    >
                      {showPasswords.plexToken ? (
                        <Icons.EyeOff size={18} />
                      ) : (
                        <Icons.Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Tautulli URL */}
                <div>
                  <label className="block text-theme font-medium mb-2">
                    Tautulli URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Link className="text-accent-base opacity-70" />
                    </div>
                    <input
                      type="text"
                      name="tautulliUrl"
                      value={formData.tautulliUrl}
                      onChange={handleChange}
                      className="w-full bg-gray-900/50 border border-accent rounded-lg pl-10 px-4 py-3 
                        text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                        transition-all duration-200"
                      placeholder="http://your-tautulli-server:8181"
                    />
                  </div>
                </div>

                {/* Tautulli API Key */}
                <div>
                  <label className="block text-theme font-medium mb-2">
                    Tautulli API Key
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icons.Key className="text-accent-base opacity-70" />
                    </div>
                    <input
                      type={showPasswords.tautulliApiKey ? "text" : "password"}
                      name="tautulliApiKey"
                      value={formData.tautulliApiKey}
                      onChange={handleChange}
                      className="w-full bg-gray-900/50 border border-accent rounded-lg pl-10 px-4 py-3 
                        text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                        transition-all duration-200 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("tautulliApiKey")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-accent-base opacity-70
                        hover:opacity-100 transition-opacity bg-transparent border-none outline-none focus:outline-none focus:ring-0"
                    >
                      {showPasswords.tautulliApiKey ? (
                        <Icons.EyeOff size={18} />
                      ) : (
                        <Icons.Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <ThemedButton
                  type="submit"
                  variant="accent"
                  icon={testing ? Icons.Loader2 : Icons.Save}
                  disabled={testing}
                >
                  {testing ? "Testing Connection..." : "Save Settings"}
                </ThemedButton>
              </div>

              {/* Connection Status */}
              {testResults.plex !== null && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div
                    className={`p-4 rounded-lg border ${
                      testResults.plex
                        ? "bg-green-900/20 border-green-500/30 text-green-400"
                        : "bg-red-900/20 border-red-500/30 text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResults.plex ? (
                        <Icons.CheckCircle size={16} />
                      ) : (
                        <Icons.XCircle size={16} />
                      )}
                      <span>
                        Plex Connection:{" "}
                        {testResults.plex ? "Success" : "Failed"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border ${
                      testResults.tautulli
                        ? "bg-green-900/20 border-green-500/30 text-green-400"
                        : "bg-red-900/20 border-red-500/30 text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResults.tautulli ? (
                        <Icons.CheckCircle size={16} />
                      ) : (
                        <Icons.XCircle size={16} />
                      )}
                      <span>
                        Tautulli Connection:{" "}
                        {testResults.tautulli ? "Success" : "Failed"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </ThemedCard>
        );

      case "theme":
        return (
          <ThemedCard
            title="Theme Settings"
            icon={Icons.Palette}
            useAccentBorder={true}
            useAccentGradient={true}
            className="p-6"
          >
            <div className="space-y-6">
              <p className="text-theme-muted">
                Customize the appearance of the dashboard by choosing an accent
                color.
              </p>

              {/* Accent Color Selection */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white">Accent Color</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {accentColors.map((color) => (
                    <ColorOption
                      key={color.id}
                      color={color.id}
                      displayName={color.name}
                      rgb={color.rgb}
                      current={accentColor}
                      onChange={setAccentColor}
                    />
                  ))}
                </div>

                {/* Current theme information with active accent preview */}
                <div className="bg-accent-light/10 rounded-lg p-4 border border-accent mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-accent-base rounded-lg">
                      <Icons.Palette size={16} className="text-white" />
                    </div>
                    <h4 className="text-white font-medium">
                      Current Theme:{" "}
                      <span className="text-accent-base">Dark</span>
                    </h4>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="p-3 bg-accent-light rounded-lg border border-accent">
                      <span className="text-accent-base font-medium">
                        Text with accent color
                      </span>
                    </div>

                    <div className="p-3 bg-accent-base rounded-lg">
                      <span className="text-white font-medium">
                        Accent background
                      </span>
                    </div>

                    <div className="p-3 bg-gray-900/70 rounded-lg border border-accent/30">
                      <span className="text-accent-base font-medium">
                        Border accent
                      </span>
                    </div>
                  </div>

                  <p className="text-theme-muted mt-4">
                    The dashboard uses a dark theme with customizable accent
                    colors. Your accent color selection will be remembered
                    across sessions.
                  </p>
                </div>
              </div>
            </div>
          </ThemedCard>
        );

      case "logging":
        return <LoggingSettings />;

      case "cache":
        return <CacheManager />;

      case "backup":
        return <BackupSettings />;

      case "api":
        return (
          <ThemedCard
            title="API Documentation"
            icon={Icons.FileCode}
            useAccentBorder={true}
            useAccentGradient={true}
            className="p-6"
          >
            <div className="space-y-6">
              <p className="text-theme-muted mb-6">
                View all available API endpoints and how to use them with your
                applications.
              </p>
              <ThemedButton
                onClick={handleApiEndpoints}
                variant="accent"
                icon={Icons.ExternalLink}
              >
                View API Endpoints
              </ThemedButton>
            </div>
          </ThemedCard>
        );

      case "reset":
        return (
          <ThemedCard
            title="Reset Application"
            icon={Icons.AlertTriangle}
            useAccentBorder={true}
            useAccentGradient={true}
            className="p-6"
          >
            <div className="space-y-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-yellow-400 mb-4">
                  Warning: This will reset all settings and configurations. You
                  will need to set up the application again.
                </p>
                <p className="text-theme-muted mb-4">This action will:</p>
                <ul className="list-disc list-inside text-theme-muted mb-4 space-y-1">
                  <li>Clear all saved server configurations</li>
                  <li>Reset all format templates</li>
                  <li>Clear saved library sections</li>
                  <li>Return to the initial setup screen</li>
                </ul>
                <ThemedButton
                  onClick={handleReset}
                  variant="danger"
                  icon={resetConfirm ? Icons.AlertOctagon : Icons.RefreshCw}
                >
                  {resetConfirm
                    ? "Confirm Reset (This cannot be undone)"
                    : "Reset All Settings"}
                </ThemedButton>
              </div>
            </div>
          </ThemedCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Settings
        </h2>
        <p className="text-theme-muted">
          Configure your dashboard preferences and server connections
        </p>
      </div>

      {/* Tabs Navigation - Enhanced with accent colors */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {tabs.map((tab) => (
          <SettingsTab
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default SettingsPage;
