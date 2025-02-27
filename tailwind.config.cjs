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
          50: "var(--color-dark-50)",
          100: "var(--color-dark-100)",
          200: "var(--color-dark-200)",
          300: "var(--color-dark-300)",
          400: "var(--color-dark-400)",
          500: "var(--color-dark-500)",
          600: "var(--color-dark-600)",
          700: "var(--color-dark-700)",
          800: "var(--color-dark-800)",
          900: "var(--color-dark-900)",
        },
      },
      backgroundImage: {
        "gradient-brand": "var(--gradient-brand)",
        "gradient-dark": "var(--gradient-dark)",
      },
      boxShadow: {
        "brand-lg": "var(--shadow-brand-lg)",
        "brand-xl": "var(--shadow-brand-xl)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
