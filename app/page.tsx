"use client";

import { useState, useEffect } from "react";
import { ArmyListInput } from "@/components/ArmyListInput";
import { ArmyListOutput } from "@/components/ArmyListOutput";
import { OptionsPanel } from "@/components/OptionsPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { parseArmyList, formatArmyList } from "@/lib/parser";
import { defaultDisplayOptions, type DisplayOptions } from "@/lib/types";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [options, setOptions] = useState<DisplayOptions>(defaultDisplayOptions);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!inputText.trim()) {
      setOutputText("");
      return;
    }

    const parsedList = parseArmyList(inputText);
    const formatted = formatArmyList(parsedList, options);
    setOutputText(formatted);
  }, [inputText, options]);

  return (
    <div className="min-h-screen bg-bg-app">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold uppercase tracking-[0.18em] text-text-primary">
              EZLIST
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              Convert your Warhammer 40K app army lists to easily readable format
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          {/* Left Column: Input and Output */}
          <div className="flex flex-col gap-3.5 lg:col-span-2">
            <ArmyListInput
              value={inputText}
              onChange={setInputText}
              onSettingsClick={() => setIsSettingsOpen(true)}
            />
            <ArmyListOutput value={outputText} />
          </div>

          {/* Right Column: Options Panel (Desktop only) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-8">
              <OptionsPanel options={options} onChange={setOptions} />
            </div>
          </div>
        </div>

        {/* Settings Modal (Mobile/Tablet only) */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          options={options}
          onChange={setOptions}
        />

        {/* Footer */}
        <div className="mt-12 border-t border-line pt-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
              {[
                ["game-datacards.eu", "https://game-datacards.eu"],
                ["gdmissions.app", "https://gdmissions.app"],
                ["aosmissions.app", "https://aosmissions.app"],
              ].map(([label, href], i) => (
                <span key={href} className="flex items-center gap-3">
                  {i > 0 && <span className="text-text-muted">/</span>}
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted transition-colors duration-fast ease-out hover:text-accent"
                  >
                    {label}
                  </a>
                </span>
              ))}
            </div>
            <p className="text-xs text-text-muted">
              Built for the Emperor. Made by Shinobau
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
