"use client";

import { useState, useRef, useEffect } from "react";
import { Clipboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BlockHeader, CARD } from "./ui/panel";

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
    <div className={CARD}>
      <BlockHeader
        label="Army List Input"
        actions={
          <>
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className={cn(BUTTON_SECONDARY, "lg:hidden")}
              >
                <Settings className="h-3.5 w-3.5" />
                Options
              </button>
            )}
            <button onClick={handlePaste} className={BUTTON_PRIMARY}>
              <Clipboard className="h-3.5 w-3.5" />
              Paste
            </button>
          </>
        }
      />
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="army-list-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your 40k app army list here..."
          className={cn(
            "h-64 w-full resize-y bg-bg-input px-4 py-3",
            "font-mono text-sm text-text-primary placeholder:text-text-muted",
            "border-0 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-accent/40"
          )}
        />
        {/* Paste instruction hint - shown when clipboard API fails */}
        {showPasteHint && (
          <div
            className={cn(
              "absolute left-1/2 top-2 -translate-x-1/2",
              "rounded-sm bg-accent px-3 py-1.5",
              "font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-bg-app",
              "pointer-events-none z-10 shadow-md"
            )}
          >
            Press Ctrl+V to paste
          </div>
        )}
      </div>
    </div>
  );
}
