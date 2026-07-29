import { describe, it, expect } from 'vitest'
import { parseArmyList } from './parse'
import type { ParsedArmyList, ArmyListCategory } from './types'
import { CATEGORY_ORDER } from './types'
import {
  BARK_AT_THE_MOON,
  CHAOS_DAEMONS_WTC,
  LOGAN_STEEL_CHAIR,
  WORLD_EATERS,
  IRONSTORM,
  TAU_MONTKA,
  SORORITAS_LEADING,
} from './parse.fixtures'

// Look up the first unit whose name matches, for per-unit assertions.
function unit(list: ParsedArmyList, name: string) {
  const found = list.units.find((u) => u.name === name)
  if (!found) throw new Error(`unit not found: ${name}`)
  return found
}

function leaderNames(unit: { leaders: Array<{ name: string }> }): string[] {
  return unit.leaders.map((l) => l.name)
}

function countByCategory(list: ParsedArmyList, category: ArmyListCategory): number {
  return list.units.filter((u) => u.category === category).length
}

describe('parseArmyList - title format (Bark at the Moon)', () => {
  const list = parseArmyList(BARK_AT_THE_MOON)

  it('reads the list name and total points from the title line', () => {
    expect(list.name).toBe('Bark at the Moon')
    expect(list.points).toBe(1990)
  })

  it('reads faction, chapter and detachment from the header', () => {
    expect(list.faction).toBe('Space Marines')
    expect(list.subfaction).toBe('Space Wolves')
    expect(list.detachment).toBe('Legends of Saga and Song and Saga of the Beastslayer')
  })

  it('parses every unit and drops battle-size and app-version noise', () => {
    expect(list.units).toHaveLength(15)
    expect(list.units.map((u) => u.name)).not.toContain('Strike Force')
  })

  it('folds attached leaders into characters and bodyguards into other', () => {
    // 3 attached leaders + 3 standalone characters.
    expect(countByCategory(list, 'characters')).toBe(6)
    expect(countByCategory(list, 'battleline')).toBe(3)
    // 3 attached bodyguards + Gladiator + Scouts + Wulfen.
    expect(countByCategory(list, 'other')).toBe(6)
  })

  it('counts models: single characters are 1, squads sum their members', () => {
    expect(unit(list, 'Logan Grimnar').models).toBe(1)
    expect(unit(list, 'Wolf Guard Terminators').models).toBe(5) // 1 leader + 4
    expect(unit(list, 'Wolf Guard Headtakers').models).toBe(6)
    expect(unit(list, 'Bjorn the Fell-Handed').models).toBe(1)
    expect(unit(list, 'Intercessor Squad').models).toBe(5)
    expect(unit(list, 'Gladiator Lancer').models).toBe(1) // vehicle
    expect(unit(list, 'Scout Squad').models).toBe(5)
    expect(unit(list, 'Wulfen with Storm Shields').models).toBe(10)
  })

  it('reads enhancements', () => {
    expect(unit(list, 'Wolf Guard Battle Leader').enhancement).toBe('Wolf-touched')
  })

  it('emits units in display order, not source order', () => {
    // The export interleaves attached leaders and bodyguards; the parser groups
    // them so the output reads characters, battleline, transports, other.
    const seen = list.units.map((u) => u.category)
    const order = CATEGORY_ORDER.filter((c) => seen.includes(c))
    expect([...new Set(seen)]).toEqual(order)
  })

  it('reads wargear from the deepest bullet level', () => {
    expect(unit(list, 'Logan Grimnar').wargear).toEqual([
      'Axe Morkai',
      'Storm bolter',
      'Tyrnak and Fenrir',
    ])
    // Squad weapons are deduped, and the model lines are not wargear.
    expect(unit(list, 'Wolf Guard Headtakers').wargear).toEqual([
      'Heavy bolt pistol',
      'Master-crafted power weapon',
      'Storm Shield',
    ])
    expect(unit(list, 'Wolf Guard Headtakers').wargear).not.toContain('Wolf Guard Headtaker')
  })

  it('keeps parser-owned lines out of the wargear', () => {
    const logan = unit(list, 'Logan Grimnar')
    expect(logan.wargear).not.toContain('Warlord')
    expect(logan.wargear.some((w) => /^attached as:/i.test(w))).toBe(false)
    const leader = unit(list, 'Wolf Guard Battle Leader')
    expect(leader.enhancement).toBe('Wolf-touched')
    expect(leader.wargear.some((w) => /enhancement/i.test(w))).toBe(false)
    // The export ends with an "Exported with App Version: ..." trailer, which
    // would otherwise attach to the last unit.
    expect(list.units.every((u) => u.wargear.every((w) => !/app version/i.test(w)))).toBe(true)
  })
})

