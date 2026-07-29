import type { ArmyList, Unit, DisplayOptions } from "./types";
import { parseArmyList as parseExport } from "./army-list/parse";

/**
 * Parses a pasted army list into the shape the formatter uses.
 *
 * The reading is done by ./army-list/parse, which handles the app title export,
 * the WTC "+++" export and compact exports with no section headers. This maps
 * its result onto the display model.
 */
export function parseArmyList(text: string): ArmyList {
  const parsed = parseExport(text);

  const units: Unit[] = parsed.units.map((u) => ({
    name: u.name,
    category: u.category,
    points: u.points ?? undefined,
    modelCount: u.models ?? 1,
    wargear: u.wargear.length > 0 ? u.wargear : undefined,
    enhancement: u.enhancement ?? undefined,
  }));

  // The chapter or legion is part of the faction as far as the output goes:
  // "Space Marines - Space Wolves".
  const faction = parsed.subfaction
    ? `${parsed.faction} - ${parsed.subfaction}`
    : parsed.faction;

  return {
    units,
    totalPoints: parsed.points ?? undefined,
    faction: faction ?? undefined,
    detachment: parsed.detachment ?? undefined,
  };
}

/**
 * Groups units by name and creates condensed format
 */
interface UnitGroup {
  name: string;
  instances: Array<{ modelCount: number; points?: number }>;
  isCharacter?: boolean;
  enhancement?: string; // Enhancement name if any
}

function groupUnits(units: Unit[], options: DisplayOptions): UnitGroup[] {
  const grouped = new Map<string, UnitGroup>();

  for (const unit of units) {
    const cleanName = unit.name.trim();
    // Create a unique key:
    // - If showEnhancements is ON: include enhancement in key to keep units with different enhancements separate
    // - If showEnhancements is OFF: use only the name to group all instances together
    const groupKey = (options.showEnhancements && unit.enhancement)
      ? `${cleanName}|${unit.enhancement}`
      : cleanName;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        name: cleanName,
        instances: [],
        isCharacter: unit.category === "characters",
        enhancement: unit.enhancement, // Preserve enhancement (only used if showEnhancements is ON)
      });
    }

    grouped.get(groupKey)!.instances.push({
      modelCount: unit.modelCount || 1,
      points: unit.points,
    });
  }

  return Array.from(grouped.values());
}

/**
 * Formats units in condensed single-line format
 */
function formatCondensed(armyList: ArmyList, options: DisplayOptions): string {
  if (armyList.units.length === 0) {
    return "";
  }

  const grouped = groupUnits(armyList.units, options);
  const parts: string[] = [];

  for (const group of grouped) {
    // Check if this is a character (show unit count only, not model count)
    if (group.isCharacter) {
      let unitText = '';
      if (group.instances.length > 1) {
        // Multiple character units: "2x Slaughterbound"
        unitText = `${group.instances.length}x ${group.name}`;
      } else {
        // Single character unit: just the name
        unitText = group.name;
      }

      // Add enhancement if present and enabled
      if (group.enhancement && options.showEnhancements) {
        unitText += ` (${group.enhancement})`;
      }

      parts.push(unitText);
      continue;
    }

    if (group.instances.length === 1) {
      // Single instance (non-character)
      const instance = group.instances[0];
      if (instance.modelCount > 1) {
        // Multiple models in single unit: "1x6 Aggressor Squad"
        parts.push(`1x${instance.modelCount} ${group.name}`);
      } else {
        // Single model in single unit
        if (options.forceSingleUnitPrefix) {
          // Force "1x" prefix: "1x Raider"
          parts.push(`1x ${group.name}`);
        } else {
          // Just the name: "Raider"
          parts.push(group.name);
        }
      }
    } else {
      // Multiple instances - group by model count
      const countMap = new Map<number, number>();
      for (const instance of group.instances) {
        const count = countMap.get(instance.modelCount) || 0;
        countMap.set(instance.modelCount, count + 1);
      }

      // Format based on grouping
      const entries = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);

      if (entries.length === 1) {
        // All same size
        const [modelCount, numUnits] = entries[0];
        if (modelCount === 1) {
          parts.push(`${numUnits}x ${group.name}`);
        } else {
          parts.push(`${numUnits}x${modelCount} ${group.name}`);
        }
      } else {
        // Mixed sizes - format like "2x5/1x10"
        const sizeStr = entries.map(([modelCount, numUnits]) => {
          if (modelCount === 1) {
            return `${numUnits}x`;
          }
          return `${numUnits}x${modelCount}`;
        }).join('/');
        parts.push(`${sizeStr} ${group.name}`);
      }
    }
  }

  // Build the prefix with faction and detachment
  let prefix = '';
  if (armyList.faction && armyList.detachment) {
    prefix = `${armyList.faction}, ${armyList.detachment}: `;
  } else if (armyList.faction) {
    prefix = `${armyList.faction}: `;
  } else if (armyList.detachment) {
    prefix = `${armyList.detachment}: `;
  }

  return prefix + parts.join(', ');
}

/**
 * Formats parsed army list into readable text output
 */
export function formatArmyList(
  armyList: ArmyList,
  options: DisplayOptions
): string {
  if (armyList.units.length === 0) {
    return "";
  }

  // Use condensed format if requested
  if (options.condensedFormat) {
    return formatCondensed(armyList, options);
  }

  const lines: string[] = [];

  // Header section
  if (options.showDetachment && armyList.faction) {
    lines.push(`Faction: ${armyList.faction}`);
  }

  if (options.showDetachment && armyList.detachment) {
    lines.push(`Detachment: ${armyList.detachment}`);
  }

  if (lines.length > 0) {
    lines.push(""); // Empty line after header
  }

  // Units section
  let previousCategory: string | undefined;

  for (const unit of armyList.units) {
    // Add blank line when section changes
    if (previousCategory !== undefined && unit.category !== previousCategory) {
      lines.push("");
    }
    previousCategory = unit.category;

    let unitLine = "";

    if (options.showUnitsAndNames) {
      unitLine = unit.name;
    }

    if (options.showWeapons && unit.wargear && unit.wargear.length > 0) {
      unitLine += ` [${unit.wargear.join(", ")}]`;
    }

    // Add enhancement (only shown when showEnhancements is enabled)
    if (unit.enhancement && options.showEnhancements) {
      unitLine += ` - Enhancement: ${unit.enhancement}`;
    }

    if (options.showPoints && unit.points) {
      unitLine += ` - ${unit.points}pts`;
    }

    if (unitLine) {
      lines.push(unitLine);
    }
  }

  // Total points
  if (options.showPoints && armyList.totalPoints) {
    lines.push("");
    lines.push(`Total: ${armyList.totalPoints}pts`);
  }

  return lines.join("\n");
}
