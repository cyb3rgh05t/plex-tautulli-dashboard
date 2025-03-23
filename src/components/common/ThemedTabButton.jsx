import React from "react";

/**
 * A reusable themed tab button component that changes its styles based on the current accent color
 */
const ThemedTabButton = ({
  active,
  onClick,
  children,
  icon: Icon,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-theme
        ${
          active
            ? "tab-accent active bg-accent-light border border-accent"
            : "tab-accent text-gray-400 hover:text-white hover:bg-gray-700/50"
        }
        ${className}
      `}
    >
      {Icon && (
        <Icon className={active ? "text-accent" : "text-gray-500"} size={16} />
      )}
      {children}
    </button>
  );
};

export default ThemedTabButton;
