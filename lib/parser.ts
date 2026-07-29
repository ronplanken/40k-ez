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
    leaders: u.leaders.length > 0 ? u.leaders : undefined,
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
    detachmentPoints: parsed.detachmentPoints ?? undefined,
  };
}

/**
 * The detachment with its cost, when the export states one: "Ironstorm (3 DP)".
 */
function detachmentLabel(name?: string, points?: number): string | undefined {
  if (!name) return undefined;
  return points == null ? name : `${name} (${points} DP)`;
}

/**
 * The attached characters, as a suffix: " (Logan Grimnar)". Only their names,
 * the characters keep their own entry with their enhancement and wargear.
 */
function leaderSuffix(leaders: string[] | undefined, options: DisplayOptions): string {
  if (!options.showAttachedLeaders || !leaders || leaders.length === 0) return "";
  return ` (${leaders.join(", ")})`;
}

/**
 * The enhancement, as a suffix: " (Wolf-touched)". The condensed form shows it
 * on characters only, where it reads as part of the name.
 */
function enhancementSuffix(unit: Unit, options: DisplayOptions): string {
  if (!options.showEnhancements || !unit.enhancement) return "";
  if (unit.category !== "characters") return "";
  return ` (${unit.enhancement})`;
}

/**
 * Groups units by name and creates condensed format
 */
interface UnitGroup {
  name: string;
  /** What the options append to the name: enhancement, attached leaders. */
  decoration: string;
  instances: Array<{ modelCount: number; points?: number }>;
  isCharacter?: boolean;
}

function groupUnits(units: Unit[], options: DisplayOptions): UnitGroup[] {
  const grouped = new Map<string, UnitGroup>();

  for (const unit of units) {
    const cleanName = unit.name.trim();
    // Create a unique key:
    // - If showEnhancements is ON: include enhancement in key to keep units with different enhancements separate
    // - If showEnhancements is OFF: use only the name to group all instances together
    // Two units merge only when they would render identically, so the key is
    // the name plus whatever decoration the options put on it. Keying on the
    // output means a new option cannot forget to split its groups.
    const decoration = enhancementSuffix(unit, options) + leaderSuffix(unit.leaders, options);
    const groupKey = cleanName + decoration;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        name: cleanName,
        decoration,
        instances: [],
        isCharacter: unit.category === "characters",
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
      // Characters carry a unit count, never a model count: "2x Slaughterbound".
      const count = group.instances.length > 1 ? `${group.instances.length}x ` : "";
      parts.push(count + group.name + group.decoration);
      continue;
    }

    // Count the instances per squad size, most common first: "3x5", or
    // "2x5/1x10" when the sizes differ.
    const countMap = new Map<number, number>();
    for (const instance of group.instances) {
      countMap.set(instance.modelCount, (countMap.get(instance.modelCount) ?? 0) + 1);
    }
    const entries = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);
    const sizeStr = entries
      .map(([modelCount, numUnits]) =>
        modelCount === 1 ? `${numUnits}x` : `${numUnits}x${modelCount}`
      )
      .join("/");

    // A lone single-model unit reads as just its name: "Raider".
    const bare =
      group.instances.length === 1 &&
      entries[0][0] === 1 &&
      !options.forceSingleUnitPrefix;
    const unitText = bare ? group.name : `${sizeStr} ${group.name}`;

    parts.push(unitText + group.decoration);
  }

  // Build the prefix with faction and detachment
  const detachment = detachmentLabel(armyList.detachment, armyList.detachmentPoints);
  const prefix = [armyList.faction, detachment].filter(Boolean).join(', ');

  return (prefix ? `${prefix}: ` : '') + parts.join(', ');
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

  if (options.showDetachment) {
    const detachment = detachmentLabel(armyList.detachment, armyList.detachmentPoints);
    if (detachment) lines.push(`Detachment: ${detachment}`);
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
      // Characters never carry a model count, same as the condensed form.
      const models = unit.modelCount ?? 1;
      const count = unit.category !== "characters" && models > 1 ? `${models}x ` : "";
      unitLine = count + unit.name + leaderSuffix(unit.leaders, options);
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
