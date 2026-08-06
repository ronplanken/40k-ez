// Types the army list parser produces. This is the raw shape read out of a
// Warhammer 40,000 app export. `lib/parser.ts` maps it onto the `Unit` /
// `ArmyList` shape the formatter and the UI use.

export type ArmyListCategory = 'characters' | 'battleline' | 'transports' | 'other'

/** A character, as referenced from the unit it joined. */
export interface LeaderRef {
  /** Its position in the unit list this parse returned. */
  index: number
  name: string
}

export interface ParsedUnit {
  name: string
  points: number | null
  // Best-effort model count. Null when the parser cannot tell.
  models: number | null
  category: ArmyListCategory
  enhancement: string | null
  // Weapons and wargear, read from the deepest bullet level of the unit block.
  wargear: string[]
  // The characters attached to this unit. Empty for the characters themselves
  // and for units nobody leads.
  leaders: LeaderRef[]
}

export interface ParsedArmyList {
  name: string | null
  faction: string | null
  subfaction: string | null
  detachment: string | null
  // Detachment points the list spends, when the export states it.
  detachmentPoints: number | null
  // The 11th edition force disposition, when the export names one.
  disposition: string | null
  // Total army points. From the header when present, else the sum of units.
  points: number | null
  units: ParsedUnit[]
}

// Display order of the categories. Units are emitted in this order, keeping
// their source order within a category.
export const CATEGORY_ORDER: ArmyListCategory[] = [
  'characters',
  'battleline',
  'transports',
  'other',
]

