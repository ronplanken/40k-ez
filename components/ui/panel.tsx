"use client";

import { cn } from "@/lib/utils";

/** The card shell every panel sits in. */
export const CARD = "rounded-sm border border-line bg-bg-card overflow-hidden";

export const BUTTON_PRIMARY = cn(
  "inline-flex items-center gap-2 rounded-sm bg-accent px-3 py-1.5",
  "text-xs font-semibold uppercase tracking-[0.12em] text-bg-app",
  "transition-colors duration-fast ease-out hover:bg-accent-hover",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
);

export const BUTTON_SECONDARY = cn(
  "inline-flex items-center gap-2 rounded-sm border border-line-strong px-3 py-1.5",
  "text-xs font-medium uppercase tracking-[0.12em] text-text-secondary",
  "transition-colors duration-fast ease-out hover:bg-soft hover:text-text-primary",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
);

/** The tiny uppercase label that heads a field or a block. */
export const MICRO_LABEL =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-text-primary";

/**
 * The tinted band above a card's rows, with the accent bar that marks a
 * section in the streamer app.
 */
export function BlockHeader({
  label,
  actions,
}: {
  label: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line bg-bg-elevated px-4 py-2.5">
      <span
        aria-hidden
        className="h-[13px] w-[3px] shrink-0 rounded-[1px] bg-accent"
      />
      <span className={cn(MICRO_LABEL, "truncate")}>{label}</span>
      {actions != null && (
        <span className="ml-auto flex shrink-0 items-center gap-2">{actions}</span>
      )}
    </div>
  );
}

interface ToggleSwitchProps {
  on: boolean;
  onToggle: () => void;
  ariaLabel: string;
  size?: "sm" | "md";
}

/**
 * The switch used on every options row. It carries `shrink-0` itself, so it
 * keeps its width no matter how long the label beside it runs.
 */
export function ToggleSwitch({
  on,
  onToggle,
  ariaLabel,
  size = "md",
}: ToggleSwitchProps) {
  const track = size === "sm" ? "w-[34px] h-[18px]" : "w-[44px] h-[24px]";
  const knob = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  // Only one translate-x utility may be applied at a time, they share a
  // custom property.
  const knobTranslate = on
    ? size === "sm"
      ? "translate-x-[17px]"
      : "translate-x-5"
    : "translate-x-0";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={cn(
        "relative shrink-0 rounded-full border transition-colors duration-normal ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card",
        track,
        on ? "border-transparent bg-accent" : "border-border bg-line-strong"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-white",
          "shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-normal ease-out",
          knob,
          knobTranslate
        )}
      />
    </button>
  );
}

/**
 * A labelled row with its control on the right. The text column is `min-w-0`
 * so it wraps instead of pushing the control out of the row.
 */
export function OptionRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-xs text-text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
