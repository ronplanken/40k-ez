export interface ArmyList {
  raw: string;
  units: Unit[];
  listName?: string;
  totalPoints?: number;
  faction?: string;
  battleSize?: string;
  detachment?: string;
}

export interface Unit {
  name: string;
  quantity?: number;
  modelCount?: number; // Number of models in this unit
  points?: number;
  weapons?: string[];
  wargear?: string[];
  isCharacter?: boolean; // True if from CHARACTERS section
  sectionType?: string; // Section: CHARACTERS, BATTLELINE, DEDICATED TRANSPORTS, OTHER DATASHEETS, ALLIED UNITS
  enhancement?: string; // Enhancement name (e.g., "Frenzied Focus")
}

export interface DisplayOptions {
  showUnitsAndNames: boolean;
  showPoints: boolean;
  showWeapons: boolean;
  showDetachment: boolean;
  showEnhancements: boolean; // Show enhancements in non-condensed format
  condensedFormat: boolean; // New option for single-line condensed output
}

export const defaultDisplayOptions: DisplayOptions = {
  showUnitsAndNames: true,
  showPoints: false,
  showWeapons: false,
  showDetachment: true,
  showEnhancements: true,
  condensedFormat: true,
};
