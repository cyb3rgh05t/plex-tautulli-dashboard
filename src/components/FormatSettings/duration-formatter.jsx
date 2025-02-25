/**
 * Formats a duration value into a human-readable format
 * Handles various input formats (milliseconds, seconds, or formatted strings)
 *
 * @param {number|string} durationMs - Duration in ms, seconds, or formatted string
 * @returns {string} Formatted duration string (e.g., "1h 30m" or "45m")
 */
export const formatDuration = (durationMs) => {
  // Ensure we have a valid input
  if (!durationMs) return "0m";

  let duration;

  // Handle string inputs that might already be formatted (e.g., "45m")
  if (typeof durationMs === "string") {
    // If it's already in the format we want (e.g., "45m" or "1h 30m"), return it
    if (/^\d+h( \d+m)?$|^\d+m$/.test(durationMs.trim())) {
      return durationMs.trim();
    }

    // If it's a number in string format, parse it
    duration = Number(durationMs);
  } else {
    duration = Number(durationMs);
  }

  // If duration is invalid or 0, return "0m"
  if (isNaN(duration) || duration <= 0) return "0m";

  // If duration is in seconds (common for Plex/Tautulli), convert to milliseconds
  // Heuristic: if duration is less than 10000 and greater than 0, it's likely in seconds
  if (duration > 0 && duration < 10000) {
    duration *= 1000;
  }

  // Convert milliseconds to minutes
  const totalMinutes = Math.floor(duration / 60000);

  // Calculate hours and remaining minutes
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Format the output
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};
