import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";
import { testPlexConnection } from "../../services/plexService";
import { testTautulliConnection } from "../../services/tautulliService";
import {
  ActivitySquare,
  HelpCircle,
  Server,
  Database,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  FaExclamationTriangle,
  FaGithub,
  FaCog,
  FaKey,
  FaExternalLinkAlt,
  FaTrash,
  FaChevronLeft,
} from "react-icons/fa";
import toast from "react-hot-toast";
import BackdropSlideshow from "./BackdropSlideshow";
import { logInfo, logError } from "../../utils/logger";
import * as Icons from "lucide-react";

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
  const { updateConfig } = useConfig();
  const [formData, setFormData] = useState({
    plexUrl: "",
    plexToken: "",
    tautulliUrl: "",
    tautulliApiKey: "",
  });
  const [testing, setTesting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    plexToken: false,
    tautulliApiKey: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTesting(true);

    try {
      const loadingToast = toast.loading("Testing connections...");

      await fetch("/api/config", {
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

      // Update configuration
      updateConfig({ ...formData, isConfigured: true });

      toast.success("Setup completed successfully!", { id: loadingToast });

      // Fix: Ensure state updates before navigation
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (err) {
      toast.error(err.message || "Setup failed. Please check your settings.");
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
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

  return (
    <>
      <BackdropSlideshow />

      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <ActivitySquare className="text-brand-primary-500 text-3xl" />
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
                  <Server size={16} className="text-brand-primary-400" />
                  <h2 className="text-lg font-medium text-white">
                    Plex Configuration
                  </h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Plex Server URL
                  </label>
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
                  <p className="mt-1.5 text-xs text-gray-500 flex items-center justify-between">
                    <span>The URL where your Plex Media Server is running</span>
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
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 flex items-center justify-between">
                    <span>Your Plex authentication token</span>
                    <HelpLink href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/">
                      How to find your token
                    </HelpLink>
                  </p>
                </div>
              </div>

              {/* Tautulli Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-700/50">
                  <Database size={16} className="text-brand-primary-400" />
                  <h2 className="text-lg font-medium text-white">
                    Tautulli Configuration
                  </h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Tautulli URL
                  </label>
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
                  <p className="mt-1.5 text-xs text-gray-500 flex items-center justify-between">
                    <span>The URL where your Tautulli instance is running</span>
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
                      type={showPasswords.tautulliApiKey ? "text" : "password"}
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
                      onClick={() => togglePasswordVisibility("tautulliApiKey")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 
                        hover:text-white transition-colors"
                    >
                      {showPasswords.tautulliApiKey ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 flex items-center justify-between">
                    <span>Your Tautulli API key</span>
                    <HelpLink href="https://github.com/Tautulli/Tautulli/wiki/Frequently-Asked-Questions#general-q14">
                      How to find your API key
                    </HelpLink>
                  </p>
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
