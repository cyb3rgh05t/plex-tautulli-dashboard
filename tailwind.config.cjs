/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: {
            50: "#e6f1ff",
            100: "#b3d7ff",
            200: "#80bdff",
            300: "#4da3ff",
            400: "#1a89ff",
            500: "#0070f3", // Main brand blue
            600: "#0059c2",
            700: "#004291",
            800: "#002b60",
            900: "#00162f",
          },
          secondary: {
            50: "#f3e6ff",
            100: "#d1b3ff",
            200: "#ae80ff",
            300: "#8c4dff",
            400: "#6a1aff",
            500: "#5200f3", // Main brand purple
            600: "#4200c2",
            700: "#310091",
            800: "#210060",
            900: "#10002f",
          },
          neutral: {
            50: "#f9fafb",
            100: "#f3f4f6",
            200: "#e5e7eb",
            300: "#d1d5db",
            400: "#9ca3af",
            500: "#6b7280",
            600: "#4b5563",
            700: "#374151",
            800: "#1f2937",
            900: "#111827",
          },
        },
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
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(to right, #0070f3, #5200f3, #8c4dff)",
        "gradient-dark": "linear-gradient(to right, #171923, #2d3748, #4a5568)",
      },
      boxShadow: {
        "brand-lg":
          "0 10px 25px -5px rgba(0, 112, 243, 0.2), 0 5px 15px -5px rgba(82, 0, 243, 0.1)",
        "brand-xl":
          "0 15px 35px -5px rgba(0, 112, 243, 0.3), 0 10px 20px -5px rgba(82, 0, 243, 0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
