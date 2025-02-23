import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";
import { testPlexConnection } from "../../services/plexService";
import { testTautulliConnection } from "../../services/tautulliService";
import { appVersion } from "../../../version";
import {
  ActivitySquare,
  ClipboardList,
  Database,
  Server,
  Users as UsersGroup,
  Settings as SettingsCog,
  Code,
  Clock,
  SlidersHorizontal,
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
import Settings from "../Settings/Settings";

const TabButton = ({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
      active
        ? "bg-brand-primary-500 text-white shadow-lg shadow-brand-primary-500/20"
        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
    }`}
  >
    {Icon && (
      <Icon className={active ? "text-white" : "text-gray-500"} size={16} />
    )}
    {children}
  </button>
);

const ConnectionBadge = ({ status, type, icon: Icon }) => (
  <div
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
      status === true
        ? "bg-green-500/10 text-green-400 border-green-500/20"
        : status === false
        ? "bg-red-500/10 text-red-400 border-red-500/20"
        : "bg-gray-500/20 text-gray-400 border-gray-700/50"
    }`}
  >
    <Icon size={14} />
    <span className="text-xs font-medium">{type}</span>
  </div>
);

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { config } = useConfig();
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    plex: null,
    tautulli: null,
  });

  // Check active route
  const isActiveRoute = (path) => location.pathname === path;

  useEffect(() => {
    const checkConnections = async () => {
      try {
        await testPlexConnection(config.plexUrl, config.plexToken);
        setConnectionStatus((prev) => ({ ...prev, plex: true }));
      } catch (error) {
        setConnectionStatus((prev) => ({ ...prev, plex: false }));
      }

      try {
        await testTautulliConnection(config.tautulliUrl, config.tautulliApiKey);
        setConnectionStatus((prev) => ({ ...prev, tautulli: true }));
      } catch (error) {
        setConnectionStatus((prev) => ({ ...prev, tautulli: false }));
      }
    };

    checkConnections();
  }, [config]);

  return (
    <div className="min-h-screen bg-gray-900 bg-[radial-gradient(at_0%_0%,rgba(0,112,243,0.1)_0px,transparent_50%),radial-gradient(at_98%_100%,rgba(82,0,243,0.1)_0px,transparent_50%)]">
      <header className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3">
                <ActivitySquare className="text-brand-primary-500 text-2xl" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Plex & Tautulli Dashboard
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
              <div className="flex items-center space-x-2">
                <ConnectionBadge
                  status={connectionStatus.plex}
                  type="Plex"
                  icon={Server}
                />
                <ConnectionBadge
                  status={connectionStatus.tautulli}
                  type="Tautulli"
                  icon={Database}
                />
              </div>

              <a
                href="https://github.com/cyb3rgh05t/plex-tautulli-dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
              >
                <FaGithub size={24} />
              </a>
              <button
                onClick={() => setShowSettings(true)}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
              >
                <SettingsCog size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6">
        {/* Tabs */}
        <div className="flex justify-between mb-6">
          <div className="flex gap-2">
            <TabButton
              active={isActiveRoute("/activities")}
              onClick={() => navigate("/activities")}
              icon={ActivitySquare}
            >
              Plex Activities
            </TabButton>
            <TabButton
              active={isActiveRoute("/recent")}
              onClick={() => navigate("/recent")}
              icon={Clock}
            >
              Recently Added
            </TabButton>
            <TabButton
              active={isActiveRoute("/libraries")}
              onClick={() => navigate("/libraries")}
              icon={ClipboardList}
            >
              Libraries
            </TabButton>
            <TabButton
              active={isActiveRoute("/users")}
              onClick={() => navigate("/users")}
              icon={UsersGroup}
            >
              Users
            </TabButton>
          </div>
          <div className="flex gap-2">
            <TabButton
              active={isActiveRoute("/format")}
              onClick={() => navigate("/format")}
              icon={SlidersHorizontal}
            >
              Format Settings
            </TabButton>
            <TabButton
              active={isActiveRoute("/api-endpoints")}
              onClick={() => navigate("/api-endpoints")}
              icon={Code}
            >
              API Endpoints
            </TabButton>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-lg">
          <Outlet />
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50">
          <Settings onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
