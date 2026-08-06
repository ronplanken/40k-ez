import type { ArmyListCategory, LeaderRef } from "./army-list/types";

export interface ArmyList {
  units: Unit[];
  totalPoints?: number;
  faction?: string;
  disposition?: string; // Force disposition, e.g. "Take and Hold"
  detachment?: string;
  detachmentPoints?: number; // Detachment points the list spends
}

export interface Unit {
  id: string; // Stable within one parse, and how leaders point at a character
  name: string;
  category: ArmyListCategory; // Characters, battleline, transports or other
  modelCount?: number; // Number of models in this unit
  points?: number;
  wargear?: string[]; // Weapons and other wargear
  enhancement?: string; // Enhancement name (e.g., "Frenzied Focus")
  leaders?: LeaderRef[]; // Characters attached to this unit
}

export interface DisplayOptions {
  showUnitsAndNames: boolean;
  showPoints: boolean;
  showWeapons: boolean;
  showDetachment: boolean;
  showEnhancements: boolean; // Show enhancements in non-condensed format
  showAttachedLeaders: boolean; // Show an attached unit with the character that leads it
  condensedFormat: boolean; // New option for single-line condensed output
  forceSingleUnitPrefix: boolean; // Force "1x" prefix for single non-character units in condensed format
}

export const defaultDisplayOptions: DisplayOptions = {
  showUnitsAndNames: true,
  showPoints: false,
  showWeapons: false,
  showDetachment: true,
  showEnhancements: true,
  showAttachedLeaders: false,
  condensedFormat: true,
  forceSingleUnitPrefix: false,
};
