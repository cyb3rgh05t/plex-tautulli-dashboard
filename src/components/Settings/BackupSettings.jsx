import React, { useState, useRef } from "react";
import { useConfig } from "../../context/ConfigContext";
import toast from "react-hot-toast";
import * as Icons from "lucide-react";
import ThemedButton from "../common/ThemedButton";
import ThemedCard from "../common/ThemedCard";

const BackupSettings = () => {
  const { config } = useConfig();
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const fileInputRef = useRef(null);

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

      toast.success("Backup created successfully", {
        style: {
          border: "1px solid #059669",
          padding: "16px",
          background: "#064E3B",
        },
      });
    } catch (error) {
      console.error("Backup failed:", error);
      toast.error("Failed to create backup", {
        style: {
          border: "1px solid #DC2626",
          padding: "16px",
          background: "#7F1D1D",
        },
      });
    } finally {
      setIsBackupLoading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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
        },
        duration: 4000,
      });

      // Optional: Refresh the page to apply restored settings
      window.location.reload();
    } catch (error) {
      console.error("Restore failed:", error);
      toast.error("Failed to restore settings", {
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

  return (
    <ThemedCard
      title="Backup & Restore"
      icon={Icons.Save}
      useAccentBorder={true}
    >
      <div className="space-y-4">
        <p className="text-theme-muted text-sm">
          Create backups of your dashboard configurations or restore from a
          previous backup.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Backup Button */}
          <ThemedButton
            onClick={handleBackup}
            variant="primary"
            icon={isBackupLoading ? Icons.Loader2 : Icons.Download}
            disabled={isBackupLoading}
            className="w-full sm:w-auto"
          >
            {isBackupLoading ? "Creating Backup..." : "Create Backup"}
          </ThemedButton>

          {/* Restore Button */}
          <ThemedButton
            onClick={triggerFileInput}
            variant="accent"
            icon={isRestoreLoading ? Icons.Loader2 : Icons.Upload}
            disabled={isRestoreLoading}
            className="w-full sm:w-auto"
          >
            {isRestoreLoading ? "Restoring..." : "Restore Backup"}
          </ThemedButton>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            className="hidden"
            onChange={handleRestore}
          />
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Icons.AlertTriangle size={16} className="text-yellow-400" />
            <h4 className="text-yellow-400 font-medium">Backup Precautions</h4>
          </div>
          <ul className="text-theme-muted text-xs list-disc list-inside space-y-1">
            <li>Keep your backup files secure and private</li>
            <li>Only restore backups from trusted sources</li>
            <li>Restoring will overwrite current configurations</li>
            <li>A page reload is required after restoration</li>
          </ul>
        </div>
      </div>
    </ThemedCard>
  );
};

export default BackupSettings;
