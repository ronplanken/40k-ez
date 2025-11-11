"use client";

import { Clipboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArmyListInputProps {
  value: string;
  onChange: (value: string) => void;
  onSettingsClick?: () => void;
}

export function ArmyListInput({ value, onChange, onSettingsClick }: ArmyListInputProps) {
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      alert("Failed to read clipboard. Please paste manually.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="army-list-input"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Army List Input
        </label>
        <div className="flex items-center gap-2">
          {/* Settings button - only visible on mobile/tablet */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md lg:hidden",
                "bg-gray-600 text-white hover:bg-gray-700",
                "transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          )}
          {/* Paste button */}
          <button
            onClick={handlePaste}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md",
              "bg-blue-600 text-white hover:bg-blue-700",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            )}
          >
            <Clipboard className="h-4 w-4" />
            Paste
          </button>
        </div>
      </div>
      <textarea
        id="army-list-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your army list here...&#10;&#10;Example:&#10;Space Marines - Gladius Strike Force&#10;3x Intercessor Squad - 100pts&#10;Captain [Power Sword, Storm Shield] - 80pts&#10;Dreadnought [Assault Cannon] - 150pts&#10;Total: 330pts"
        className={cn(
          "w-full h-64 px-4 py-3 rounded-lg",
          "bg-white dark:bg-gray-800",
          "border border-gray-300 dark:border-gray-700",
          "text-gray-900 dark:text-gray-100",
          "placeholder-gray-500 dark:placeholder-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "resize-y font-mono text-sm"
        )}
      />
    </div>
  );
}
