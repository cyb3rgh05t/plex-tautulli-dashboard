import React, { useState, useRef, useEffect } from "react";
import { useConfig } from "../../context/ConfigContext";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";
import * as Icons from "lucide-react";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";
import { logError, logInfo, logDebug, logWarn } from "../../utils/logger";

// StatusBadge component with theme integration
const StatusBadge = ({ type, label }) => {
  const getStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "error":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warning":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "info":
      default:
        return "bg-accent-light text-accent-base border-accent/30";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <Icons.CheckCircle size={14} />;
      case "error":
        return <Icons.XCircle size={14} />;
      case "warning":
        return <Icons.AlertTriangle size={14} />;
      case "info":
      default:
        return <Icons.Info size={14} />;
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${getStyles()}`}
    >
      {getIcon()}
      <span>{label}</span>
    </div>
  );
};

// File upload area component
const FileUploadArea = ({ onFileSelected, isLoading }) => {
  const { accentRgb } = useTheme();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle click on upload area
  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
        dragActive
          ? "border-accent-base bg-accent-light/15"
          : "border-accent/30 hover:border-accent/60 hover:bg-accent-light/10"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        minHeight: "160px",
        boxShadow: dragActive ? `0 0 15px rgba(${accentRgb}, 0.2)` : "none",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={(e) => onFileSelected(e.target.files[0])}
        className="hidden"
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <Icons.Loader2 size={32} className="text-accent-base animate-spin" />
          <p className="text-accent-base font-medium">
            Processing backup file...
          </p>
        </div>
      ) : (
        <>
          <div className="p-4 rounded-full bg-accent-light/20 mb-4">
            <Icons.Upload size={24} className="text-accent-base" />
          </div>
          <p className="text-center text-white font-medium mb-2">
            Drag & drop a backup file here
          </p>
          <p className="text-center text-theme-muted text-sm mb-3">
            or click to select a file
          </p>
          <StatusBadge type="info" label="JSON files only (.json)" />
        </>
      )}
    </div>
  );
};

// Timeline Item component for backup info
const TimelineItem = ({ icon: Icon, title, children, isLast = false }) => {
  return (
    <div className="flex gap-3">
      {/* Icon with vertical line */}
      <div className="relative flex flex-col items-center">
        <div className="p-1.5 rounded-full bg-accent-light">
          <Icon size={14} className="text-accent-base" />
        </div>
        {!isLast && <div className="w-px h-full bg-accent/20 mt-1" />}
      </div>

      {/* Content */}
      <div className="pb-4">
        <h4 className="text-white font-medium mb-1">{title}</h4>
        <div className="text-sm text-theme-muted">{children}</div>
      </div>
    </div>
  );
};

const BackupSettings = () => {
  const { config } = useConfig();
  const { accentRgb } = useTheme();
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState(null);
  const [showRestoreSection, setShowRestoreSection] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Check for last backup time in localStorage
    const storedBackupTime = localStorage.getItem("lastBackupTime");
    if (storedBackupTime) {
      setLastBackupTime(new Date(storedBackupTime));
    }
  }, []);

  const generateBackupFilename = () => {
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, "-");
    return `plex-tautulli-dashboard-backup-${timestamp}.json`;
  };

  const handleBackup = async () => {
    setIsBackupLoading(true);
    try {
      // Fetch all configurations
      const [configResponse, formatsResponse, sectionsResponse] =
        await Promise.all([
          fetch("/api/config"),
          fetch("/api/formats"),
          fetch("/api/sections"),
        ]);

      const configData = await configResponse.json();
      const formatsData = await formatsResponse.json();
      const sectionsData = await sectionsResponse.json();

      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        config: configData,
        formats: formatsData,
        sections: sectionsData,
      };

      // Create a blob of the backup data
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      // Create a link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = generateBackupFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Save backup time
      const now = new Date();
      setLastBackupTime(now);
      localStorage.setItem("lastBackupTime", now.toISOString());

      toast.success("Backup created successfully", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
          color: "#fff",
        },
      });
    } catch (error) {
      logError("Backup failed:", error);
      toast.error("Failed to create backup", {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
          color: "#fff",
        },
      });
    } finally {
      setIsBackupLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Never";

    // Format date and time nicely
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    return date.toLocaleDateString(undefined, options);
  };

  const handleRestore = async (file) => {
    if (!file) return;

    setIsRestoreLoading(true);
    try {
      const fileContent = await readFile(file);
      const backupData = JSON.parse(fileContent);

      // Validate backup file
      if (
        !backupData.version ||
        !backupData.config ||
        !backupData.formats ||
        !backupData.sections
      ) {
        throw new Error("Invalid backup file format");
      }

      // Restore configurations
      await Promise.all([
        fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backupData.config),
        }),
        fetch("/api/formats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backupData.formats),
        }),
        fetch("/api/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            backupData.sections.sections || backupData.sections
          ),
        }),
      ]);

      toast.success("Settings restored successfully", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
          color: "#fff",
        },
        duration: 5000,
      });

      // Add a slight delay before reloading to let the user see the success message
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      logError("Restore failed:", error);
      toast.error(`Failed to restore settings: ${error.message}`, {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
          color: "#fff",
        },
        duration: 5000,
      });
    } finally {
      setIsRestoreLoading(false);
    }
  };

  // Helper to read file content as text
  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  return (
    <ThemedCard
      title="Backup & Restore"
      icon={Icons.Save}
      useAccentBorder={true}
      useAccentGradient={true}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <p className="text-theme-muted text-sm max-w-xl">
            Create backups of your dashboard configurations or restore from a
            previous backup. Backups include server connections, format
            templates, and library selections.
          </p>

          {lastBackupTime && (
            <StatusBadge
              type="info"
              label={`Last backup: ${formatDate(lastBackupTime)}`}
            />
          )}
        </div>

        {/* Create Backup & Restore Section */}
        <div
          className="bg-accent-light/5 rounded-lg border border-accent/20 p-4"
          style={{
            background: `linear-gradient(135deg, rgba(${accentRgb}, 0.05) 0%, rgba(31, 41, 55, 0.6) 100%)`,
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-accent-light/20">
              <Icons.Save size={16} className="text-accent-base" />
            </div>
            <h3 className="text-lg font-medium text-white">Backup & Restore</h3>
          </div>

          <p className="text-theme-muted text-sm mb-4">
            Create a backup of your current settings or restore from a
            previously saved backup file. Backups include all your dashboard
            configurations.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <ThemedButton
              onClick={handleBackup}
              variant="accent"
              icon={isBackupLoading ? Icons.Loader2 : Icons.Download}
              disabled={isBackupLoading}
              className="flex-1"
            >
              {isBackupLoading ? "Creating Backup..." : "Create Backup"}
            </ThemedButton>

            <ThemedButton
              onClick={() => fileInputRef.current.click()}
              variant="accent"
              icon={isRestoreLoading ? Icons.Loader2 : Icons.Upload}
              disabled={isRestoreLoading}
              className="flex-1"
            >
              {isRestoreLoading ? "Restoring..." : "Restore from Backup"}
            </ThemedButton>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(e) =>
                e.target.files[0] && handleRestore(e.target.files[0])
              }
              className="hidden"
            />
          </div>

          {/* File Drop Area */}
          <div className="mt-4">
            <p className="text-white text-sm font-medium mb-2 flex items-center gap-1.5">
              <Icons.UploadCloud size={14} className="text-accent-base" />
              Or drag and drop backup file here:
            </p>
            <FileUploadArea
              onFileSelected={handleRestore}
              isLoading={isRestoreLoading}
            />
          </div>
        </div>

        {/* Info Section with Visual Timeline */}
        <div className="bg-gray-800/40 rounded-lg border border-accent/20 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-accent-light/20">
              <Icons.Info size={16} className="text-accent-base" />
            </div>
            <h3 className="text-white font-medium">What Gets Backed Up</h3>
          </div>

          <div className="ml-2 mt-4">
            <TimelineItem icon={Icons.Server} title="Server Connections">
              Plex and Tautulli server URLs and authentication tokens
            </TimelineItem>

            <TimelineItem icon={Icons.TextQuote} title="Format Templates">
              Custom formatting templates for displaying downloads and media
            </TimelineItem>

            <TimelineItem icon={Icons.Library} title="Library Selections">
              Your selected Plex libraries that appear in the dashboard
            </TimelineItem>

            <TimelineItem icon={Icons.Settings} title="Settings" isLast={true}>
              Other dashboard preferences and settings
            </TimelineItem>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <Icons.Shield size={18} className="text-yellow-400 mt-0.5" />
          <div>
            <p className="text-yellow-400 text-sm font-medium">
              Security Notice
            </p>
            <p className="text-sm text-theme-muted mt-1">
              Backup files contain sensitive information including your Plex
              token and Tautulli API key. Store these files securely and only
              restore backups from trusted sources.
            </p>
          </div>
        </div>
      </div>
    </ThemedCard>
  );
};

export default BackupSettings;
