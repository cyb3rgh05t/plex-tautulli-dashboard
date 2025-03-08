/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable dark mode with class strategy
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Base color palette - used by all themes
        brand: {
          primary: {
            50: "var(--color-primary-50)",
            100: "var(--color-primary-100)",
            200: "var(--color-primary-200)",
            300: "var(--color-primary-300)",
            400: "var(--color-primary-400)",
            500: "var(--color-primary-500)", // Main brand color
            600: "var(--color-primary-600)",
            700: "var(--color-primary-700)",
            800: "var(--color-primary-800)",
            900: "var(--color-primary-900)",
          },
          secondary: {
            50: "var(--color-secondary-50)",
            100: "var(--color-secondary-100)",
            200: "var(--color-secondary-200)",
            300: "var(--color-secondary-300)",
            400: "var(--color-secondary-400)",
            500: "var(--color-secondary-500)", // Main secondary color
            600: "var(--color-secondary-600)",
            700: "var(--color-secondary-700)",
            800: "var(--color-secondary-800)",
            900: "var(--color-secondary-900)",
          },
          neutral: {
            50: "var(--color-neutral-50)",
            100: "var(--color-neutral-100)",
            200: "var(--color-neutral-200)",
            300: "var(--color-neutral-300)",
            400: "var(--color-neutral-400)",
            500: "var(--color-neutral-500)",
            600: "var(--color-neutral-600)",
            700: "var(--color-neutral-700)",
            800: "var(--color-neutral-800)",
            900: "var(--color-neutral-900)",
          },
        },
        // Background and text colors - overridden by themes
        dark: {
          50: "#171923",
          100: "#2d3748",
          200: "#4a5568",
          300: "#718096",
          400: "#a0aec0",
          500: "#cbd5e0",
          600: "#e2e8f0",
          700: "#edf2f7",
          800: "#f7fafc",
          900: "#ffffff",
        },
        // Theme CSS variables integration
        theme: {
          bg: "var(--main-bg-color)",
          modal: "var(--modal-bg-color)",
          text: "var(--text)",
          muted: "var(--text-muted)",
          hover: "var(--text-hover)",
          button: "var(--button-color)",
          buttonHover: "var(--button-color-hover)",
        },
        accent: {
          base: "rgb(var(--accent-color))",
          hover: "var(--accent-color-hover)",
          light: "rgba(var(--accent-color), 0.2)",
          dark: "rgba(var(--accent-color), 0.8)",
        },
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(to right, #0070f3, #5200f3, #8c4dff)",
        "gradient-dark": "linear-gradient(to right, #171923, #2d3748, #4a5568)",
        "gradient-accent": "var(--overseerr-gradient)",
        modal: "var(--modal-bg-color)",
        main: "var(--main-bg-color)",
      },
      boxShadow: {
        "brand-lg":
          "0 10px 25px -5px rgba(0, 112, 243, 0.2), 0 5px 15px -5px rgba(82, 0, 243, 0.1)",
        "brand-xl":
          "0 15px 35px -5px rgba(0, 112, 243, 0.3), 0 10px 20px -5px rgba(82, 0, 243, 0.2)",
        "accent-sm": "0 1px 2px 0 rgba(var(--accent-color), 0.05)",
        "accent-md":
          "0 4px 6px -1px rgba(var(--accent-color), 0.1), 0 2px 4px -1px rgba(var(--accent-color), 0.06)",
        "accent-lg":
          "0 10px 15px -3px rgba(var(--accent-color), 0.1), 0 4px 6px -2px rgba(var(--accent-color), 0.05)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      // For themed border colors
      borderColor: {
        accent: "rgba(var(--accent-color), 0.3)",
        "accent-hover": "rgba(var(--accent-color), 0.5)",
      },
      ringColor: {
        accent: "rgba(var(--accent-color), 0.5)",
      },
    },
  },
  plugins: [],
  safelist: [
    // Accent text colors
    "text-accent-base",
    "text-accent-hover",
    "hover:text-accent-base",
    "hover:text-accent-hover",

    // Accent backgrounds
    "bg-accent-base",
    "bg-accent-light",
    "bg-accent-light/5",
    "bg-accent-light/10",
    "bg-accent-light/15",
    "bg-accent-light/20",
    "bg-accent-light/30",
    "hover:bg-accent-base",
    "hover:bg-accent-light",
    "hover:bg-accent-light/10",
    "hover:bg-accent-light/30",

    // Accent borders
    "border-accent",
    "border-accent/20",
    "border-accent/30",
    "hover:border-accent",
    "hover:border-accent/30",

    // Accent shadows
    "shadow-accent-lg",
    "hover:shadow-accent-lg",

    // Commonly used color classes that might be getting purged
    "text-theme",
    "text-theme-muted",
    "text-accent",
    "border-accent",
    "bg-modal",

    "checked:bg-accent",
    "checked:border-accent",
    "focus:ring-accent",
    "focus:ring-accent/50",
  ],
};
