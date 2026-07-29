"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BlockHeader, CARD } from "./ui/panel";

interface ArmyListOutputProps {
  value: string;
}

export function ArmyListOutput({ value }: ArmyListOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard.");
    }
  };

  return (
    <div className={CARD}>
      <BlockHeader
        label="Formatted Output"
        actions={
          value ? (
            <button
              onClick={handleCopy}
              className={copied ? BUTTON_PRIMARY : BUTTON_SECONDARY}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          ) : undefined
        }
      />
      <div
        className={cn(
          "min-h-[8rem] w-full bg-bg-input px-4 py-3",
          "whitespace-pre-wrap font-mono text-sm text-text-primary"
        )}
      >
        {value || (
          <span className="text-text-muted">
            Your formatted army list will appear here...
          </span>
        )}
      </div>
    </div>
  );
}
