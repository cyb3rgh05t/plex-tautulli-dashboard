import React from "react";
import { Link, useLocation } from "react-router-dom";

const ThemedTab = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors
        ${
          isActive
            ? "bg-accent-light text-accent border border-accent/20"
            : "text-gray-400 hover:text-white hover:bg-gray-700/50"
        }`}
    >
      {Icon && <Icon size={20} className={isActive ? "text-accent" : ""} />}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default ThemedTab;
