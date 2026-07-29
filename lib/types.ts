import type { ArmyListCategory } from "./army-list/types";

export interface ArmyList {
  units: Unit[];
  totalPoints?: number;
  faction?: string;
  detachment?: string;
}

export interface Unit {
  name: string;
  category: ArmyListCategory; // Characters, battleline, transports or other
  modelCount?: number; // Number of models in this unit
  points?: number;
  wargear?: string[]; // Weapons and other wargear
  enhancement?: string; // Enhancement name (e.g., "Frenzied Focus")
}

export interface DisplayOptions {
  showUnitsAndNames: boolean;
  showPoints: boolean;
  showWeapons: boolean;
  showDetachment: boolean;
  showEnhancements: boolean; // Show enhancements in non-condensed format
  condensedFormat: boolean; // New option for single-line condensed output
  forceSingleUnitPrefix: boolean; // Force "1x" prefix for single non-character units in condensed format
}

export const defaultDisplayOptions: DisplayOptions = {
  showUnitsAndNames: true,
  showPoints: false,
  showWeapons: false,
  showDetachment: true,
  showEnhancements: true,
  condensedFormat: true,
  forceSingleUnitPrefix: false,
};