describe('parseArmyList - WTC "+++" format (Chaos Daemons)', () => {
  const list = parseArmyList(CHAOS_DAEMONS_WTC)

  it('reads faction, detachment and points from the "+" header block', () => {
    expect(list.faction).toBe('Chaos - Chaos Daemons')
    expect(list.detachment).toBe('Shadow Legion, Warptide (First Prince of Chaos)')
    expect(list.points).toBe(2000)
  })

  it('parses the exact unit count the header declares', () => {
    // The export header states "NUMBER OF UNITS: 14".
    expect(list.units).toHaveLength(14)
  })

  it('treats flat weapon-only characters as a single model', () => {
    expect(unit(list, "Be'lakor").models).toBe(1)
    expect(unit(list, 'Chaos Lord in Terminator Armour').models).toBe(1)
  })

  it('reads an enhancement written with only its cost', () => {
    // The export lists it as "Fade to Darkness (+30 pts)" with no label, and
    // names it in the header block as an enhancement on Char2.
    expect(unit(list, 'Bloodthirster').enhancement).toBe('Fade to Darkness')
    expect(unit(list, 'Bloodthirster').wargear).not.toContain('Fade to Darkness')
  })

  it('sums models for nested squads', () => {
    expect(unit(list, 'Blue Horrors').models).toBe(10)
    expect(unit(list, 'Flesh Hounds').models).toBe(5) // 1 + 4
    expect(list.units.filter((u) => u.name === 'Screamers')).toHaveLength(3)
    expect(unit(list, 'Screamers').models).toBe(3)
  })
})

describe('parseArmyList - flattened bullets and comma thousands (Logan)', () => {
  const list = parseArmyList(LOGAN_STEEL_CHAIR)

  it('parses the comma thousands total', () => {
    expect(list.points).toBe(2000)
    expect(list.name).toBe('Logan Grimnar with the steel chair')
  })

  it('reads the detachment even when the mission line follows it', () => {
    expect(list.detachment).toBe('Legends of Saga and Song and Saga of the Great Wolf')
  })

  it('keeps a lone character at 1 model when weapons are not nested', () => {
    // App v2.1.0 lists a character's weapons at the same bullet depth as the
    // model; without nesting there is nothing to sum, so it must stay 1.
    expect(unit(list, 'Logan Grimnar').models).toBe(1)
    expect(unit(list, 'Bjorn the Fell-Handed').models).toBe(1)
  })

  it('still sums nested squad members', () => {
    const terminators = list.units.filter((u) => u.name === 'Wolf Guard Terminators')
    expect(terminators.map((u) => u.models)).toEqual([5, 10])
  })

  it('reads enhancements that carry an "(Upgrade)" suffix', () => {
    const first = list.units.find((u) => u.name === 'Wolf Guard Terminators' && u.enhancement)
    expect(first?.enhancement).toBe('Fierce Example')
  })
})

describe('parseArmyList - single faction line and battleline annotation', () => {
  const list = parseArmyList(WORLD_EATERS)

  it('reads a faction with no chapter line', () => {
    expect(list.faction).toBe('World Eaters')
    expect(list.subfaction).toBeNull()
    expect(list.name).toBe('berserker')
  })

  it('routes a "Bodyguard (Battleline)" unit to battleline', () => {
    expect(unit(list, 'Khorne Berzerkers').category).toBe('battleline')
    expect(unit(list, 'Khorne Berzerkers').models).toBe(10) // 1 + 9
  })

  it('routes a plain "Bodyguard" unit to other', () => {
    expect(unit(list, 'Exalted Eightbound').category).toBe('other')
  })
})

