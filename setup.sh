mkdir -p plex-tautulli-dashboard/src/components/{SetupWizard,PlexActivity,RecentlyAdded,Layout,common}
mkdir -p plex-tautulli-dashboard/src/{services,utils,context,hooks,styles}
mkdir -p plex-tautulli-dashboard/public

# Move to the project directory
cd plex-tautulli-dashboard

# Initialize package.json
npm init -y

# Install dependencies
npm install react react-dom axios react-query tailwindcss@latest winston @vitejs/plugin-react vite autoprefixer postcss

# Initialize Tailwind CSS
npx tailwindcss init -p