import React from "react";

/**
 * A customizable button component that matches the navbar style with dark background and colored text
 * Uses the current accent color from CSS variables
 */
const ThemedButton = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  disabled = false,
  icon: Icon,
  iconRight = false,
  ...props
}) => {
  // Size classes
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  // Text and icon colors based on variant
  const variantColors = {
    primary: "text-accent-base", // Uses CSS variable for accent color
    secondary: "text-[#7952e4]",
    accent: "text-accent-base", // Uses CSS variable for accent color
    danger: "text-red-500",
    ghost: "text-gray-400 hover:text-white",
  };

  // Common background for all buttons (dark semi-transparent)
  const baseBackground = "bg-accent-light text-accent-base";

  // Combine all classes
  const buttonClasses = `
    ${baseBackground}
    ${variantColors[variant]}
    rounded-lg font-medium transition-all duration-200
    inline-flex items-center justify-center gap-2
    focus:outline-none border border-accent/20
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${className}
  `;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
      {...props}
    >
      {Icon && !iconRight && (
        <Icon
          size={size === "sm" ? 14 : size === "lg" ? 20 : 16}
          className={variantColors[variant]}
        />
      )}
      {children}
      {Icon && iconRight && (
        <Icon
          size={size === "sm" ? 14 : size === "lg" ? 20 : 16}
          className={variantColors[variant]}
        />
      )}
    </button>
  );
};

export default ThemedButton;
