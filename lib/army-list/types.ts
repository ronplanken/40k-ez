// Types the army list parser produces. This is the raw shape read out of a
// Warhammer 40,000 app export, before any app decides how to show it.
//
// SHARED FILE. This module and `parse.ts`, `parse.fixtures.ts` and
// `parse.test.ts` next to it are kept byte-identical between the 40k-ez app and
// the gd streamer app. Both read the same exports, and the two copies drifting
// apart is how the same bugs ended up in both. Change it in one repo, copy the
// four files to the other, and run the tests in both. Anything app-specific
// belongs in the layer that maps this onto a display model, not in here.
//
// Formatting follows the streamer's prettier config, which its lint enforces.
// Run prettier there before copying back, or CI rejects the copy.

export type ArmyListCategory = 'characters' | 'battleline' | 'transports' | 'other'

// How a unit joins an "Attached Unit N" block.
export type AttachedRole = 'leader' | 'bodyguard' | 'support'

export interface UnitAttachment {
  // 1-based. From the "Attached unit N" labels when the export writes them,
  // else counted off, one block per leader.
  group: number
  role: AttachedRole
}

/** A character, as referenced from the unit it joined. */
export interface LeaderRef {
  /** The character's own unit id, so this survives any reordering. */
  id: string
  name: string
}

export interface ArmyListUnit {
  // Stable within a single parse. The key for per-unit state and the way one
  // unit points at another.
  id: string
  name: string
  points: number | null
  // Best-effort model count. Null when the parser cannot tell.
  models: number | null
  category: ArmyListCategory
  isWarlord: boolean
  enhancement: string | null
  // Weapons and wargear, read from the deepest bullet level of the unit block.
  wargear: string[]
  // The characters attached to this unit. Empty for the characters themselves
  // and for units nobody leads.
  leaders: LeaderRef[]
  // Set only for units inside an ATTACHED UNITS section that state a role. The
  // category above still says where the unit is shown in a flat list; this says
  // which block it joined, for viewers that keep the blocks intact.
  attachment: UnitAttachment | null
}

export interface ArmyList {
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
  // In the order the export lists them. Grouping is a display decision, so it
  // belongs to the app, not here.
  units: ArmyListUnit[]
}

// Display order of the categories, for the apps that group by them.
export const CATEGORY_ORDER: ArmyListCategory[] = [
  'characters',
  'battleline',
  'transports',
  'other',
]

export const CATEGORY_LABELS: Record<ArmyListCategory, string> = {
  characters: 'Characters',
  battleline: 'Battleline',
  transports: 'Dedicated Transports',
  other: 'Other Datasheets',
}
