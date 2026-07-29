"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-8 rounded-sm border border-line bg-bg-elevated" />;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-sm",
        "border border-line bg-bg-elevated text-text-muted",
        "transition-colors duration-fast ease-out hover:bg-soft hover:text-text-primary",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
      )}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
