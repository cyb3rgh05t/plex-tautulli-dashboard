import React from "react";
import { useTheme } from "../../context/ThemeContext";

/**
 * A reusable card component that respects the current theme
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.title - Card title (optional)
 * @param {string} props.className - Additional CSS classes (optional)
 * @param {boolean} props.isInteractive - Whether the card should have hover effects (optional)
 * @param {boolean} props.hasBorder - Whether the card should have a border (optional)
 * @param {boolean} props.useAccentBorder - Whether to use accent color for the border (optional)
 * @param {React.ReactNode} props.icon - Icon to display in the title (optional)
 * @param {React.ReactNode} props.action - Action button/element to display in the header (optional)
 */
const ThemedCard = ({
  children,
  title,
  className = "",
  isInteractive = false,
  hasBorder = true,
  useAccentBorder = false,
  icon: Icon,
  action,
}) => {
  // Get accent color from theme context
  const { accentColor } = useTheme();

  // Get RGB value for current accent color
  const getAccentRgb = () => {
    const accentColorMap = {
      default: "167, 139, 250",
      green: "109, 247, 81",
      purple: "166, 40, 140",
      orange: "255, 153, 0",
      blue: "0, 98, 255",
      red: "232, 12, 11",
    };

    return accentColorMap[accentColor] || accentColorMap.default;
  };

  const accentRgb = getAccentRgb();

  // Base classes for the card
  const baseClasses = "rounded-xl p-4";

  // Border classes based on props
  const borderClasses = hasBorder
    ? useAccentBorder
      ? "border"
      : "border border-gray-700/50"
    : "";

  // Interactive hover effects
  const interactiveClasses = isInteractive
    ? "hover:bg-gray-800/50 transition-all duration-200 cursor-pointer"
    : "";

  // Combine all classes
  const cardClasses = `${baseClasses} ${borderClasses} ${interactiveClasses} ${className}`;

  return (
    <div
      className={cardClasses}
      style={{
        backgroundColor: "rgba(31, 41, 55, 0.5)",
        borderColor: useAccentBorder ? `rgba(${accentRgb}, 0.5)` : undefined,
      }}
    >
      {/* Card header with title (if provided) */}
      {title && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="text-accent-base" size={18} />}
            <h3 className="font-medium text-white">{title}</h3>
          </div>
          {/* Optional action element (button, link, etc.) */}
          {action && <div>{action}</div>}
        </div>
      )}

      {/* Card content */}
      <div>{children}</div>
    </div>
  );
};

export default ThemedCard;
