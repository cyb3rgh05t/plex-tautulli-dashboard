# Plex & Tautulli Dashboard

![Version](https://img.shields.io/badge/version-2.2.0-blue)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB)
![License](https://img.shields.io/badge/license-MIT-green)

A modern, customizable dashboard for monitoring Plex Media Server and Tautulli statistics. This project provides a clean interface to view Plex activities, recently added media, user statistics, and more, all with customizable formatting options.

![Dashboard Preview](https://via.placeholder.com/800x450/111827/FFFFFF?text=Plex+%26+Tautulli+Dashboard)

## 🚀 Features

- **Real-time Plex Activity Monitoring**: View current downloads, transcodes, and streams
- **Recently Added Media**: Browse recently added movies, TV shows, and music with customizable display formats
- **User Statistics**: Track user viewing habits, watch time, and activity
- **Library Management**: Select which Plex libraries to display in your dashboard
- **Custom Format Templates**: Create personalized formatting for how media and statistics are displayed
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Interface**: Easy on the eyes with a modern dark theme

## 🛠️ Installation

### Prerequisites

- Node.js (v14 or newer)
- Plex Media Server with a valid Plex Token
- Tautulli installed and configured with API Key

### Setup

1. Clone the repository:

```bash
git clone https://github.com/cyb3rgh05t/plex-tautulli-dashboard.git
cd plex-tautulli-dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following content (customize as needed):

```bash
TZ=Europe/Berlin
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3005
PORT=3006
VITE_BACKEND_URL=http://localhost:3006
VITE_API_BASE_URL=http://localhost:3006
PROXY_TIMEOUT=30000
PROXY_READ_TIMEOUT=30000
PROXY_WRITE_TIMEOUT=30000
```

4. Start the development server:

```bash
npm run dev
```

This will start both the frontend (port 3005) and backend (port 3006) servers concurrently.

## 🔧 Configuration

On first run, you'll be presented with a setup wizard that requires:

1. **Plex Server URL**: The full URL to your Plex Media Server (e.g., `http://your-plex-server:32400`)
2. **Plex Token**: Your authentication token for Plex API access
3. **Tautulli URL**: The full URL to your Tautulli instance (e.g., `http://your-tautulli-server:8181`)
4. **Tautulli API Key**: Your Tautulli API key for authentication

### How to find your Plex Token

1. Log in to Plex Web App
2. Open any media item
3. Click the ⋮ (three dots) menu
4. Select "Get Info"
5. Open browser developer tools (F12)
6. Go to the Network tab
7. Look for API requests to Plex - the `X-Plex-Token` parameter will be visible in the request URL

### How to find your Tautulli API Key

1. Open Tautulli web interface
2. Go to Settings > Web Interface
3. In the "API" section, you'll find your API key

## 📋 Usage

### Dashboard Navigation

The dashboard is organized into several tabs:

- **Plex Activities**: Real-time view of current downloads and streams
- **Recently Added**: Browse your most recently added media
- **Libraries**: Select which Plex libraries to display on your dashboard
- **Users**: View user statistics and activity
- **Format Settings**: Customize how media information is displayed
- **API Endpoints**: Documentation for available API endpoints

### Custom Formatting

One of the key features of this dashboard is the ability to create custom formats for displaying information. You can create templates with variables specific to:

- **Downloads**: Format how download activities are displayed
- **Recently Added Media**: Customize how movies, TV shows, and music appear
- **Users**: Format how user activity is displayed
- **Sections**: Format how Sections is displayed

For example, you could create a TV show format like:

```bash
{grandparent_title} S{parent_media_index}E{media_index} - {title} ({addedAt:relative})
```

Which would display as:

```bash
Breaking Bad S05E07 - Say My Name (2 days ago)
```

## 🌐 API Endpoints

The dashboard includes a full-featured API that can be accessed by other applications:

- `GET /api/downloads`: Get all current Plex downloads
- `GET /api/formats`: Get all configured format templates
- `GET /api/sections`: Get all saved library sections
- `GET /api/users`: Get users with activity information
- `GET /api/recent/:type`: Get recently added media (movies, shows, music)
- `GET /api/media/:type`: Get section stats (movies, shows, music)
- `GET /api/libraries`: Get all Plex libraries
- `GET /api/config`: Get server configuration
- `POST /api/formats`: Save format templates
- `POST /api/sections`: Save selected library sections
- `POST /api/config`: Update server configuration
- `POST /api/reset-all`: Reset all configurations

## 🔄 Building for Production

To build the application for production:

```bash
npm run build
```

This will create optimized production builds in the `dist` directory.

## 🚢 Deployment

### Docker (Recommended)

A Docker image is available on Docker Hub:

```bash
docker pull cyb3rgh05t/plex-tautulli-dashboard:latest
```

```yaml
version: "3"
services:
  plex-tautulli-dashboard:
    image: cyb3rgh05t/plex-tautulli-dashboard:latest
    container_name: plex-tautulli-dashboard
    ports:
      - "3005:3005"
      - "3006:3006"
    environment:
      - TZ=Europe/Berlin
      - NODE_ENV=production
      - ALLOWED_ORIGINS=http://your-server-ip:3005
      - PORT=3006
      - VITE_BACKEND_URL=http://your-server-ip:3006
      - VITE_API_BASE_URL=http://your-server-ip:3006
    volumes:
      - ./configs:/app/src/utils/configs
    restart: unless-stopped
```

### Manual Deployment

1. Build the application as described above
2. Set up a web server (nginx, Apache) to serve the static files from the `dist` directory
3. Configure the server to proxy API requests to the Node.js backend

## 📚 Tech Stack

- **Frontend**: React, TailwindCSS, Vite, React Query
- **Backend**: Node.js, Express
- **APIs**: Plex API, Tautulli API

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Plex](https://www.plex.tv/) for their amazing media server
- [Tautulli](https://tautulli.com/) for their Plex monitoring tool
- [React](https://reactjs.org/) and [Vite](https://vitejs.dev/) for the frontend framework
- [TailwindCSS](https://tailwindcss.com/) for the styling
- [Lucide React](https://lucide.dev/) for the icons

---

Created with ❤️ by [cyb3rgh05t](https://github.com/cyb3rgh05t) for the Plex an Tautulli Community.
