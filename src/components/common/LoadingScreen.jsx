import React from "react";

const LoadingScreen = ({ message = "Loading Dashboard" }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-[radial-gradient(at_0%_0%,rgba(0,112,243,0.1)_0px,transparent_50%),radial-gradient(at_98%_100%,rgba(82,0,243,0.1)_0px,transparent_50%)] flex items-center justify-center">
      <div className="relative">
        {/* Background blur effect */}
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-xl rounded-2xl" />

        {/* Content */}
        <div className="relative px-12 py-8 text-center">
          {/* Primary loader */}
          <div className="relative mb-6">
            {/* Outer ring */}
            <div className="w-16 h-16 rounded-full border-2 border-brand-primary-500/20 border-t-brand-primary-500 animate-spin" />

            {/* Inner ring */}
            <div className="absolute inset-0 m-2 rounded-full border-2 border-brand-secondary-500/20 border-t-brand-secondary-500 animate-spin animate-delay-150" />

            {/* Center dot */}
            <div className="absolute inset-0 m-7 rounded-full bg-white/10 animate-pulse" />
          </div>

          {/* Text content */}
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-brand-primary-400 to-brand-secondary-400 bg-clip-text text-transparent mb-3">
            {message}
          </h2>

          <p className="text-gray-400 text-sm max-w-sm">
            Please wait while we connect to your services...
          </p>

          {/* Loading dots */}
          <div className="flex justify-center gap-1 mt-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-brand-primary-500 animate-pulse"
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