describe('parseArmyList - multi-model character (Grimaldus)', () => {
  const list = parseArmyList(IRONSTORM)

  it('sums a character that brings a bodyguard of its own', () => {
    // Grimaldus (1) + 3 Cenobyte Servitors.
    expect(unit(list, 'Chaplain Grimaldus').models).toBe(4)
  })

  it('reads the comma thousands total from the title', () => {
    expect(list.points).toBe(1990)
  })
})

describe('parseArmyList - compact WTC export with no section headers (Tau)', () => {
  const list = parseArmyList(TAU_MONTKA)

  it('reads faction, detachment and points from the "+" header block', () => {
    expect(list.faction).toBe("Xenos - T'au Empire")
    expect(list.detachment).toBe("Mont'ka (Killing Blow)")
    expect(list.points).toBe(2000)
  })

  it('parses every unit even though the export has no section headers', () => {
    // The export header states "NUMBER OF UNITS: 18".
    expect(list.units).toHaveLength(18)
  })

  it('routes "CharN" slots to characters and everything else to other', () => {
    // 3 Commanders + The Twin Lance carry a CharN slot.
    expect(countByCategory(list, 'characters')).toBe(4)
    expect(countByCategory(list, 'other')).toBe(14)
  })

  it('reads the model count from the leading "Nx" on the unit line', () => {
    expect(unit(list, 'Broadside Battlesuits').models).toBe(2)
    expect(unit(list, 'Pathfinder Team').models).toBe(10)
    expect(unit(list, 'Stealth Battlesuits').models).toBe(5)
    expect(unit(list, 'Crisis Fireknife Battlesuits').models).toBe(3)
    expect(unit(list, 'The Twin Lance').models).toBe(2)
  })

  it('parses units whose weapons trail the points on the same line', () => {
    expect(unit(list, 'Ghostkeel Battlesuit').points).toBe(160)
    expect(unit(list, 'Ghostkeel Battlesuit').models).toBe(1)
    expect(unit(list, 'Piranhas').points).toBe(60)
  })

  it('strips the "CharN:" slot and "Nx" prefix from the display name', () => {
    // Would be "Char4: 1x Commander in Enforcer Battlesuit" unstripped.
    expect(list.units.some((u) => u.name === 'Commander in Enforcer Battlesuit')).toBe(true)
    expect(list.units.every((u) => !/^char\d+:/i.test(u.name))).toBe(true)
    expect(list.units.every((u) => !/^\d+x /.test(u.name))).toBe(true)
  })

  it('reads wargear that trails the points on the same line', () => {
    expect(unit(list, 'Ghostkeel Battlesuit').wargear).toEqual([
      'Ghostkeel fists',
      'Cyclic ion raker',
      'Twin fusion blaster',
    ])
  })

  it('strips per-model counts and model labels from the wargear', () => {
    // Written as "... 3x Missile pod ..." and "Broadside Shas'vre: Marker Drone".
    expect(unit(list, 'Commander in Enforcer Battlesuit').wargear).toContain('Missile pod')
    expect(unit(list, 'Broadside Battlesuits').wargear).toContain('Marker Drone')
    expect(
      list.units.every((u) => u.wargear.every((w) => !/^\d+(x|\s+with)\s/i.test(w)))
    ).toBe(true)
  })

  it('reads the enhancement of a compact-export character', () => {
    expect(unit(list, 'Commander in Enforcer Battlesuit').enhancement).toBe(
      "Exemplar of the Mont'ka"
    )
  })
})

describe('parseArmyList - empty and junk input', () => {
  it('returns an empty list for blank input', () => {
    const list = parseArmyList('   \n  \n')
    expect(list.units).toHaveLength(0)
    expect(list.points).toBeNull()
  })

  it('does not throw on free text with no units', () => {
    const list = parseArmyList('hello world\nthis is not a list')
    expect(list.units).toHaveLength(0)
  })
})

