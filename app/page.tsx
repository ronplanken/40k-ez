"use client";

import { useState, useEffect } from "react";
import { ArmyListInput } from "@/components/ArmyListInput";
import { ArmyListOutput } from "@/components/ArmyListOutput";
import { OptionsPanel } from "@/components/OptionsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { parseArmyList, formatArmyList } from "@/lib/parser";
import { defaultDisplayOptions, type DisplayOptions } from "@/lib/types";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [options, setOptions] = useState<DisplayOptions>(defaultDisplayOptions);

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
              40K EZ
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
              Convert your Warhammer 40K army lists to easily readable format
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Input and Options */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <ArmyListInput value={inputText} onChange={setInputText} />
            <ArmyListOutput value={outputText} />
          </div>

          {/* Right Column: Options Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <OptionsPanel options={options} onChange={setOptions} />

              {/* Future Supabase Integration Section */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Coming Soon
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Save and share your army lists with Supabase integration
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Built for the Emperor. Made with Next.js.
          </p>
        </div>
      </div>
    </div>
  );
}
