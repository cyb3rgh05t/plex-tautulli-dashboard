# Full Changelog

All notable changes to the Plex & Tautulli Dashboard will be documented in this file.

## [2.4.1] - 2025-04-12

### Fixed

- Theme Selection State on Browser reload

## [2.4.0] - 2025-04-12

### Added

- New Cyberpunk theme with neon purple and yellow styling
- Extended theme system with new theme selector component
- Global preloader with visual feedback during initial data fetching
- Background poster cache management system
- Media content monitoring to detect newly added library items
- Improved dashboard refresh system with fast path option
- Enhanced error handling throughout the application
- New connection status indicators in the dashboard footer
- "Select All" and "Deselect All" options for library selection

### Changed

- Upgraded React to version 18.2.0
- Improved theme application and color handling for better visual consistency
- Enhanced API responses with proper cache metadata
- Optimized image loading and caching processes
- More responsive layout on various screen sizes
- Better section-based data organization
- Improved theme accessibility with better contrast in all themes

### Fixed

- Issues with poster cache not persisting across sessions
- Connection status detection reliability
- Theme switching inconsistencies
- Layout issues in various theme configurations
- User activity status display problems
- Configuration management edge cases
- Issues with recently added media sometimes not displaying correctly

## [2.3.0] - 2025-03-25

### Added

- Support for high-resolution posters and artwork
- Background caching for faster media loading
- Connection status monitoring with real-time updates
- Enhanced proxy timeouts for slower network connections

### Changed

- Improved error handling for API interactions
- Better visualization of playback progress
- Updated notification system for better user feedback
- More consistent layout across themes

### Fixed

- Issue with libraries not saving correctly
- Poster image corruption in certain scenarios
- Connection timeout problems with remote Plex servers
- Theme persistence issues on browser reload

## [2.2.0] - 2025-03-05

### Added

- Five new theme options including Nord, Hotline, and Aquamarine
- User-specific content formatting options
- Enhanced library statistics
- Bulk actions for library management
- Background metadata synchronization

### Changed

- Reimplemented theme system for better theme switching
- Improved performance for user statistics
- Modernized UI with new card designs
- More reliable data fetching and caching

### Fixed

- Various styling inconsistencies between themes
- Media type detection in some edge cases
- User data not refreshing properly in some situations
- Library filtering reliability issues

## [2.1.0] - 2025-03-01

### Added

- Custom format creator for all data types
- Template variable system with preview capabilities
- More accent color options
- Config backup and restore functionality
- Cache management tools

### Changed

- Improved dashboard loading performance
- Better responsive design for mobile devices
- Enhanced error reporting and logging
- More organized settings interface

### Fixed

- Caching issues causing stale data
- Theme application on startup
- Form validation in configuration screens
- Various UI layout issues on small screens

## [2.0.0] - 2025-02-25

### Added

- Complete rewrite with React and modern component architecture
- Dark theme with selectable accent colors
- Real-time activity monitoring
- Recently added media browsing by section
- Detailed user statistics and activity tracking
- Comprehensive API documentation
- Docker support for easy deployment

### Changed

- New interface design focusing on usability
- Modern component architecture for better extensibility
- Improved data visualization
- More efficient caching and data management

### Removed

- Legacy PHP backend components
- Outdated visualization libraries
- Manual refresh requirements

## [1.0.0] - 2025-02-21

### Added

- Initial release
- Basic Plex server monitoring
- Simple Tautulli integration
- Activity dashboard
- User tracking
- Basic theming
