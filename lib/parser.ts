import type { ArmyList, Unit, DisplayOptions } from "./types";

/**
 * Detects if the text is in structured format (from apps like Battlescribe)
 */
function isStructuredFormat(text: string): boolean {
  return /^(CHARACTERS|OTHER DATASHEETS|BATTLELINE|DEDICATED TRANSPORT)/m.test(text);
}

/**
 * Parses structured army list format (Battlescribe-style)
 */
function parseStructuredList(text: string): ArmyList {
  const lines = text.split("\n");
  const units: Unit[] = [];
  let listName: string | undefined;
  let faction: string | undefined;
  let battleSize: string | undefined;
  let detachment: string | undefined;
  let totalPoints: number | undefined;

  let currentUnit: Partial<Unit> | null = null;
  let currentModelCount = 0;
  let firstBulletIndent: number | null = null; // Track the indentation of first bullet under a unit
  let currentSection: string | null = null; // Track which section we're parsing (CHARACTERS, BATTLELINE, etc.)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Calculate indentation level (number of leading spaces)
    const indentation = line.length - line.trimStart().length;

    // Parse header lines (lines 0-6)
    if (i === 0) {
      // Line 1: List name and total points
      const line1Match = trimmed.match(/^(.+?)\s*\((\d+)\s*points?\)$/i);
      if (line1Match) {
        listName = line1Match[1].trim();
        totalPoints = parseInt(line1Match[2], 10);
      }
      continue;
    }

    if (i === 2) {
      // Line 3: Faction (always)
      faction = trimmed;
      continue;
    }

    if (i === 3) {
      if (faction === 'Space Marines') {
        // Line 4 for Space Marines: Subfaction
        faction = `Space Marines - ${trimmed}`;
      } else {
        // Line 4 for non-Space Marines: Battle size
        battleSize = trimmed;
      }
      continue;
    }

    if (i === 4) {
      if (faction && faction.startsWith('Space Marines - ')) {
        // Line 5 for Space Marines: Battle size
        battleSize = trimmed;
      } else {
        // Line 5 for non-Space Marines: Detachment
        detachment = trimmed;
      }
      continue;
    }

    if (i === 5) {
      if (faction && faction.startsWith('Space Marines - ')) {
        // Line 6 for Space Marines: Detachment
        detachment = trimmed;
      }
      // For non-Space Marines, we're past the header at this point
      continue;
    }

    // Track section headers
    if (/^CHARACTERS$/i.test(trimmed)) {
      currentSection = 'CHARACTERS';
      continue;
    }
    if (/^BATTLELINE$/i.test(trimmed)) {
      currentSection = 'BATTLELINE';
      continue;
    }
    if (/^DEDICATED TRANSPORTS$/i.test(trimmed)) {
      currentSection = 'DEDICATED TRANSPORTS';
      continue;
    }
    if (/^OTHER DATASHEETS$/i.test(trimmed)) {
      currentSection = 'OTHER DATASHEETS';
      continue;
    }
    if (/^ALLIED UNITS$/i.test(trimmed)) {
      currentSection = 'ALLIED UNITS';
      continue;
    }

    // Parse enhancement lines
    const enhancementMatch = trimmed.match(/^[•\-\*]?\s*Enhancement:\s*(.+)$/i);
    if (enhancementMatch && currentUnit) {
      currentUnit.enhancement = enhancementMatch[1].trim();
      continue;
    }

    // Skip special lines
    if (/^(Warlord|Exported with)/i.test(trimmed)) {
      continue;
    }

    // Check if this is a unit header line (has points in parentheses)
    const unitHeaderMatch = trimmed.match(/^(.+?)\s*\((\d+)\s*points?\)$/i);
    if (unitHeaderMatch) {
      // Save previous unit if exists
      if (currentUnit && currentUnit.name) {
        units.push({
          name: currentUnit.name,
          points: currentUnit.points,
          modelCount: currentModelCount > 0 ? currentModelCount : 1,
          weapons: currentUnit.weapons,
          wargear: currentUnit.wargear,
          isCharacter: currentUnit.isCharacter,
          sectionType: currentUnit.sectionType,
          enhancement: currentUnit.enhancement,
        });
      }

      // Start new unit
      currentUnit = {
        name: unitHeaderMatch[1].trim(),
        points: parseInt(unitHeaderMatch[2], 10),
        weapons: [],
        wargear: [],
        isCharacter: currentSection === 'CHARACTERS', // Set based on current section
        sectionType: currentSection || undefined, // Store the section type
        enhancement: undefined, // Will be set if enhancement line is found
      };
      currentModelCount = 0;
      firstBulletIndent = null; // Reset bullet indent tracking for new unit
      continue;
    }

    // Parse model composition lines (bullet points with quantities)
    const modelMatch = trimmed.match(/^[•\-\*]\s*(\d+)x\s+(.+)/);
    if (modelMatch && currentUnit) {
      // Set the first bullet indentation level if not set
      if (firstBulletIndent === null) {
        firstBulletIndent = indentation;
      }

      // Only count models at the FIRST indentation level (not weapons which are indented deeper)
      if (indentation === firstBulletIndent) {
        const quantity = parseInt(modelMatch[1], 10);
        currentModelCount += quantity;
      }
      // Weapon lines (deeper indentation) are ignored for model counting
    }
  }

  // Save last unit
  if (currentUnit && currentUnit.name) {
    units.push({
      name: currentUnit.name,
      points: currentUnit.points,
      modelCount: currentModelCount > 0 ? currentModelCount : 1,
      weapons: currentUnit.weapons,
      wargear: currentUnit.wargear,
      isCharacter: currentUnit.isCharacter,
      sectionType: currentUnit.sectionType,
      enhancement: currentUnit.enhancement,
    });
  }

  return {
    raw: text,
    units,
    listName,
    totalPoints,
    faction,
    battleSize,
    detachment,
  };
}

