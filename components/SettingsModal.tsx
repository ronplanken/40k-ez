"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OptionsPanel } from "./OptionsPanel";
import type { DisplayOptions } from "@/lib/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: DisplayOptions;
  onChange: (options: DisplayOptions) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  options,
  onChange,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "bg-white dark:bg-gray-800",
          "rounded-t-2xl shadow-2xl",
          "max-h-[80vh] overflow-y-auto",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Display Settings
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-lg",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500"
            )}
            aria-label="Close settings"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <OptionsPanel options={options} onChange={onChange} />
        </div>
      </div>
    </>
  );
}
