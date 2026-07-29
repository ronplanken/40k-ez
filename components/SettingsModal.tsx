"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OptionsPanel } from "./OptionsPanel";
import { MICRO_LABEL } from "./ui/panel";
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
        className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "border-t border-line bg-bg-card",
          "max-h-[80vh] overflow-y-auto shadow-lg"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center gap-2.5 border-b border-line bg-bg-elevated px-4 py-2.5">
          <span
            aria-hidden
            className="h-[13px] w-[3px] shrink-0 rounded-[1px] bg-accent"
          />
          <span className={MICRO_LABEL}>Display Options</span>
          <button
            onClick={onClose}
            className={cn(
              "ml-auto rounded-sm p-1 text-text-muted",
              "transition-colors duration-fast ease-out hover:bg-soft hover:text-text-primary",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            )}
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <OptionsPanel options={options} onChange={onChange} bare />
      </div>
    </>
  );
}
