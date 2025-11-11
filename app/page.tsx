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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              EZLIST
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Convert your Warhammer 40K app army lists to easily readable format
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Input and Output */}
          <div className="lg:col-span-2 flex flex-col gap-6">
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
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <a
                href="https://game-datacards.eu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                game-datacards.eu
              </a>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <a
                href="https://gdmissions.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                gdmissions.app
              </a>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <a
                href="https://aosmissions.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                aosmissions.app
              </a>
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Built for the Emperor. Made by Shinobau
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
