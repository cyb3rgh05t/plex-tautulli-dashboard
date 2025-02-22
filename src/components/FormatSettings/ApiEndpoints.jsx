import React, { useState, useEffect } from "react";
import {
  FaServer,
  FaCheck,
  FaTimes,
  FaExternalLinkAlt,
  FaKey,
  FaCopy,
} from "react-icons/fa";
import toast from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

const EndpointCard = ({ endpoint, method, description, example, baseUrl }) => {
  const handleTest = () => {
    window.open(`${baseUrl}${endpoint}`, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${baseUrl}${endpoint}`);
    toast.success("Endpoint URL copied to clipboard", {
      style: {
        border: "1px solid #059669",
        padding: "16px",
        background: "#064E3B",
      },
    });
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg mb-4 hover:bg-gray-800/70 transition-all duration-200">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2
            ${
              method === "GET"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : method === "POST"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
            }`}
          >
            {method === "GET" ? <FaCheck size={12} /> : null}
            {method}
          </span>
          <code className="text-white font-mono bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700/50">
            {endpoint}
          </code>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700/50 transition-colors"
            title="Copy endpoint URL"
          >
            <FaCopy />
          </button>
          {method === "GET" && (
            <button
              onClick={handleTest}
              className="px-4 py-2 bg-brand-primary-500 text-white rounded-lg hover:bg-brand-primary-600 
                transition-all duration-200 shadow-lg shadow-brand-primary-500/20 
                hover:shadow-brand-primary-500/40 flex items-center gap-2"
            >
              <FaExternalLinkAlt size={12} />
              Test
            </button>
          )}
        </div>
      </div>
      <p className="text-gray-400 mb-4">{description}</p>
      {example && (
        <div className="space-y-2">
          <p className="text-gray-500 text-sm">Example Response:</p>
          <pre className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 overflow-x-auto">
            <code className="text-sm text-gray-300 font-mono">
              {JSON.stringify(example, null, 2)}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};

const ApiEndpoints = () => {
  const [baseUrl, setBaseUrl] = useState(`${API_BASE_URL}`);
  const [serverStatus, setServerStatus] = useState("active"); // 'active', 'inactive', or 'error'

  // Load saved baseUrl from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("apiBaseUrl");
    if (saved) setBaseUrl(saved);

    // Check server status
    fetch(`${baseUrl}/health`)
      .then((response) => {
        if (response.ok) {
          setServerStatus("active");
        } else {
          setServerStatus("error");
        }
      })
      .catch(() => setServerStatus("inactive"));
  }, []);

  // Save baseUrl to localStorage
  const handleBaseUrlChange = (newUrl) => {
    setBaseUrl(newUrl);
    localStorage.setItem("apiBaseUrl", newUrl);
  };

  const endpoints = [
    {
      method: "GET",
      endpoint: "/api/downloads",
      description: "Get all current downloads with custom formatting applied.",
      example: {
        total: 2,
        activities: [
          {
            uuid: "123",
            title: "Movie Title",
            progress: 45,
            formatted: {
              "Custom Format 1": "Movie Title - 45%",
            },
          },
        ],
      },
    },
    {
      method: "GET",
      endpoint: "/api/formats",
      description: "Get all configured format templates.",
      example: {
        downloads: [
          {
            name: "Custom Format 1",
            template: "{title} - {progress}%",
          },
        ],
      },
    },
    {
      method: "POST",
      endpoint: "/api/formats",
      description: "Save format templates.",
      example: {
        type: "downloads",
        formats: [
          {
            name: "Custom Format 1",
            template: "{title} - {progress}%",
          },
        ],
      },
    },
    {
      method: "GET",
      endpoint: "/api/sections",
      description: "Get all saved library sections.",
      example: {
        total: 2,
        sections: [
          {
            section_id: 1,
            type: "movie",
            name: "Movies",
          },
          {
            section_id: 2,
            type: "show",
            name: "TV Shows",
          },
        ],
      },
    },
    {
      method: "POST",
      endpoint: "/api/sections",
      description: "Save selected library sections.",
      example: [
        {
          section_id: 1,
          type: "movie",
          name: "Movies",
        },
        {
          section_id: 2,
          type: "show",
          name: "TV Shows",
        },
      ],
    },
    {
      method: "GET",
      endpoint: "/api/users",
      description: "Get users with activity and custom formatting.",
      example: {
        total: 1,
        users: [
          {
            user_id: 1,
            friendly_name: "John Doe",
            plays: 150,
            formatted: {
              "User Format 1": "John Doe - 150 plays",
            },
          },
        ],
      },
    },
    {
      method: "GET",
      endpoint: "/api/recent/:type",
      description:
        "Get recently added media for a specific type (movies, shows, music).",
      example: {
        total: 2,
        media: [
          {
            "Show Title": "Breaking Bad - S05E01 - Live Free or Die",
            raw_data: {
              title: "Live Free or Die",
              year: 2012,
              addedAt: "1625097600",
            },
          },
        ],
      },
    },
    {
      method: "GET",
      endpoint: "/api/libraries",
      description: "Get all Plex libraries.",
      example: [
        {
          section_id: 1,
          section_type: "movie",
          section_name: "Movies",
          count: 500,
        },
      ],
    },
    {
      method: "GET",
      endpoint: "/api/config",
      description: "Get current server configuration.",
      example: {
        plexUrl: "http://localhost:32400",
        tautulliUrl: "http://localhost:8181",
        hasPlexToken: true,
        hasTautulliKey: true,
      },
    },
    {
      method: "POST",
      endpoint: "/api/config",
      description: "Update server configuration.",
      example: {
        status: "ok",
        config: {
          plexUrl: "http://localhost:32400",
          tautulliUrl: "http://localhost:8181",
          hasPlexToken: true,
          hasTautulliKey: true,
        },
      },
    },
    {
      method: "POST",
      endpoint: "/api/reset-all",
      description: "Reset all configurations to default.",
      example: {
        status: "success",
        message: "All configurations reset successfully",
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Server Configuration Section */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaServer className="text-brand-primary-500 text-xl" />
            <h2 className="text-xl font-semibold text-white">
              Server Configuration
            </h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900/50 border border-gray-700/50">
            <div
              className={`w-2 h-2 rounded-full ${
                serverStatus === "active"
                  ? "bg-green-500"
                  : serverStatus === "inactive"
                  ? "bg-gray-500"
                  : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium text-gray-400">
              {serverStatus === "active"
                ? "Server Active"
                : serverStatus === "inactive"
                ? "Server Inactive"
                : "Server Error"}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-gray-300 font-medium">
            API Server URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaKey className="text-gray-500" />
            </div>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg pl-10 pr-4 py-3
                focus:ring-2 focus:ring-brand-primary-500 focus:border-brand-primary-500 
                transition-all duration-200"
              placeholder="http://localhost:3006"
            />
          </div>
        </div>
      </div>

      {/* Endpoints Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Available Endpoints
          </h2>
          <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
            <span className="text-sm font-medium text-gray-400">
              {endpoints.length} Endpoints Available
            </span>
          </div>
        </div>
        <div className="space-y-4">
          {endpoints.map((endpoint, index) => (
            <EndpointCard key={index} {...endpoint} baseUrl={baseUrl} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApiEndpoints;
