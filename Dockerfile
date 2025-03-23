# Use an official Node runtime as the base image
FROM node:23-alpine

LABEL maintainer="cyb3rgh05t"
LABEL org.opencontainers.image.source="https://github.com/cyb3rgh05t/plex-tautulli-dashboard"

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Copy release.js (needed for the version update script)
COPY release.js ./

# Copy the update-version script
COPY update-release.js ./

# Install project dependencies
RUN npm install

# Update package.json with the correct version from release.js
# Set NODE_ENV based on build arg (default to development)
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
RUN node update-release.js

# Copy the rest of the application code
COPY . .

# Expose the ports the app runs on
EXPOSE 3005 3006

# Install concurrently to run multiple commands
RUN npm install -g concurrently

# Command to run the application (using appropriate npm script based on NODE_ENV)
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then npm run dev; else npm run start; fi"]