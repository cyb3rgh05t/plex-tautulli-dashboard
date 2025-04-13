import React from "react";

/**
 * SVG Logo component based on the project's favicon
 * @param {Object} props
 * @param {number} props.size - Size of the logo in pixels
 * @param {string} props.className - Additional classes to apply
 * @param {string} props.fillColor - Background fill color (default is #1f2937)
 * @param {string} props.strokeColor - Path stroke color (default is #60a5fa)
 */
const Logo = ({
  size = 32,
  className = "",
  fillColor = "#1f2937",
  strokeColor = "#60a5fa",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <rect width="32" height="32" fill={fillColor} />
      <path
        d="M6 16 L12 22 L20 10 L26 16"
        stroke={strokeColor}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Logo;
