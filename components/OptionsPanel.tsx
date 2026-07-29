"use client";

import type { DisplayOptions } from "@/lib/types";
import { BlockHeader, CARD, OptionRow, ToggleSwitch } from "./ui/panel";

interface OptionsPanelProps {
  options: DisplayOptions;
  onChange: (options: DisplayOptions) => void;
  /** The modal supplies its own header, so the card chrome is dropped there. */
  bare?: boolean;
}

export function OptionsPanel({ options, onChange, bare }: OptionsPanelProps) {
  const toggle = (key: keyof DisplayOptions) => () =>
    onChange({ ...options, [key]: !options[key] });

  const rows = (
    <div className="divide-y divide-line">
      <OptionRow
        title="Condensed Format"
        description="Single-line output, e.g. 3x5 Intercessors"
      >
        <ToggleSwitch
          on={options.condensedFormat}
          onToggle={toggle("condensedFormat")}
          ariaLabel="Condensed format"
        />
      </OptionRow>

      {options.condensedFormat ? (
        <OptionRow
          title="Force 1x Prefix"
          description="Show 1x for single non-character units, e.g. 1x Raider"
        >
          <ToggleSwitch
            on={options.forceSingleUnitPrefix}
            onToggle={toggle("forceSingleUnitPrefix")}
            ariaLabel="Force 1x prefix"
          />
        </OptionRow>
      ) : (
        <>
          <OptionRow title="Units and Names" description="Show unit names">
            <ToggleSwitch
              on={options.showUnitsAndNames}
              onToggle={toggle("showUnitsAndNames")}
              ariaLabel="Units and names"
            />
          </OptionRow>
          <OptionRow title="Points Values" description="Show point costs">
            <ToggleSwitch
              on={options.showPoints}
              onToggle={toggle("showPoints")}
              ariaLabel="Points values"
            />
          </OptionRow>
          <OptionRow
            title="Weapons and Wargear"
            description="Show equipment and loadouts"
          >
            <ToggleSwitch
              on={options.showWeapons}
              onToggle={toggle("showWeapons")}
              ariaLabel="Weapons and wargear"
            />
          </OptionRow>
          <OptionRow
            title="Detachment and Faction"
            description="Show army faction and detachment"
          >
            <ToggleSwitch
              on={options.showDetachment}
              onToggle={toggle("showDetachment")}
              ariaLabel="Detachment and faction"
            />
          </OptionRow>
        </>
      )}

      <OptionRow
        title="Show Enhancements"
        description="Display character enhancements, e.g. Succubus (Chronoshard)"
      >
        <ToggleSwitch
          on={options.showEnhancements}
          onToggle={toggle("showEnhancements")}
          ariaLabel="Show enhancements"
        />
      </OptionRow>

      <OptionRow
        title="Attached Leaders"
        description="Condensed: write the unit behind its character, e.g. Lord on Juggernaut + 1x6 Bloodcrushers. Expanded: name the character behind its unit."
      >
        <ToggleSwitch
          on={options.showAttachedLeaders}
          onToggle={toggle("showAttachedLeaders")}
          ariaLabel="Attached leaders"
        />
      </OptionRow>
    </div>
  );

  if (bare) return rows;

  return (
    <div className={CARD}>
      <BlockHeader label="Display Options" />
      {rows}
    </div>
  );
}