/**
 * Parses simple plain text army list format
 */
function parseSimpleList(text: string): ArmyList {
  const lines = text.split("\n").filter((line) => line.trim());
  const units: Unit[] = [];
  let faction: string | undefined;
  let detachment: string | undefined;
  let totalPoints: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    // Try to extract faction
    if (
      /^(faction|army):/i.test(trimmed) ||
      /(space marines|necrons|tyranids|orks|tau|eldar|chaos|imperial|astra militarum|adeptus)/i.test(
        trimmed
      )
    ) {
      faction = trimmed.replace(/^(faction|army):\s*/i, "");
    }

    // Try to extract detachment
    if (/^detachment:/i.test(trimmed) || /detachment/i.test(trimmed)) {
      detachment = trimmed.replace(/^detachment:\s*/i, "");
    }

    // Try to extract total points
    const totalMatch = trimmed.match(/total:?\s*(\d+)\s*(?:pts?|points?)/i);
    if (totalMatch) {
      totalPoints = parseInt(totalMatch[1], 10);
    }

    // Parse unit lines
    const unitMatch = trimmed.match(/^(\d+)?\s*x?\s*([A-Za-z][^-\[\(0-9]*)/i);
    if (unitMatch && !/(faction|detachment|total)/i.test(trimmed)) {
      const quantity = unitMatch[1] ? parseInt(unitMatch[1], 10) : 1;
      const name = unitMatch[2].trim();

      // Extract points
      const pointsMatch = trimmed.match(/(\d+)\s*(?:pts?|points?)/i);
      const points = pointsMatch ? parseInt(pointsMatch[1], 10) : undefined;

      // Extract weapons/wargear from brackets or parentheses
      const weapons: string[] = [];
      const wargear: string[] = [];

      const bracketMatch = trimmed.match(/\[([^\]]+)\]/);
      if (bracketMatch) {
        const items = bracketMatch[1].split(",").map((s) => s.trim());
        weapons.push(...items);
      }

      const parenMatch = trimmed.match(/\(([^)]+)\)/);
      if (parenMatch && !/\d+\s*points?/.test(parenMatch[1])) {
        const items = parenMatch[1].split(",").map((s) => s.trim());
        wargear.push(...items);
      }

      // Extract weapons/wargear after dash
      const dashMatch = trimmed.match(/-\s*([^0-9\[\(]+)/);
      if (dashMatch) {
        const items = dashMatch[1]
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s && !/pts?|points?/i.test(s));
        wargear.push(...items);
      }

      if (name.length > 0) {
        units.push({
          name,
          quantity,
          points,
          weapons: weapons.length > 0 ? weapons : undefined,
          wargear: wargear.length > 0 ? wargear : undefined,
        });
      }
    }
  }

  return {
    raw: text,
    units,
    totalPoints,
    faction,
    detachment,
  };
}

