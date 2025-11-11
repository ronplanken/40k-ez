"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="army-list-output"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Formatted Output
        </label>
        {value && (
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
              copied
                ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                : "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500"
            )}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        )}
      </div>
      <div
        className={cn(
          "w-full min-h-64 px-4 py-3 rounded-lg",
          "bg-gray-50 dark:bg-gray-900",
          "border border-gray-300 dark:border-gray-700",
          "text-gray-900 dark:text-gray-100",
          "font-mono text-sm whitespace-pre-wrap"
        )}
      >
        {value || (
          <span className="text-gray-400 dark:text-gray-500 italic">
            Your formatted army list will appear here...
          </span>
        )}
      </div>
    </div>
  );
}
