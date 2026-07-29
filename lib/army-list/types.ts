// Types the army list parser produces. This is the raw shape read out of a
// Warhammer 40,000 app export. `lib/parser.ts` maps it onto the `Unit` /
// `ArmyList` shape the formatter and the UI use.

export type ArmyListCategory = 'characters' | 'battleline' | 'transports' | 'other'

export interface ParsedUnit {
  name: string
  points: number | null
  // Best-effort model count. Null when the parser cannot tell.
  models: number | null
  category: ArmyListCategory
  enhancement: string | null
  // Weapons and wargear, read from the deepest bullet level of the unit block.
  wargear: string[]
  // Names of the characters attached to this unit. Empty for the characters
  // themselves and for units nobody leads.
  leaders: string[]
}

export interface ParsedArmyList {
  name: string | null
  faction: string | null
  subfaction: string | null
  detachment: string | null
  // Detachment points the list spends. Only the app title export states it.
  detachmentPoints: number | null
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