/**
 * Parses plain text army list into structured data
 */
export function parseArmyList(text: string): ArmyList {
  if (!text.trim()) {
    return {
      raw: text,
      units: [],
    };
  }

  // Detect format and use appropriate parser
  if (isStructuredFormat(text)) {
    return parseStructuredList(text);
  } else {
    return parseSimpleList(text);
  }
}

/**
 * Cleans unit name - currently disabled to preserve full names
 */
function cleanUnitName(name: string): string {
  // Keep the name as-is to preserve important details like "with Combi-weapon"
  return name.trim();
}

/**
 * Groups units by name and creates condensed format
 */
interface UnitGroup {
  name: string;
  instances: Array<{ modelCount: number; points?: number }>;
  isCharacter?: boolean;
}

function groupUnits(units: Unit[]): UnitGroup[] {
  const grouped = new Map<string, UnitGroup>();

  for (const unit of units) {
    const cleanName = cleanUnitName(unit.name);

    if (!grouped.has(cleanName)) {
      grouped.set(cleanName, {
        name: cleanName,
        instances: [],
        isCharacter: unit.isCharacter, // Preserve isCharacter flag
      });
    }

    grouped.get(cleanName)!.instances.push({
      modelCount: unit.modelCount || 1,
      points: unit.points,
    });
  }

  return Array.from(grouped.values());
}

/**
 * Formats units in condensed single-line format
 */
function formatCondensed(armyList: ArmyList): string {
  if (armyList.units.length === 0) {
    return "";
  }

  const grouped = groupUnits(armyList.units);
  const parts: string[] = [];

  for (const group of grouped) {
    // Check if this is a character (show unit count only, not model count)
    if (group.isCharacter) {
      if (group.instances.length > 1) {
        // Multiple character units: "2x Slaughterbound"
        parts.push(`${group.instances.length}x ${group.name}`);
      } else {
        // Single character unit: just the name
        parts.push(group.name);
      }
      continue;
    }

    if (group.instances.length === 1) {
      // Single instance (non-character)
      const instance = group.instances[0];
      if (instance.modelCount > 1) {
        // Multiple models in single unit: "1x6 Aggressor Squad"
        parts.push(`1x${instance.modelCount} ${group.name}`);
      } else {
        // Single model in single unit: just the name
        parts.push(group.name);
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
    return formatCondensed(armyList);
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
  let previousSection: string | undefined;

  for (const unit of armyList.units) {
    // Add blank line when section changes
    if (unit.sectionType && unit.sectionType !== previousSection && previousSection !== undefined) {
      lines.push("");
    }
    previousSection = unit.sectionType;

    let unitLine = "";

    if (options.showUnitsAndNames) {
      // For characters, never show counts
      if (unit.isCharacter) {
        unitLine = unit.name;
      } else if (unit.quantity && unit.quantity > 1) {
        unitLine = `${unit.quantity}x ${unit.name}`;
      } else {
        unitLine = unit.name;
      }
    }

    if (options.showWeapons) {
      const equipment: string[] = [];
      if (unit.weapons && unit.weapons.length > 0) {
        equipment.push(...unit.weapons);
      }
      if (unit.wargear && unit.wargear.length > 0) {
        equipment.push(...unit.wargear);
      }
      if (equipment.length > 0) {
        unitLine += ` [${equipment.join(", ")}]`;
      }
    }

    // Add enhancement (always shown in regular format)
    if (unit.enhancement) {
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
