import React from "react";

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

  // Variant classes using our theme utilities
  const variantClasses = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    secondary: "bg-gray-800/50 text-white hover:bg-gray-700",
    accent: "bg-accent-light text-accent hover:bg-accent-lighter",
    outline:
      "bg-transparent border border-accent text-accent hover:bg-accent-lighter",
    ghost:
      "bg-transparent text-theme-muted hover:text-accent hover:bg-gray-800/50",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  // Combine all classes
  const buttonClasses = `
    ${variantClasses[variant] || variantClasses.primary}
    ${sizeClasses[size] || sizeClasses.md}
    rounded-lg font-medium transition-theme
    inline-flex items-center justify-center gap-2
    focus:outline-none focus-accent
    disabled:opacity-50 disabled:cursor-not-allowed
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
        <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
      )}
      <span>{children}</span>
      {Icon && iconRight && (
        <Icon size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
      )}
    </button>
  );
};

export default ThemedButton;
