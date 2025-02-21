# Plex & Tautulli Dashboard

A web-based dashboard for monitoring and managing your Plex Media Server and Tautulli instances. This dashboard provides an intuitive interface to view Plex download activities, recently added media, library sections, user statistics, and format customization options.

## Features

- **Plex Download Activities**: Monitor active downloads and their progress with custom formatting options.
- **Recently Added Media**: View recently added movies, TV shows, and music across your library sections.
- **Library Sections**: Manage and select which library sections to include in the dashboard.
- **User Statistics**: View user activity, total plays, watch time, and last seen information.
- **Format Customization**: Customize the display formats for download activities, recently added media, and user statistics using predefined variables.
- **Setup Wizard**: Easy configuration of Plex and Tautulli server details through a user-friendly setup process.

## Prerequisites

Before running the Plex & Tautulli Dashboard, ensure you have the following:

- Node.js (version 14 or higher)
- npm (Node Package Manager)
- Plex Media Server (with a valid API token)
- Tautulli (with API access enabled)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/plex-tautulli-dashboard.git
   ```

2. Navigate to the project directory:

   ```bash
   cd plex-tautulli-dashboard
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open your web browser and visit `http://localhost:3005` to access the Plex & Tautulli Dashboard.

## Configuration

1. Upon launching the dashboard for the first time, you will be prompted with a setup wizard.

2. Enter your Plex server URL, Plex API token, Tautulli server URL, and Tautulli API key in the respective fields.

3. Click on the "Save Configuration" button to store the server details.

4. The dashboard will now connect to your Plex and Tautulli instances and display the relevant information.

## Technologies Used

The Plex & Tautulli Dashboard is built using the following technologies:

- **React**: A JavaScript library for building user interfaces.
- **Vite**: A fast build tool and development server for modern web applications.
- **Tailwind CSS**: A utility-first CSS framework for rapidly building custom user interfaces.
- **Express**: A minimal and flexible Node.js web application framework for building APIs and web servers.
- **Axios**: A promise-based HTTP client for making API requests.
- **React Query**: A powerful data fetching and caching library for React applications.
- **React Hot Toast**: A lightweight toast notification library for React.
- **React Icons**: A collection of popular icons as React components.

## Troubleshooting

If you encounter any issues while setting up or using the Plex & Tautulli Dashboard, here are some common troubleshooting steps:

- Ensure that your Plex Media Server and Tautulli instances are running and accessible.
- Double-check that you have entered the correct URLs and API keys for Plex and Tautulli in the setup wizard.
- Verify that your Plex and Tautulli API keys have the necessary permissions to access the required data.
- Check the browser console for any error messages or network issues.
- Ensure that you have the latest versions of Node.js and npm installed.
- Try clearing your browser cache and reloading the dashboard.

If the issue persists, please refer to the project's issue tracker on GitHub or reach out to the community for further assistance.

## Docker Setup

You can run the Plex & Tautulli Dashboard using Docker Compose. Here's an example `docker-compose.yml` file:

```yaml
version: "3.9"
services:
  plex-tautulli-dashboard:
    hostname: "plex-tautulli-dashboard"
    container_name: "plex-tautulli-dashboard"
    environment:
      - "TZ=Europe/berlin"
      - "NODE_ENV=production"
      - "ALLOWED_ORIGINS=" # CORS ORIGINS
      - "VITE_ALLOWED_HOSTS=all" # Allow all hosts
      - "VITE_ALLOW_ALL_HOSTS=true" # Alternative to VITE_ALLOWED_HOSTS=all
    image: "ghcr.io/cyb3rgh05t/plex-tautulli-dashboard"
    restart: "unless-stopped"
    ports:
      - "3005:3005" # frontend server
      - "3006:3006" # backend proxyserver
    volumes:
      - "/opt/appdata/plex-tautulli-dashboard:/app/src/utils/configs:rw"
```

Before running the Docker Compose setup, make sure to create the required local folders and files:

```bash
mkdir /opt/appdata/plex-tautulli-dashboard
touch /opt/appdata/plex-tautulli-dashboard/sections.json
touch /opt/appdata/plex-tautulli-dashboard/config.json
touch /opt/appdata/plex-tautulli-dashboard/formats.json
```

These files will be mounted as volumes in the Docker container and will be used to store the application data.

To start the Plex & Tautulli Dashboard using Docker Compose, run the following command in the directory containing the `docker-compose.yml` file:

```bash
docker-compose up -d
```

This will download the required Docker image and start the container in detached mode. You can then access the dashboard by visiting `http://localhost:3005` in your web browser.

To stop the container, run:

```bash
docker-compose down
```

Make sure to review and customize the `docker-compose.yml` file according to your specific requirements, such as setting the appropriate time zone, CORS origins, and port mappings.

## Local Deployment

To deploy the Plex & Tautulli Dashboard for production use, you can follow these general steps:

1. Build the optimized production version of the application:

   ```bash
   npm run build
   ```

2. The production-ready files will be generated in the `dist` directory.

3. Deploy the contents of the `dist` directory to your preferred hosting platform or server.

4. Ensure that your production environment has the necessary dependencies installed, such as Node.js and npm.

5. Start the server in production mode:

   ```bash
   npm start
   ```

6. Access the dashboard using the provided URL or domain name.

Note: The specific deployment steps may vary depending on your hosting platform or server setup. Make sure to follow the appropriate deployment guidelines for your chosen environment.

## Security Considerations

When using the Plex & Tautulli Dashboard, keep the following security considerations in mind:

- Protect your Plex and Tautulli API keys and ensure they are not publicly accessible.
- Use secure communication protocols (HTTPS) when accessing the dashboard, especially if it is exposed to the internet.
- Regularly update the project dependencies to ensure you have the latest security patches.
- Implement proper authentication and authorization mechanisms to restrict access to the dashboard and its features.
- Be cautious when sharing or exposing the dashboard to untrusted networks or users.

Remember to review and adhere to the security best practices recommended by Plex, Tautulli, and the libraries and frameworks used in this project.

## Contributing

Contributions are welcome! If you find any bugs, have feature requests, or want to contribute improvements, please open an issue or submit a pull request on the [GitHub repository](https://github.com/cyb3rgho5t/plex-tautulli-dashboard).

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Plex API](https://www.plex.tv/)
- [Tautulli API](https://tautulli.com/)

## Getting Help

If you encounter any issues or have questions about the Plex & Tautulli Dashboard, please feel free to reach out by opening an issue on the [GitHub repository](https://github.com/your-username/plex-tautulli-dashboard/issues). We'll be happy to assist you!

## Future Enhancements

Here are some potential enhancements and features that could be added to the Plex & Tautulli Dashboard in the future:

- Integration with additional Plex and Tautulli APIs for more advanced functionality.
- Customizable dashboard layouts and themes.
- Enhanced reporting and analytics features.
- Notifications and alerts for specific events or thresholds.
- Multi-user support with role-based access control.
- Mobile-friendly responsive design.

Feel free to contribute your ideas and suggestions to make the Plex & Tautulli Dashboard even better!
