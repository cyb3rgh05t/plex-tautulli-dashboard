import React from "react";
import { useTheme } from "../../context/ThemeContext";
import * as Icons from "lucide-react";

// Theme option button component
const ThemeOption = ({ value, current, onChange, children, icon: Icon }) => (
  <button
    onClick={() => onChange(value)}
    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
      current === value
        ? "bg-brand-primary-500 text-white shadow-lg shadow-brand-primary-500/20"
        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
    }`}
  >
    {Icon && (
      <Icon
        className={current === value ? "text-white" : "text-gray-500"}
        size={16}
      />
    )}
    {children}
  </button>
);

// Color option component
const ColorOption = ({ color, current, onChange }) => {
  // Color mapping for display
  const colorInfo = {
    default: { label: "Default", bgClass: "bg-gray-400" },
    green: { label: "Green", bgClass: "bg-green-500" },
    purple: { label: "Purple", bgClass: "bg-purple-500" },
    orange: { label: "Orange", bgClass: "bg-orange-500" },
    blue: { label: "Blue", bgClass: "bg-blue-500" },
    red: { label: "Red", bgClass: "bg-red-500" },
  };

  const { label, bgClass } = colorInfo[color] || colorInfo.default;

  return (
    <button
      onClick={() => onChange(color)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        current === color
          ? "bg-brand-primary-500/20 border border-brand-primary-500/50 text-white"
          : "text-gray-400 hover:text-white hover:bg-gray-800/50 border border-gray-700/50"
      }`}
    >
      <div className={`w-4 h-4 rounded-full ${bgClass}`}></div>
      <span>{label}</span>
    </button>
  );
};

const ThemeSelector = () => {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Theme Mode</h3>
        <div className="flex flex-wrap gap-2">
          <ThemeOption
            value="light"
            current={theme}
            onChange={setTheme}
            icon={Icons.Sun}
          >
            Light
          </ThemeOption>
          <ThemeOption
            value="dark"
            current={theme}
            onChange={setTheme}
            icon={Icons.Moon}
          >
            Dark
          </ThemeOption>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Accent Color</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <ColorOption
            color="default"
            current={accentColor}
            onChange={setAccentColor}
          />
          <ColorOption
            color="green"
            current={accentColor}
            onChange={setAccentColor}
          />
          <ColorOption
            color="purple"
            current={accentColor}
            onChange={setAccentColor}
          />
          <ColorOption
            color="orange"
            current={accentColor}
            onChange={setAccentColor}
          />
          <ColorOption
            color="blue"
            current={accentColor}
            onChange={setAccentColor}
          />
          <ColorOption
            color="red"
            current={accentColor}
            onChange={setAccentColor}
          />
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icons.Info size={16} className="text-brand-primary-400" />
          <h4 className="text-white font-medium">Theme Preview</h4>
        </div>
        <p className="text-gray-400 mb-4">
          The selected theme is applied globally to all components and will be
          remembered across sessions.
        </p>

        {/* Theme preview elements */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-brand-primary-500 text-white rounded-lg transition-all hover:bg-brand-primary-600">
              Primary Button
            </button>
            <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg transition-all hover:bg-gray-600">
              Secondary Button
            </button>
          </div>

          <div className="p-3 bg-modal-bg-color rounded-lg border border-gray-700/50">
            <h5 className="text-white font-medium mb-2">Modal Component</h5>
            <p className="text-gray-400 text-sm">
              This is how modal backgrounds will appear.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
