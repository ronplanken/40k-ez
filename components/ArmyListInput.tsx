"use client";

import { useState, useRef, useEffect } from "react";
import { Clipboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArmyListInputProps {
  value: string;
  onChange: (value: string) => void;
  onSettingsClick?: () => void;
}

export function ArmyListInput({ value, onChange, onSettingsClick }: ArmyListInputProps) {
  const [showPasteHint, setShowPasteHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = async () => {
    // First, try the Clipboard API (works in Chrome/Edge without issues)
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const text = await navigator.clipboard.readText();
        onChange(text);
        return; // Success! Exit early
      } catch (err) {
        // Clipboard API failed (likely Firefox or permission denied)
        console.log("Clipboard API not available or denied, falling back to manual paste");
      }
    }

    // Fallback: Focus textarea and show instruction for manual paste
    textareaRef.current?.focus();
    textareaRef.current?.select();
    setShowPasteHint(true);

    // Auto-hide hint after 5 seconds
    setTimeout(() => setShowPasteHint(false), 5000);
  };

  // Hide hint when user pastes successfully
  useEffect(() => {
    const handlePasteEvent = () => {
      setShowPasteHint(false);
    };

    const textarea = textareaRef.current;
    textarea?.addEventListener('paste', handlePasteEvent);

    return () => {
      textarea?.removeEventListener('paste', handlePasteEvent);
    };
  }, []);

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
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="army-list-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your army list here..."
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
        {/* Paste instruction hint - shown when clipboard API fails */}
        {showPasteHint && (
          <div className={cn(
            "absolute top-2 left-1/2 -translate-x-1/2",
            "px-4 py-2 rounded-lg shadow-lg",
            "bg-blue-600 text-white text-sm font-medium",
            "animate-in fade-in slide-in-from-top-2 duration-200",
            "pointer-events-none z-10"
          )}>
            Press Ctrl+V (⌘+V on Mac) to paste
          </div>
        )}
      </div>
    </div>
  );
}
