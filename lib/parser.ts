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
 * The attached characters, as a suffix: " (Logan Grimnar)". Used by the
 * expanded form, which keeps a line per unit so nothing loses its points.
 */
function leaderSuffix(leaders: Unit["leaders"], options: DisplayOptions): string {
  if (!options.showAttachedLeaders || !leaders || leaders.length === 0) return "";
  return ` (${leaders.map((l) => l.name).join(", ")})`;
}

/**
 * How a unit reads with its size in front: "3x5 Intercessors", "2x5/1x10
 * Intercessors" when the sizes differ, or the bare name for a lone single
 * model.
 */
function sizeText(modelCounts: number[], name: string, options: DisplayOptions): string {
  if (modelCounts.length === 0) return name;

  const countMap = new Map<number, number>();
  for (const models of modelCounts) {
    countMap.set(models, (countMap.get(models) ?? 0) + 1);
  }
  // Most common size first.
  const entries = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);

  const bare =
    modelCounts.length === 1 && entries[0][0] === 1 && !options.forceSingleUnitPrefix;
  if (bare) return name;

  const sizeStr = entries
    .map(([models, numUnits]) => (models === 1 ? `${numUnits}x` : `${numUnits}x${models}`))
    .join("/");
  return `${sizeStr} ${name}`;
}

/**
 * The units a character joined, as a suffix: " + 1x6 Bloodcrushers". They are
 * left out of the list itself, so each unit is named once. Units of the same
 * name merge, same as they would in the list.
 */
function attachedSuffix(led: Unit[] | undefined, options: DisplayOptions): string {
  if (!options.showAttachedLeaders || !led) return "";

  const byName = new Map<string, number[]>();
  for (const unit of led) {
    const models = byName.get(unit.name);
    if (models) models.push(unit.modelCount ?? 1);
    else byName.set(unit.name, [unit.modelCount ?? 1]);
  }

  return Array.from(byName.entries())
    .map(([name, models]) => ` + ${sizeText(models, name, options)}`)
    .join("");
}

/** The units each character leads, keyed by the character's position. */
function attachmentsByLeader(units: Unit[]): Map<number, Unit[]> {
  const byLeader = new Map<number, Unit[]>();
  for (const unit of units) {
    for (const leader of unit.leaders ?? []) {
      const led = byLeader.get(leader.index);
      if (led) led.push(unit);
      else byLeader.set(leader.index, [unit]);
    }
  }
  return byLeader;
}

/**
 * The characters that share a block with another character, such as a Painboy
 * attached as support alongside a Warboss. The block is one group, so the first
 * character writes it out and the rest are folded into that same entry instead
 * of repeating the unit once per character.
 */
function coLeaders(units: Unit[]): { folded: Set<number>; byFirst: Map<number, number[]> } {
  const folded = new Set<number>();
  const byFirst = new Map<number, number[]>();

  for (const unit of units) {
    const leaders = unit.leaders ?? [];
    for (const leader of leaders.slice(1)) {
      if (folded.has(leader.index)) continue;
      folded.add(leader.index);
      const rest = byFirst.get(leaders[0].index);
      if (rest) rest.push(leader.index);
      else byFirst.set(leaders[0].index, [leader.index]);
    }
  }
  return { folded, byFirst };
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
  /** The model count of each unit in the group. */
  instances: number[];
  isCharacter?: boolean;
}

function groupUnits(units: Unit[], options: DisplayOptions): UnitGroup[] {
  const grouped = new Map<string, UnitGroup>();
  const attachedTo = attachmentsByLeader(units);
  const { folded, byFirst } = coLeaders(units);

  units.forEach((unit, index) => {
    // An attached unit is written out with the character that leads it, and a
    // character sharing that block is written out with the first character of
    // it, so neither is listed again on its own.
    if (options.showAttachedLeaders && (unit.leaders?.length || folded.has(index))) return;

    const cleanName = unit.name.trim();
    // The rest of this character's block: " + Painboy".
    const shared = (byFirst.get(index) ?? [])
      .map((i) => ` + ${units[i].name.trim()}${enhancementSuffix(units[i], options)}`)
      .join("");
    // Two units merge only when they would render identically, so the key is
    // the name plus whatever decoration the options put on it. Keying on the
    // output means a new option cannot forget to split its groups.
    const decoration =
      enhancementSuffix(unit, options) + shared + attachedSuffix(attachedTo.get(index), options);
    const groupKey = cleanName + decoration;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        name: cleanName,
        decoration,
        instances: [],
        isCharacter: unit.category === "characters",
      });
    }

    grouped.get(groupKey)!.instances.push(unit.modelCount || 1);
  });

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
      // Characters carry a unit count, never a model count, so every instance
      // counts as one model: "2x Slaughterbound".
      const asOneEach = group.instances.map(() => 1);
      parts.push(sizeText(asOneEach, group.name, options) + group.decoration);
      continue;
    }

    const unitText = sizeText(group.instances, group.name, options);

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
