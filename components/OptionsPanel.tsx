"use client";

import { cn } from "@/lib/utils";
import type { DisplayOptions } from "@/lib/types";

interface OptionsPanelProps {
  options: DisplayOptions;
  onChange: (options: DisplayOptions) => void;
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </span>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
          checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export function OptionsPanel({ options, onChange }: OptionsPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Display Options
      </h3>
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4">
        <Toggle
          label="Condensed Format"
          description="Single-line condensed output (e.g., 3x5 Intercessors)"
          checked={options.condensedFormat}
          onChange={(checked) =>
            onChange({ ...options, condensedFormat: checked })
          }
        />
        {!options.condensedFormat && (
          <>
            <Toggle
              label="Units & Names"
              description="Show unit names and quantities"
              checked={options.showUnitsAndNames}
              onChange={(checked) =>
                onChange({ ...options, showUnitsAndNames: checked })
              }
            />
            <Toggle
              label="Points Values"
              description="Show point costs"
              checked={options.showPoints}
              onChange={(checked) =>
                onChange({ ...options, showPoints: checked })
              }
            />
            <Toggle
              label="Weapons & Wargear"
              description="Show equipment and loadouts"
              checked={options.showWeapons}
              onChange={(checked) =>
                onChange({ ...options, showWeapons: checked })
              }
            />
            <Toggle
              label="Detachment & Faction"
              description="Show army faction and detachment"
              checked={options.showDetachment}
              onChange={(checked) =>
                onChange({ ...options, showDetachment: checked })
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
