# Use an official Node runtime as the base image
FROM node:20-alpine

LABEL maintainer=cyb3rgh05t
LABEL org.opencontainers.image.source https://github.com/cyb3rgh05t/plex-tautulli-dashboard

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3005 3006

# Install concurrently to run multiple commands
RUN npm install -g concurrently

# Command to run the application
CMD ["npm", "run", "dev"]