describe('parseArmyList - attachments and detachment cost', () => {
  it('reads the detachment cost from the app title export', () => {
    const list = parseArmyList(BARK_AT_THE_MOON)
    expect(list.detachmentPoints).toBe(3)
  })

  it('leaves the cost unset when the export does not state one', () => {
    // The WTC "+" header block has a DETACHMENT line but no points.
    expect(parseArmyList(CHAOS_DAEMONS_WTC).detachmentPoints).toBeNull()
  })

  it('names the leader on the unit it joined, per "Attached unit" block', () => {
    const list = parseArmyList(BARK_AT_THE_MOON)
    // Block 1 is Logan Grimnar with a 5-strong Wolf Guard Terminators, block 3
    // is Arjac Rockfist with another one.
    const terminators = list.units.filter((u) => u.name === 'Wolf Guard Terminators')
    expect(terminators.map((u) => leaderNames(u))).toEqual([['Logan Grimnar'], ['Arjac Rockfist']])
    expect(leaderNames(unit(list, 'Wolf Guard Headtakers'))).toEqual(['Ragnar Blackmane'])
  })

  it('leaves the leader itself unattached, so it keeps its own entry', () => {
    const list = parseArmyList(BARK_AT_THE_MOON)
    expect(unit(list, 'Logan Grimnar').leaders).toEqual([])
    expect(unit(list, 'Logan Grimnar').category).toBe('characters')
  })

  it('gives an unled unit no leaders', () => {
    const list = parseArmyList(BARK_AT_THE_MOON)
    expect(unit(list, 'Gladiator Lancer').leaders).toEqual([])
  })

  it('reads the WTC "Leading:" line as the attachment', () => {
    const list = parseArmyList(SORORITAS_LEADING)
    expect(leaderNames(unit(list, 'Zephyrim Squad'))).toEqual(['Canoness with Jump Pack'])
    expect(leaderNames(unit(list, 'Battle Sisters Squad'))).toEqual(['Palatine'])
    expect(unit(list, 'Canoness with Jump Pack').enhancement).toBe('Divine Aspect')
  })

  it('keeps the "Leading:" line out of the wargear', () => {
    const list = parseArmyList(SORORITAS_LEADING)
    expect(unit(list, 'Canoness with Jump Pack').wargear).toEqual(['Blessed Halberd'])
  })
})

describe('parseArmyList - two units of the same name, each with a leader', () => {
  const list = parseArmyList(SORORITAS_LEADING)

  it('gives each squad its own leader instead of piling them on the first', () => {
    const squads = list.units.filter((u) => u.name === 'Battle Sisters Squad')
    expect(squads).toHaveLength(2)
    expect(squads.map((u) => leaderNames(u))).toEqual([['Palatine'], ['Canoness']])
  })
})

describe('parseArmyList - attached units without the numbered labels', () => {
  it('pairs each leader with its own bodyguard, labels or not', () => {
    // Not every app version writes the "Attached Unit N" lines. A new block
    // starts at each leader, so the pairing does not depend on them.
    const stripped = BARK_AT_THE_MOON.split('\n')
      .filter((l) => !/^attached unit \d+$/i.test(l.trim()))
      .join('\n')
    const list = parseArmyList(stripped)
    expect(leaderNames(unit(list, 'Wolf Guard Headtakers'))).toEqual(['Ragnar Blackmane'])
    const terminators = list.units.filter((u) => u.name === 'Wolf Guard Terminators')
    expect(terminators.map((u) => leaderNames(u))).toEqual([['Logan Grimnar'], ['Arjac Rockfist']])
  })
})

describe('parseArmyList - a transport bought alongside an attached unit', () => {
  // A Rhino in the same attached block is not led by the character. Marking it
  // as led would fold it into the character's entry and drop it from the list.
  const list = parseArmyList(`Sisters (500 points)

Adepta Sororitas
Hallowed Martyrs (3 Detachment Points)

ATTACHED UNITS

Attached Unit 1

Palatine (60 points)
• Attached as: Leader (Character)
  • 1x Palatine blade

Battle Sisters Squad (105 points)
• Attached as: Bodyguard (Battleline)
  • 1x Sister Superior
    • 1x Power weapon
  • 9x Battle Sister
    • 9x Boltgun

Immolator (125 points)
• Attached as: Dedicated Transport
  • 1x Immolation flamer`)

  it('leads the squad but not the transport', () => {
    expect(leaderNames(unit(list, 'Battle Sisters Squad'))).toEqual(['Palatine'])
    expect(unit(list, 'Immolator').category).toBe('transports')
    expect(unit(list, 'Immolator').leaders).toEqual([])
  })
})
