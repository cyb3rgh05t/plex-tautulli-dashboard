import React, { useState, useEffect, useRef } from "react";
import { FaServer, FaCheck, FaKey, FaCopy } from "react-icons/fa";
import toast from "react-hot-toast";
import axios from "axios";
import ThemedCard from "../common/ThemedCard";
import ThemedButton from "../common/ThemedButton";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3006";

// Reusable Sub-Tab Button Component
const SubTabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? "bg-accent-light text-accent-base"
        : "text-theme-muted hover:text-theme-hover hover:bg-gray-700/50"
    }`}
  >
    {children}
  </button>
);

// Request Example Display Component
const RequestExampleDisplay = ({ examples }) => {
  const [activeLanguage, setActiveLanguage] = useState("url");

  return (
    <div className="space-y-4">
      {/* Language Selection Tabs */}
      <div className="flex gap-2 mb-4">
        <SubTabButton
          active={activeLanguage === "url"}
          onClick={() => setActiveLanguage("url")}
        >
          URL
        </SubTabButton>
        <SubTabButton
          active={activeLanguage === "python"}
          onClick={() => setActiveLanguage("python")}
        >
          Python
        </SubTabButton>
        <SubTabButton
          active={activeLanguage === "javascript"}
          onClick={() => setActiveLanguage("javascript")}
        >
          JavaScript
        </SubTabButton>
      </div>

      {/* Example Code Display */}
      {examples.map((example, index) => (
        <div key={index} className="space-y-2">
          <p className="text-theme-muted text-sm">{example.description}</p>
          <pre className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 overflow-x-auto">
            <code className="text-sm text-theme font-mono">
              {activeLanguage === "url" && example.curlCommand}
              {activeLanguage === "python" && example.pythonRequest}
              {activeLanguage === "javascript" && example.javascriptFetch}
            </code>
          </pre>
        </div>
      ))}
    </div>
  );
};

const EndpointCard = ({
  endpoint,
  method,
  description,
  example,
  baseUrl,
  payload,
  requestExamples,
  responseTypes,
}) => {
  const [testResponse, setTestResponse] = useState(null);
  const [testError, setTestError] = useState(null);
  const [loading, setLoading] = useState(false);

  // For dynamic URL parameters
  const [modifiedEndpoint, setModifiedEndpoint] = useState(endpoint);
  const [paramValues, setParamValues] = useState({});

  // Function to detect URL parameters in endpoint
  const detectUrlParams = (endpointStr) => {
    const regex = /:([\w]+)/g;
    const params = [];
    let match;
    while ((match = regex.exec(endpointStr)) !== null) {
      params.push(match[1]);
    }
    return params;
  };

  // Get URL parameters from endpoint
  const urlParams = detectUrlParams(endpoint);

  // Initialize param values if they don't exist
  useEffect(() => {
    if (urlParams.length > 0) {
      const initialValues = {};
      urlParams.forEach((param) => {
        initialValues[param] = paramValues[param] || "";
      });
      setParamValues(initialValues);
    }
  }, [endpoint]);

  // Update modified endpoint when params change
  useEffect(() => {
    let updatedEndpoint = endpoint;
    Object.entries(paramValues).forEach(([param, value]) => {
      if (value) {
        updatedEndpoint = updatedEndpoint.replace(`:${param}`, value);
      }
    });
    setModifiedEndpoint(updatedEndpoint);
  }, [endpoint, paramValues]);

  // Handle parameter input change
  const handleParamChange = (param, value) => {
    setParamValues((prev) => ({
      ...prev,
      [param]: value,
    }));
  };

  const handleTest = async () => {
    setLoading(true);
    setTestResponse(null);
    setTestError(null);

    try {
      let response;
      // Use the modified endpoint with replaced parameter values
      if (method === "GET") {
        response = await axios.get(`${baseUrl}${modifiedEndpoint}`);
      } else if (method === "POST") {
        response = await axios.post(`${baseUrl}${modifiedEndpoint}`, payload);
      }

      setTestResponse(response.data);
    } catch (error) {
      setTestError(error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const urlToCopy = `${baseUrl}${modifiedEndpoint}`;

    // Fallback copy method using textarea technique
    const fallbackCopyMethod = (text) => {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Make the textarea out of viewport
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);

        // Select the text
        textArea.focus();
        textArea.select();

        // Execute copy command
        const successful = document.execCommand("copy");

        if (successful) {
          toast.success("Endpoint URL copied to clipboard");
        } else {
          toast.error("Unable to copy URL");
        }

        // Remove the temporary textarea
        document.body.removeChild(textArea);
      } catch (err) {
        console.error("Fallback copy method failed:", err);
        toast.error("Failed to copy URL");
      }
    };

    // Try modern clipboard API first
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(urlToCopy)
        .then(() => {
          toast.success("Endpoint URL copied to clipboard");
        })
        .catch((err) => {
          console.error("Clipboard write failed:", err);
          fallbackCopyMethod(urlToCopy);
        });
    } else {
      // Fallback to older method if modern API is not available
      fallbackCopyMethod(urlToCopy);
    }
  };

  // Check if we have a valid endpoint for testing
  const canTest =
    urlParams.length === 0 ||
    urlParams.every(
      (param) => paramValues[param] && paramValues[param].trim() !== ""
    );

  return (
    <ThemedCard
      className="mb-4 hover:bg-gray-800/70 transition-all duration-200"
      isInteractive
      hasBorder
      useAccentBorder={true}
    >
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
            {modifiedEndpoint}
          </code>
        </div>
        <div className="flex gap-2">
          <ThemedButton
            variant="ghost"
            size="sm"
            icon={FaCopy}
            onClick={handleCopy}
            title="Copy endpoint URL"
          />
          {(method === "GET" || method === "POST") && (
            <ThemedButton
              variant="accent"
              size="sm"
              onClick={handleTest}
              disabled={loading || !canTest}
            >
              {loading ? "Testing..." : "Test"}
            </ThemedButton>
          )}
        </div>
      </div>

      <p className="text-theme-muted mb-4">{description}</p>

      {/* URL Parameters Input Fields */}
      {urlParams.length > 0 && (
        <div className="mb-4 bg-gray-900/20 p-4 rounded-lg border border-gray-700/30">
          <h4 className="text-white font-medium mb-3">URL Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urlParams.map((param) => (
              <div key={param} className="flex items-center gap-2">
                <div className="text-theme-muted text-sm min-w-[80px]">
                  :{param}
                </div>
                <input
                  type="text"
                  value={paramValues[param] || ""}
                  onChange={(e) => handleParamChange(param, e.target.value)}
                  placeholder={`Replace :${param}`}
                  className="flex-1 bg-gray-900/50 text-white border border-gray-700/50 rounded-lg px-3 py-2 
                    placeholder-gray-500 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Replace parameters in the URL before testing
          </div>
        </div>
      )}

      {/* Request Examples Section */}
      {requestExamples && (
        <div className="space-y-4 mb-4">
          <h4 className="text-white font-medium">Request Examples</h4>
          <RequestExampleDisplay examples={requestExamples} />
        </div>
      )}

      {/* Test Response Section */}
      {loading && (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
          <p className="text-theme-muted animate-pulse">Testing endpoint...</p>
        </div>
      )}

      {testResponse && (
        <div className="space-y-2">
          <p className="text-green-400 font-medium">Test Response:</p>
          <pre className="bg-green-900/20 p-4 rounded-lg border border-green-500/20 overflow-x-auto">
            <code className="text-sm text-green-300 font-mono">
              {JSON.stringify(testResponse, null, 2)}
            </code>
          </pre>
        </div>
      )}

      {testError && (
        <div className="space-y-2">
          <p className="text-red-400 font-medium">Test Error:</p>
          <pre className="bg-red-900/20 p-4 rounded-lg border border-red-500/20 overflow-x-auto">
            <code className="text-sm text-red-300 font-mono">
              {JSON.stringify(testError, null, 2)}
            </code>
          </pre>
        </div>
      )}

      {example && (
        <div className="space-y-2">
          <p className="text-gray-500 text-sm">Example Response:</p>
          <pre className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 overflow-x-auto">
            <code className="text-sm text-theme font-mono">
              {JSON.stringify(example, null, 2)}
            </code>
          </pre>
        </div>
      )}
    </ThemedCard>
  );
};

const ApiEndpoints = () => {
  const [baseUrl, setBaseUrl] = useState(API_BASE_URL);
  const [activeTab, setActiveTab] = useState("get");
  const [serverStatus, setServerStatus] = useState("active");

  useEffect(() => {
    const saved = localStorage.getItem("apiBaseUrl");
    if (saved) setBaseUrl(saved);

    // Check server status
    fetch(`${baseUrl}/api/health`)
      .then((response) => {
        if (response.ok) {
          setServerStatus("active");
        } else {
          setServerStatus("error");
        }
      })
      .catch(() => setServerStatus("inactive"));
  }, [baseUrl]);

  const handleBaseUrlChange = (newUrl) => {
    setBaseUrl(newUrl);
    localStorage.setItem("apiBaseUrl", newUrl);
  };

  // Constants for endpoint definitions
  const GET_ENDPOINTS = [
    {
      endpoint: "/api/config",
      description: "Get current server configuration.",
      requestExamples: [
        {
          description: "Retrieve server configuration",
          curlCommand: `${baseUrl}/api/config`,
          pythonRequest: `
  import requests
  
  # Get server configuration
  response = requests.get('${baseUrl}/api/config')
  config = response.json()
          `.trim(),
          javascriptFetch: `
  // Get server configuration
  fetch('${baseUrl}/api/config')
    .then(response => response.json())
    .then(config => console.log(config));
          `.trim(),
        },
      ],
      example: {
        plexUrl: "http://localhost:32400",
        tautulliUrl: "http://localhost:8181",
        hasPlexToken: true,
        hasTautulliKey: true,
      },
    },
    {
      endpoint: "/api/health",
      description: "Server health check endpoint.",
      requestExamples: [
        {
          description: "Check server health",
          curlCommand: `${baseUrl}/api/health`,
          pythonRequest: `
  import requests
  
  # Check server health
  response = requests.get('${baseUrl}/api/health')
  health_status = response.json()
          `.trim(),
          javascriptFetch: `
  // Check server health
  fetch('${baseUrl}/api/health')
    .then(response => response.json())
    .then(healthStatus => console.log(healthStatus));
          `.trim(),
        },
      ],
      example: {
        status: "ok",
        timestamp: "2024-02-23T12:34:56Z",
        config: {
          plexUrl: "http://localhost:32400",
          tautulliUrl: "http://localhost:8181",
          hasPlexToken: true,
          hasTautulliKey: true,
        },
      },
    },
    {
      endpoint: "/api/formats",
      description: "Get all configured format templates.",
      requestExamples: [
        {
          description: "Retrieve all format templates",
          curlCommand: `${baseUrl}/api/formats`,
          pythonRequest: `
  import requests
  
  response = requests.get('${baseUrl}/api/formats')
  formats = response.json()
          `.trim(),
          javascriptFetch: `
  fetch('${baseUrl}/api/formats')
    .then(response => response.json())
    .then(formats => console.log(formats));
          `.trim(),
        },
      ],
      example: {
        downloads: [
          {
            name: "Custom Format 1",
            template: "{title} - {progress}%",
          },
        ],
        recentlyAdded: [
          {
            name: "Movie Format",
            template: "{title} ({year})",
          },
        ],
      },
    },
    {
      endpoint: "/api/downloads",
      description: "Get all current downloads with custom formatting applied.",
      requestExamples: [
        {
          description: "Retrieve all downloads",
          curlCommand: `${baseUrl}/api/downloads`,
          pythonRequest: `
  import requests
  
  response = requests.get('${baseUrl}/api/downloads')
  downloads = response.json()
          `.trim(),
          javascriptFetch: `
  fetch('${baseUrl}/api/downloads')
    .then(response => response.json())
    .then(downloads => console.log(downloads));
          `.trim(),
        },
      ],
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
      endpoint: "/api/libraries",
      description: "Get all Plex media libraries.",
      requestExamples: [
        {
          description: "Retrieve all libraries",
          curlCommand: `${baseUrl}/api/libraries`,
          pythonRequest: `
  import requests
  
  # Get all libraries
  response = requests.get('${baseUrl}/api/libraries')
  libraries = response.json()
          `.trim(),
          javascriptFetch: `
  // Get all libraries
  fetch('${baseUrl}/api/libraries')
    .then(response => response.json())
    .then(libraries => console.log(libraries));
          `.trim(),
        },
      ],
      example: [
        {
          section_id: 1,
          section_type: "movie",
          section_name: "Movies",
          count: 500,
        },
        {
          section_id: 2,
          section_type: "show",
          section_name: "TV Shows",
          count: 250,
        },
      ],
    },
    {
      endpoint: "/api/sections",
      description: "Get all saved library sections.",
      requestExamples: [
        {
          description: "Retrieve saved sections",
          curlCommand: `${baseUrl}/api/sections`,
          pythonRequest: `
  import requests
  
  response = requests.get('${baseUrl}/api/sections')
  sections = response.json()
          `.trim(),
          javascriptFetch: `
  fetch('${baseUrl}/api/sections')
    .then(response => response.json())
    .then(sections => console.log(sections));
          `.trim(),
        },
      ],
      example: {
        total: 2,
        sections: [
          {
            section_id: 1,
            type: "movie",
            name: "Movies",
            count: 500,
            total_plays: 10000,
            last_accessed: 1640995200,
          },
        ],
      },
    },
    {
      endpoint: "/api/users",
      description: "Get users with activity and custom formatting.",
      requestExamples: [
        {
          description: "Retrieve all users",
          curlCommand: `${baseUrl}/api/users`,
          pythonRequest: `
  import requests
  
  response = requests.get('${baseUrl}/api/users')
  users = response.json()
          `.trim(),
          javascriptFetch: `
  fetch('${baseUrl}/api/users')
    .then(response => response.json())
    .then(users => console.log(users));
          `.trim(),
        },
      ],
      example: {
        total: 5,
        users: [
          {
            user_id: 1,
            friendly_name: "John Doe",
            plays: 150,
            duration: 500,
            last_seen: 1640995200,
            formatted: {
              "User Format 1": "John Doe - 150 plays",
            },
          },
        ],
      },
    },
    {
      endpoint: "/api/media/:type",
      description:
        "Get detailed media information with optional filtering and advanced options.",
      requestExamples: [
        {
          description: "Get all movies",
          curlCommand: `
    # Get all movies
    ${baseUrl}/api/media/movies
    
    # Get movies from a specific section
    ${baseUrl}/api/media/movies?section=1
    
    # Limit number of results
    ${baseUrl}/api/media/movies?count=10
    
    # Advanced filtering
    ${baseUrl}/api/media/movies?year=2010&resolution=4K
          `.trim(),
          pythonRequest: `
    import requests
    
    # Get all movies
    response = requests.get('${baseUrl}/api/media/movies')
    movies = response.json()
    
    # Get movies from a specific section
    response = requests.get('${baseUrl}/api/media/movies?section=1')
    section_movies = response.json()
    
    # Limit number of results
    response = requests.get('${baseUrl}/api/media/movies?count=10')
    limited_movies = response.json()
    
    # Advanced filtering
    response = requests.get('${baseUrl}/api/media/movies?year=2010&resolution=4K')
    filtered_movies = response.json()
          `.trim(),
          javascriptFetch: `
    // Get all movies
    fetch('${baseUrl}/api/media/movies')
      .then(response => response.json())
      .then(movies => console.log(movies));
    
    // Get movies from a specific section
    fetch('${baseUrl}/api/media/movies?section=1')
      .then(response => response.json())
      .then(sectionMovies => console.log(sectionMovies));
    
    // Limit number of results
    fetch('${baseUrl}/api/media/movies?count=10')
      .then(response => response.json())
      .then(limitedMovies => console.log(limitedMovies));
    
    // Advanced filtering
    fetch('${baseUrl}/api/media/movies?year=2010&resolution=4K')
      .then(response => response.json())
      .then(filteredMovies => console.log(filteredMovies));
          `.trim(),
        },
        {
          description: "Get TV shows with advanced filtering",
          curlCommand: `${baseUrl}/api/media/shows?genre=Drama&rating=8`,
          pythonRequest: `
    import requests
    
    # Get TV shows by genre
    response = requests.get('${baseUrl}/api/media/shows?genre=Drama')
    drama_shows = response.json()
    
    # Get shows with high rating
    response = requests.get('${baseUrl}/api/media/shows?rating=8')
    highly_rated_shows = response.json()
    
    # Combine filters
    response = requests.get('${baseUrl}/api/media/shows?genre=Drama&rating=8&year=2020')
    specific_shows = response.json()
          `.trim(),
          javascriptFetch: `
    // Get TV shows by genre
    fetch('${baseUrl}/api/media/shows?genre=Drama')
      .then(response => response.json())
      .then(dramaShows => console.log(dramaShows));
    
    // Get shows with high rating
    fetch('${baseUrl}/api/media/shows?rating=8')
      .then(response => response.json())
      .then(highlyRatedShows => console.log(highlyRatedShows));
    
    // Combine filters
    fetch('${baseUrl}/api/media/shows?genre=Drama&rating=8&year=2020')
      .then(response => response.json())
      .then(specificShows => console.log(specificShows));
          `.trim(),
        },
      ],
      example: {
        movies: {
          total: 50,
          sections: [
            { id: 1, name: "Main Movies" },
            { id: 2, name: "4K Movies" },
          ],
          media: [
            {
              title: "Inception",
              year: 2010,
              rating: "8.8",
              duration: 148,
              directors: ["Christopher Nolan"],
              genres: ["Sci-Fi", "Action"],
              video_full_resolution: "4K",
              section_id: 2,
              formatted: {
                "Custom Movie Format": "Inception (4K) - Christopher Nolan",
              },
            },
          ],
        },
        shows: {
          total: 75,
          sections: [
            { id: 3, name: "TV Shows" },
            { id: 4, name: "Completed Series" },
          ],
          media: [
            {
              title: "Live Free or Die",
              grandparent_title: "Breaking Bad",
              year: 2012,
              parent_media_index: 5,
              media_index: 1,
              directors: ["Vince Gilligan"],
              genres: ["Crime", "Drama"],
              video_full_resolution: "1080p",
              section_id: 3,
              formatted: {
                "Custom Show Format": "Breaking Bad - S05E01",
              },
            },
          ],
        },
      },
      queryParameters: [
        {
          name: "section",
          type: "number",
          description: "Filter media by specific library section ID",
        },
        {
          name: "count",
          type: "number",
          description: "Limit the number of results returned (default: 50)",
        },
        {
          name: "year",
          type: "number",
          description: "Filter media by release year",
        },
        {
          name: "genre",
          type: "string",
          description: "Filter media by genre",
        },
        {
          name: "rating",
          type: "number",
          description: "Filter media by minimum rating",
        },
        {
          name: "resolution",
          type: "string",
          description: "Filter media by video resolution (e.g., '4K', '1080p')",
        },
        {
          name: "sort",
          type: "string",
          description: "Sort results (options: 'year', 'rating', 'added_date')",
        },
        {
          name: "order",
          type: "string",
          description: "Sort order for sorted results (asc/desc)",
        },
      ],
    },
    {
      endpoint: "/api/recent/:type",
      description:
        "Get recently added media for a specific type (movies, shows, music).",
      requestExamples: [
        {
          description: "Get recent movies",
          curlCommand: `
  # Get recent movies
  ${baseUrl}/api/recent/movies
  
  # Get recent movies from a specific section
  ${baseUrl}/api/recent/movies?section=1
          `.trim(),
          pythonRequest: `
  import requests
  
  # Get recent movies
  response = requests.get('${baseUrl}/api/recent/movies')
  recent_movies = response.json()
  
  # Get recent movies from a specific section
  response = requests.get('${baseUrl}/api/recent/movies?section=1')
  section_movies = response.json()
          `.trim(),
          javascriptFetch: `
  // Get recent movies
  fetch('${baseUrl}/api/recent/movies')
    .then(response => response.json())
    .then(recentMovies => console.log(recentMovies));
  
  // Get recent movies from a specific section
  fetch('${baseUrl}/api/recent/movies?section=1')
    .then(response => response.json())
    .then(sectionMovies => console.log(sectionMovies));
          `.trim(),
        },
      ],
      example: {
        total: 10,
        media: [
          {
            "Movie Title": "Inception (2010)",
            raw_data: {
              title: "Inception",
              year: 2010,
              video_full_resolution: "1080p",
              addedAt: "1625097600",
              rating: "8.8",
            },
          },
        ],
        sections: [
          { id: 1, name: "Main Movies" },
          { id: 2, name: "4K Movies" },
        ],
      },
    },
  ];

  // POST endpoints definition (abbreviated to save space)
  const POST_ENDPOINTS = [
    {
      endpoint: "/api/formats",
      description: "Save format templates for different media types.",
      requestExamples: [
        {
          description: "Save download format",
          curlCommand: `
