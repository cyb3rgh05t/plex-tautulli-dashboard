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
import { appVersion } from "../../../scripts/release.js";
import Logo from "../common/Logo"; // Import the Logo component

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

// Theme preview component
const ThemePreview = ({
  id,
  name,
  description,
  colors,
  isActive,
  onClick,
  isDefault,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center p-4 rounded-lg transition-theme
        ${
          isActive
            ? "bg-accent-light/20 border-2 border-white/80 shadow-accent"
            : "border border-accent/50"
        }
        hover:bg-white/10 hover:border-white/40
      `}
    >
      {/* Theme preview swatch */}
      <div className="w-full h-24 mb-3 rounded-md overflow-hidden shadow-md relative">
        {/* Gradient or solid background */}
        {[
          "hotline",
          "aquamarine",
          "hotpink",
          "cyberpunk",
          "spacegray",
          "maroon",
        ].includes(id) ? (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          >
            {/* For cyberpunk, add grid overlay */}
            {id === "cyberpunk" && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(${colors.accent}20 1px, transparent 1px), 
                                  linear-gradient(90deg, ${colors.accent}20 1px, transparent 1px)`,
                  backgroundSize: "10px 10px",
                }}
              />
            )}
          </div>
        ) : (
          <div
            className="w-full h-full"
            style={{ background: colors.primary }}
          />
        )}

        {/* Special elements for cyberpunk theme */}
        {id === "cyberpunk" && (
          <>
            <div
              className="absolute top-2 left-2 w-6 h-1"
              style={{ background: colors.highlight }}
            />
            <div
              className="absolute top-2 right-2 w-1 h-6"
              style={{ background: colors.accent }}
            />
            <div
              className="absolute bottom-2 right-2 w-6 h-1"
              style={{ background: colors.highlight }}
            />
            <div
              className="absolute bottom-2 left-2 w-1 h-6"
              style={{ background: colors.accent }}
            />
          </>
        )}

        {/* Accent color strip */}
        <div
          className="absolute bottom-0 left-0 w-full h-3"
          style={{ background: colors.accent }}
        />

        {/* Selected indicator */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/20 rounded-full p-1">
              <Icons.Check size={18} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Theme info */}
      <div className="text-center">
        <span className="text-white text-sm font-medium block">{name}</span>
        <span className="text-gray-400 text-xs block mt-1">{description}</span>
        {isDefault && (
          <span className="text-accent-base text-xs block mt-1">
            Supports custom accents
          </span>
        )}
      </div>
    </button>
  );
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { config, updateConfig, clearConfig } = useConfig();
  const {
    themeName,
    setThemeName,
    accentColor,
    setAccentColor,
    allThemes,
    allAccents,
  } = useTheme();
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

  // For theme section
  const [themeExpanded, setThemeExpanded] = useState(false);
  const [accentExpanded, setAccentExpanded] = useState(false);

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

  // Convert accent colors to array for rendering
  const accentColors = Object.entries(allAccents).map(([id, details]) => ({
    id,
    name: details.name,
    rgb: details.rgb,
  }));

  // Get theme preview color based on theme name
  const getThemePreviewColors = (theme) => {
    switch (theme) {
      case "dark":
        return {
          primary: "#0a0c14",
          secondary: "#141824",
          accent: "rgb(167, 139, 250)",
        };
      case "dracula":
        return {
          primary: "#282a36",
          secondary: "#1e2029",
          accent: "#bd93f9",
        };
      case "plex":
        return {
          primary: "#1f1f1f",
          secondary: "#282828",
          accent: "#e5a00d",
        };
      case "overseerr":
        return {
          primary: "#111827",
          secondary: "#1f2937",
          accent: "#4f46e5",
        };
      case "onedark":
        return {
          primary: "#282c34",
          secondary: "#1e222a",
          accent: "#61afef",
        };
      case "nord":
        return {
          primary: "#2E3440",
          secondary: "#3B4252",
          accent: "#79b8ca",
        };
      case "hotline":
        return {
          primary: "#f765b8",
          secondary: "#155fa5",
          accent: "#f98dc9",
        };
      case "aquamarine":
        return {
          primary: "#47918a",
          secondary: "#0b3161",
          accent: "#009688",
        };
      case "spacegray":
        return {
          primary: "#576c75",
          secondary: "#253237",
          accent: "#81a6b7",
        };
      case "organizr":
        return {
          primary: "#1f1f1f",
          secondary: "#333333",
          accent: "#2cabe3",
        };
      case "maroon":
        return {
          primary: "#4c1533",
          secondary: "#220a25",
          accent: "#a21c65",
        };
      case "hotpink":
        return {
          primary: "#fb3f62",
          secondary: "#204c80",
          accent: "#fb3f62",
        };
      case "cyberpunk":
        return {
          primary: "#160133",
          secondary: "#06021a",
          accent: "#bf00ff",
          highlight: "#e0ff00",
        };
      default:
        return {
          primary: "#0a0c14",
          secondary: "#141824",
          accent: "#a78bfa",
        };
    }
  };

  // Tabs definition - Rename "Reset Application" to "About"
  const tabs = [
    { id: "servers", label: "Server Configuration", icon: Icons.Server },
    { id: "api", label: "API Documentation", icon: Icons.FileCode },
    { id: "theme", label: "Theme Settings", icon: Icons.Palette },
    { id: "logging", label: "Debug Logging", icon: Icons.FileText },
    { id: "cache", label: "Cache Management", icon: Icons.Database },
    { id: "backup", label: "Backup & Restore", icon: Icons.Save },
    { id: "about", label: "About", icon: Icons.Info }, // Changed from reset to about
  ];

  // Only allow accent customization for dark theme
  const canCustomizeAccent = themeName === "dark";

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "servers":
        return (
          <ThemedCard
            title="Server Configuration"
            icon={Icons.Server}
            useAccentBorder={true}
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
          <div className="space-y-6">
            {/* Theme Selection Section */}
            <ThemedCard
              title="Theme Selection"
              icon={Icons.Monitor}
              useAccentBorder={true}
              className="p-6"
              action={
                <button
                  onClick={() => setThemeExpanded(!themeExpanded)}
                  className="text-sm flex items-center gap-1 text-gray-400 hover:text-white"
                >
                  {themeExpanded ? (
                    <>
                      <Icons.ChevronUp size={16} />
                      <span>Show Less</span>
                    </>
                  ) : (
                    <>
                      <Icons.ChevronDown size={16} />
                      <span>Show All</span>
                    </>
                  )}
                </button>
              }
            >
              <div className="space-y-4">
                <p className="text-theme-muted">
                  Choose a theme preset to change the overall look and feel of
                  the dashboard.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Always show at least popular themes */}
                  {Object.entries(allThemes)
                    .filter(
                      ([id, details], index) => themeExpanded || index < 4
                    )
                    .map(([id, details]) => (
                      <ThemePreview
                        key={id}
                        id={id}
                        name={details.name}
                        description={details.description}
                        colors={getThemePreviewColors(id)}
                        isActive={themeName === id}
                        isDefault={id === "dark"}
                        onClick={() => setThemeName(id)}
                      />
                    ))}
                </div>
              </div>
            </ThemedCard>

            {/* Accent Color Selection - Only enabled for dark theme */}
            <ThemedCard
              title="Accent Color"
              icon={Icons.Palette}
              useAccentBorder={true}
              className="p-6"
              action={
                canCustomizeAccent ? (
                  <button
                    onClick={() => setAccentExpanded(!accentExpanded)}
                    className="text-sm flex items-center gap-1 text-gray-400 hover:text-white"
                  >
                    {accentExpanded ? (
                      <>
                        <Icons.ChevronUp size={16} />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <Icons.ChevronDown size={16} />
                        <span>Show All</span>
                      </>
                    )}
                  </button>
                ) : null
              }
            >
              {canCustomizeAccent ? (
                <div className="space-y-4">
                  <p className="text-theme-muted">
                    Customize the accent color used throughout the dashboard.
                    Accent colors can be changed only in the Dark theme.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {accentColors
                      .filter((_, index) => accentExpanded || index < 4)
                      .map((color) => (
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
                </div>
              ) : (
                <div className="p-4 bg-gray-800/50 rounded-lg border border-accent/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.Info size={16} className="text-accent" />
                    <h4 className="text-sm font-medium text-white">
                      Theme-Defined Accent Color
                    </h4>
                  </div>
                  <p className="text-theme-muted">
                    The current theme ({allThemes[themeName]?.name}) uses a
                    predefined accent color that can't be changed. Switch to the
                    Dark theme to customize accent colors.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{
                        backgroundColor:
                          getThemePreviewColors(themeName).accent,
                      }}
                    ></div>
                    <span className="text-white text-sm">
                      Current theme accent
                    </span>
                  </div>
                </div>
              )}
            </ThemedCard>

            {/* Preview Section */}
            <ThemedCard
              title="Current Theme Preview"
              icon={Icons.Eye}
              useAccentBorder={true}
              className="p-6"
            >
              <div className="space-y-4">
                <div className="bg-accent-light/10 rounded-lg p-4 border border-accent mt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-accent-base rounded-lg">
                      <Icons.Palette size={16} className="text-white" />
                    </div>
                    <h4 className="text-white font-medium">
                      Active Theme:{" "}
                      <span className="text-accent-base">
                        {allThemes[themeName]?.name}
                      </span>
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

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-theme-muted">Button:</span>
                      <ThemedButton size="sm" variant="accent">
                        Sample Button
                      </ThemedButton>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-theme-muted">Link:</span>
                      <a
                        href="#"
                        className="text-accent-base hover:text-accent-hover underline"
                      >
                        Sample Link
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-theme-muted">Input:</span>
                      <input
                        type="text"
                        className="bg-gray-900/70 border border-accent rounded px-3 py-1 text-white focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Sample input field"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ThemedCard>
          </div>
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

      case "about":
        return (
          <div className="space-y-6">
            {/* About App Section */}
            <ThemedCard
              title="About"
              icon={Icons.Info}
              useAccentBorder={true}
              className="p-6"
            >
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* App Logo/Icon - Now uses the Logo component instead of FilmIcon */}
                <div className="flex-shrink-0 bg-accent-light/10 p-6 rounded-lg border border-accent">
                  <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                    {/* Replace FilmIcon with our Logo component */}
                    <Logo
                      size={90}
                      fillColor="#1f2937"
                      strokeColor="rgb(var(--accent-color))"
                    />
                    <Icons.BarChart2
                      size={28}
                      className="text-accent-base absolute bottom-0 right-0"
                    />
                  </div>
                </div>

                {/* App Information */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      Plex & Tautulli Dashboard
                    </h2>
                    <div className="flex items-center gap-2 text-theme-muted">
                      <Icons.Tag size={14} className="text-accent-base" />
                      <span className="text-accent-base font-medium">
                        v{appVersion}
                        {process.env.NODE_ENV === "development" ? "-dev" : ""}
                      </span>
                    </div>
                  </div>

                  <p className="text-theme-muted">
                    A modern, elegant dashboard for monitoring your Plex Media
                    Server and Tautulli statistics, featuring a dark-themed UI
                    with customizable displays and real-time monitoring.
                  </p>

                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icons.Github size={16} className="text-accent-base" />
                      <span className="text-theme-muted">Github: </span>
                      <a
                        href="https://github.com/cyb3rgh05t/plex-tautulli-dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-base hover:text-accent-hover"
                      >
                        cyb3rgh05t/plex-tautulli-dashboard
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <Icons.User size={16} className="text-accent-base" />
                      <span className="text-theme-muted">Author: </span>
                      <a
                        href="https://github.com/cyb3rgh05t"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-base hover:text-accent-hover"
                      >
                        cyb3rgh05t
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <Icons.Scale size={16} className="text-accent-base" />
                      <span className="text-theme-muted">License: </span>
                      <span className="text-white">MIT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Section - remains the same */}
              <div className="mt-6 pt-6 border-t border-accent/20">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Icons.CheckSquare size={18} className="text-accent-base" />
                  Features
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/40 p-3 rounded-lg border border-accent/20 flex items-start gap-3">
                    <Icons.Activity
                      size={16}
                      className="text-accent-base mt-0.5"
                    />
                    <div>
                      <span className="text-white font-medium">
                        Real-time Activity
                      </span>
                      <p className="text-theme-muted text-sm">
                        Live monitoring of streams and downloads
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-800/40 p-3 rounded-lg border border-accent/20 flex items-start gap-3">
                    <Icons.Film size={16} className="text-accent-base mt-0.5" />
                    <div>
                      <span className="text-white font-medium">
                        Recently Added
                      </span>
                      <p className="text-theme-muted text-sm">
                        Showcases newest content in your libraries
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-800/40 p-3 rounded-lg border border-accent/20 flex items-start gap-3">
                    <Icons.Users
                      size={16}
                      className="text-accent-base mt-0.5"
                    />
                    <div>
                      <span className="text-white font-medium">
                        User Statistics
                      </span>
                      <p className="text-theme-muted text-sm">
                        Track user activity and watch history
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-800/40 p-3 rounded-lg border border-accent/20 flex items-start gap-3">
                    <Icons.Palette
                      size={16}
                      className="text-accent-base mt-0.5"
                    />
                    <div>
                      <span className="text-white font-medium">
                        Customizable UI
                      </span>
                      <p className="text-theme-muted text-sm">
                        13 themes with selectable accent colors
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acknowledgements */}
              <div className="mt-6 pt-4 border-t border-accent/20">
                <p className="text-xs text-theme-muted">
                  This application is built with React, Tailwind CSS, and other
                  open-source libraries. Special thanks to the Plex and Tautulli
                  communities.
                </p>
              </div>
            </ThemedCard>

            {/* Danger Zone - Reset Application */}
            <ThemedCard
              title="Danger Zone"
              icon={Icons.AlertTriangle}
              useAccentBorder={true}
              className="p-6"
            >
              <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-yellow-400 mb-4">
                    Warning: This will reset all settings and configurations.
                    You will need to set up the application again.
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
          </div>
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
