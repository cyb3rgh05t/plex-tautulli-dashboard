import React from "react";

const ThemedCard = ({
  children,
  title,
  icon: Icon,
  action,
  isInteractive = false,
  useAccentBorder = true,
  className = "",
}) => {
  // Build card classes
  const cardClasses = `
    rounded-xl p-4 relative overflow-hidden
    bg-gray-900/50
    ${useAccentBorder ? "border border-accent" : "border border-gray-700/50"}
    ${
      isInteractive
        ? "hover:bg-gray-800/50 hover:shadow-accent transition-theme"
        : ""
    }
    ${className}
  `;

  return (
    <div className={cardClasses}>
      {/* Accent gradient top border */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-accent"></div>

      {/* Card header with title (if provided) */}
      {title && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="text-accent" size={18} />}
            <h3 className="font-medium text-white">{title}</h3>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      {/* Card content */}
      <div>{children}</div>
    </div>
  );
};

export default ThemedCard;