curl -X POST ${baseUrl}/api/formats \\
     -H "Content-Type: application/json" \\
     -d '{
  "type": "downloads",
  "formats": [
    {
      "name": "Custom Download Format",
      "template": "{title} - {progress}%"
    }
  ]
}'
        `.trim(),
          pythonRequest: `
import requests
import json

payload = {
    "type": "downloads",
    "formats": [
        {
            "name": "Custom Download Format",
            "template": "{title} - {progress}%"
        }
    ]
}

response = requests.post(
    '${baseUrl}/api/formats', 
    headers={'Content-Type': 'application/json'},
    data=json.dumps(payload)
)
result = response.json()
        `.trim(),
          javascriptFetch: `
const payload = {
  type: "downloads",
  formats: [
    {
      name: "Custom Download Format",
      template: "{title} - {progress}%"
    }
  ]
};

fetch('${baseUrl}/api/formats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
.then(response => response.json())
.then(result => console.log(result));
        `.trim(),
        },
      ],
      payload: {
        type: "downloads",
        formats: [
          {
            name: "Custom Download Format",
            template: "{title} - {progress}%",
          },
        ],
      },
      example: {
        success: true,
        formats: {
          downloads: [
            {
              name: "Custom Download Format",
              template: "{title} - {progress}%",
            },
          ],
        },
      },
    },
    {
      endpoint: "/api/sections",
      description: "Save selected library sections with advanced metadata.",
      requestExamples: [
        {
          description: "Save library sections",
          curlCommand: `
  curl -X POST ${baseUrl}/api/sections \\
       -H "Content-Type: application/json" \\
       -d '[
    {
      "section_id": 1,
      "type": "movie",
      "name": "Movies",
      "count": 500,
      "last_accessed": 1640995200,
      "total_plays": 10000
    },
    {
      "section_id": 2,
      "type": "show",
      "name": "TV Shows",
      "count": 250,
      "last_accessed": 1643673600,
      "total_plays": 5000
    }
  ]'
          `.trim(),
          pythonRequest: `
  import requests
  import json
  
  payload = [
      {
          "section_id": 1,
          "type": "movie",
          "name": "Movies",
          "count": 500,
          "last_accessed": 1640995200,
          "total_plays": 10000
      },
      {
          "section_id": 2,
          "type": "show",
          "name": "TV Shows",
          "count": 250,
          "last_accessed": 1643673600,
          "total_plays": 5000
      }
  ]
  
  response = requests.post(
      '${baseUrl}/api/sections', 
      headers={'Content-Type': 'application/json'},
      data=json.dumps(payload)
  )
  result = response.json()
          `.trim(),
          javascriptFetch: `
  const payload = [
    {
      section_id: 1,
      type: "movie",
      name: "Movies",
      count: 500,
      last_accessed: 1640995200,
      total_plays: 10000
    },
    {
      section_id: 2,
      type: "show",
      name: "TV Shows",
      count: 250,
      last_accessed: 1643673600,
      total_plays: 5000
    }
  ];
  
  fetch('${baseUrl}/api/sections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(result => console.log(result));
          `.trim(),
        },
      ],
      payload: [
        {
          section_id: 1,
          type: "movie",
          name: "Movies",
          count: 500,
          last_accessed: 1640995200,
          total_plays: 10000,
        },
      ],
      example: {
        success: true,
        total: 1,
        sections: [
          {
            section_id: 1,
            type: "movie",
            name: "Movies",
            count: 500,
            total_plays: 10000,
            last_accessed: 1640995200,
          },
        ],
        message: "Successfully saved sections",
      },
    },
    {
      endpoint: "/api/config",
      description: "Update Plex and Tautulli server configurations.",
      requestExamples: [
        {
          description: "Update server configurations",
          curlCommand: `
  curl -X POST ${baseUrl}/api/config \\
       -H "Content-Type: application/json" \\
       -d '{
    "plexUrl": "http://localhost:32400",
    "plexToken": "your_plex_token",
    "tautulliUrl": "http://localhost:8181",
    "tautulliApiKey": "your_tautulli_api_key"
  }'
          `.trim(),
          pythonRequest: `
  import requests
  import json
  
  payload = {
      "plexUrl": "http://localhost:32400",
      "plexToken": "your_plex_token",
      "tautulliUrl": "http://localhost:8181",
      "tautulliApiKey": "your_tautulli_api_key"
  }
  
  response = requests.post(
      '${baseUrl}/api/config', 
      headers={'Content-Type': 'application/json'},
      data=json.dumps(payload)
  )
  result = response.json()
          `.trim(),
          javascriptFetch: `
  const payload = {
    plexUrl: "http://localhost:32400",
    plexToken: "your_plex_token",
    tautulliUrl: "http://localhost:8181",
    tautulliApiKey: "your_tautulli_api_key"
  };
  
  fetch('${baseUrl}/api/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(result => console.log(result));
          `.trim(),
        },
      ],
      payload: {
        plexUrl: "http://localhost:32400",
        plexToken: "your_plex_token",
        tautulliUrl: "http://localhost:8181",
        tautulliApiKey: "your_tautulli_api_key",
      },
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
  ];

  return (
    <div className="space-y-8">
      {/* Server Configuration Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaServer className="text-accent-base text-xl" />
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
          <span className="text-sm font-medium text-theme-muted">
            {serverStatus === "active"
              ? "Server Active"
              : serverStatus === "inactive"
              ? "Server Inactive"
              : "Server Error"}
          </span>
        </div>
      </div>
      <ThemedCard>
        <div className="space-y-2">
          <label className="block text-theme font-medium">API Server URL</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaKey className="text-theme-muted" />
            </div>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              className="w-full bg-gray-900/50 text-white border border-gray-700/50 rounded-lg pl-10 pr-4 py-3
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                transition-all duration-200"
              placeholder="API Endpoint URL"
            />
          </div>
        </div>
      </ThemedCard>

      {/* Tabs for GET and POST Endpoints */}
      <div className="flex gap-2 mb-4">
        <SubTabButton
          active={activeTab === "get"}
          onClick={() => setActiveTab("get")}
        >
          GET Endpoints
        </SubTabButton>
        <SubTabButton
          active={activeTab === "post"}
          onClick={() => setActiveTab("post")}
        >
          POST Endpoints
        </SubTabButton>
      </div>

      {/* Endpoints Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {activeTab === "get" ? "GET" : "POST"} Endpoints
          </h2>
          <div className="px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
            <span className="text-sm font-medium text-theme-muted">
              {activeTab === "get"
                ? `${GET_ENDPOINTS.length} Endpoints`
                : `${POST_ENDPOINTS.length} Endpoints`}
            </span>
          </div>
        </div>
        <div className="space-y-4">
          {activeTab === "get"
            ? GET_ENDPOINTS.map((endpoint, index) => (
                <EndpointCard
                  key={index}
                  {...endpoint}
                  baseUrl={baseUrl}
                  method="GET"
                />
              ))
            : POST_ENDPOINTS.map((endpoint, index) => (
                <EndpointCard
                  key={index}
                  {...endpoint}
                  baseUrl={baseUrl}
                  method="POST"
                />
              ))}
        </div>
      </div>
    </div>
  );
};

export default ApiEndpoints;
