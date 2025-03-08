import React, { useEffect } from "react";

const LoadingScreen = ({ message = "Loading Dashboard" }) => {
  // Make sure we're in a browser environment before manipulating DOM
  useEffect(() => {
    // Safe DOM manipulation that only runs on the client side
    const bodyElement = document.body;
    if (bodyElement) {
      // Apply loading state styles directly to body
      bodyElement.style.overflow = "hidden";

      return () => {
        // Clean up when component unmounts
        bodyElement.style.overflow = "";
      };
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-theme flex items-center justify-center">
      <div className="relative">
        {/* Background blur effect */}
        <div className="absolute inset-0 bg-theme-modal backdrop-blur-xl rounded-2xl" />

        {/* Content */}
        <div className="relative px-12 py-8 text-center">
          {/* Primary loader */}
          <div className="relative mb-6">
            {/* Outer ring - using accent color */}
            <div className="w-16 h-16 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />

            {/* Inner ring */}
            <div className="absolute inset-0 m-2 rounded-full border-2 border-accent/20 border-t-accent animate-spin animate-delay-150" />

            {/* Center dot */}
            <div className="absolute inset-0 m-7 rounded-full bg-accent-lighter animate-pulse" />
          </div>

          {/* Text content */}
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">
            {message}
          </h2>

          <p className="text-theme-muted text-sm max-w-sm">
            Please wait while we connect to your services...
          </p>

          {/* Loading dots */}
          <div className="flex justify-center gap-1 mt-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-accent animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
