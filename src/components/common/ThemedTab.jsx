import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * A tab button component that changes color based on the current accent theme
 * @param {Object} props
 * @param {string} props.to - Route to navigate to
 * @param {React.ReactNode} props.icon - Icon to display
 * @param {string} props.label - Tab label text
 */
const ThemedTab = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-accent-light text-accent-base border border-accent/20"
          : "text-gray-400 hover:text-white hover:bg-gray-700/50"
      }`}
    >
      {Icon && (
        <Icon size={20} className={isActive ? "text-accent-base" : ""} />
      )}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default ThemedTab;
