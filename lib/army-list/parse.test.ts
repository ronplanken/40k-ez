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
  RED_GEAR_SPACED_POINTS,
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

describe('parseArmyList - space thousands separator with allied units (Red gear)', () => {
  const list = parseArmyList(RED_GEAR_SPACED_POINTS)

  it('reads a title total written with a space separator', () => {
    expect(list.name).toBe('Red gear')
    expect(list.points).toBe(1995)
  })

  it('parses the allied unit and its space-separated points', () => {
    expect(unit(list, 'Chaos Warhound Titan').points).toBe(1100)
    expect(unit(list, 'Chaos Warhound Titan').category).toBe('other')
  })

  it('keeps every unit and drops the battle-size line', () => {
    expect(list.units.map((u) => u.name)).toEqual([
      'Angron',
      'Khârn the Betrayer',
      'Khorne Berzerkers',
      'Chaos Rhino',
      'Chaos Warhound Titan',
    ])
  })

  it('reads the faction and detachment past the spaced-points lines', () => {
    expect(list.faction).toBe('World Eaters')
    expect(list.detachment).toBe('Brazen Engines, Butchers of Khorne, and Vessels of Wrath')
    expect(list.detachmentPoints).toBe(3)
  })

  it('leaves the free-text description out of the faction', () => {
    expect(list.subfaction).toBeNull()
  })

  it('still counts models in the squad', () => {
    expect(unit(list, 'Khorne Berzerkers').models).toBe(20)
    expect(unit(list, 'Angron').models).toBe(1)
  })
})

describe('parseArmyList - 11th edition exports', () => {
  const list = `Theme song (1995 points)

Space Marines
Salamanders
Forgefather's Seekers and Librarius Conclave (3 Detachment Points)
Priority Assets
Strike Force (2000 points)

Attached Units
Attached Unit 1

Librarian (95 points)
• Attached as: Leader (Character)
• Enhancement: Temporal Corridor

Painboy (105 points)
• Attached as: Support (Character)

Infernus Squad (180 points)
• Attached as: Bodyguard

Attached Unit 2

Captain (85 points)
• Attached as: Leader (Character)

Vanguard Veterans (210 points)
• Attached as: Bodyguard (Battleline)

CHARACTERS

Vulkan He'stan (85 points)
`

  it('keeps a disposition line out of the subfaction', () => {
    const parsed = parseArmyList(list)
    expect(parsed.subfaction).toBe('Salamanders')
    expect(parsed.disposition).toBe('Priority Assets')
  })

  it('names every character of an attached block on the unit it joined', () => {
    const parsed = parseArmyList(list)
    // The Painboy is attached as support, so it joins the Librarian's block
    // instead of starting one of its own.
    expect(leaderNames(unit(parsed, 'Infernus Squad'))).toEqual(['Librarian', 'Painboy'])
    expect(leaderNames(unit(parsed, 'Vanguard Veterans'))).toEqual(['Captain'])
  })

  it('leaves units outside an attached block unattached', () => {
    const parsed = parseArmyList(list)
    expect(leaderNames(unit(parsed, "Vulkan He'stan"))).toEqual([])
  })

  it('reads a dot as a thousands separator and a footnote star as part of the unit line', () => {
    const parsed = parseArmyList(`My list (2.000 Points)

Chaos Knights
Houndpack Lance (3 Detachment Points)
Reconnaissance
Strike Force (2.000 Points)

CHARACTERS

War Dog Karnivore (155 Points)*
• 1x Slaughterclaw

* This Datasheet also has the Battleline keyword
`)
    expect(parsed.points).toBe(2000)
    expect(parsed.units.map((u) => u.name)).toEqual(['War Dog Karnivore'])
    expect(parsed.units[0].points).toBe(155)
  })
})

// Real exports carry every variation the app and its users produce. Each case
// below came from a list that parsed wrong before.
describe('parseArmyList - real export variations', () => {
  it('reads the list under a "+++" WTC header block, not just the block', () => {
    const parsed = parseArmyList(`+++++++++++++++++++++++++
+ PLAYER NAME: Chong Liu
+ TEAM NAME: Team China
+ FACTION USED: Adeptus Custodes
+FORCE DISPOSITIONS: Reconnaissance
+++++++++++++++++++++++++
Set my heart to blaze (1,990 Points)

Adeptus Custodes
Lions of the Emperor and Silent Hunters (3 Detachment Points)
Reconnaissance
Strike Force (2,000 Points)

CHARACTERS

Trajann Valoris (135 Points)
• Warlord
`)
    expect(parsed.faction).toBe('Adeptus Custodes')
    expect(parsed.subfaction).toBeNull()
    expect(parsed.detachment).toBe('Lions of the Emperor and Silent Hunters')
    expect(parsed.points).toBe(1990)
    expect(parsed.units.map((u) => u.name)).toEqual(['Trajann Valoris'])
  })

  it('keeps the first line as the faction when the list has no title line', () => {
    const parsed = parseArmyList(`Emperor's Children
Strike Force (2000 points)
Carnival of Excess and Frenzied Host (3 Detachment Points)
Disruption

CHARACTERS

Lord Exultant (105 points)
`)
    expect(parsed.faction).toBe("Emperor's Children")
    expect(parsed.detachment).toBe('Carnival of Excess and Frenzied Host')
    expect(parsed.points).toBe(2000)
  })

  it('takes the army total from the battle size when nothing else states one', () => {
    const parsed = parseArmyList(`Adeptus Mechanicus
Lords of the Forge and Rad-Zone Corps (3 Detachment Points)
Priority Assets
Strike Force (2 000 Points)

CHARACTERS

Tech-Priest Manipulus (60 Points) [me frfr]
`)
    expect(parsed.points).toBe(2000)
    expect(parsed.units.map((u) => u.name)).toEqual(['Tech-Priest Manipulus'])
  })

  it('reads a unit annotated after its points with a dash', () => {
    const parsed = parseArmyList(`Drukhari
Kabalite Cartel and Tools of Torment (3 Detachment Points)
Disruption
Strike Force (2000 points)

CHARACTERS

Archon (80 points) - Pablo Escobar himself
• Warlord
`)
    expect(parsed.units.map((u) => u.name)).toEqual(['Archon'])
    expect(parsed.units[0].points).toBe(80)
  })

  it('reads a detachment whose points sit on the next line', () => {
    const parsed = parseArmyList(`Crayon Eating (1,995 Points)

Adeptus Custodes
Talons of the Emperor
(3 Detachment Points)
Take and Hold
Strike Force (2,000 Points)

CHARACTERS

Trajann Valoris (135 Points)
`)
    expect(parsed.faction).toBe('Adeptus Custodes')
    expect(parsed.detachment).toBe('Talons of the Emperor')
    expect(parsed.detachmentPoints).toBe(3)
    expect(parsed.subfaction).toBeNull()
    expect(parsed.points).toBe(1995)
  })

  it('reads the army total from a battle size on the first line', () => {
    const parsed = parseArmyList(`Strike Force (2,000 Points)

Adeptus Custodes
Lions of the Emperor (3 Detachment Points)
Take and Hold

CHARACTERS

Trajann Valoris (75 Points)
`)
    expect(parsed.points).toBe(2000)
    expect(parsed.faction).toBe('Adeptus Custodes')
    expect(parsed.name).toBeNull()
  })

  it('reads a battle size written without parentheses', () => {
    const parsed = parseArmyList(`Leagues of Votann
Needgaard Oathband (2DP) + Hearthband Covenant (1DP)
Force Dispositions: Purge The Foe
Strike Force 1995pts

CHARACTERS

Einhyr Champion (85 points)
`)
    expect(parsed.points).toBe(1995)
    expect(parsed.subfaction).toBeNull()
  })

  it('leaves the export footer out of the units', () => {
    const parsed = parseArmyList(`My list (2000 points)

Chaos Daemons
Legion of Excess (3 Detachment Points)
Strike Force (2000 points)

CHARACTERS

Flesh Hounds (75 points)

Exported with App Version: v2.3.0 (137), Data Version: v912my list (2000 points)
`)
    expect(parsed.units.map((u) => u.name)).toEqual(['Flesh Hounds'])
  })

  it('keeps the detachment count out of the detachment name', () => {
    const parsed = parseArmyList(`+++++++++++++++++++++++++
+ FACTION KEYWORD: T'au Empire
+ DETACHMENT: Mont'ka (3 Detachment Points)
+ TOTAL ARMY POINTS: 2000 pts
+++++++++++++++++++++++++

CHARACTERS

Ethereal (60 points)
`)
    expect(parsed.detachment).toBe("Mont'ka")
    expect(parsed.detachmentPoints).toBe(3)
  })

  it('does not read a link in the header as a faction, labelled or bare', () => {
    const bare = parseArmyList(`My list (2000 points)

Chaos Daemons
https://www.youtube.com/watch?v=VXcTKe0X1ZA
Legion of Excess (3 Detachment Points)

CHARACTERS

Bloodletters (75 points)
`)
    expect(bare.faction).toBe('Chaos Daemons')
    expect(bare.subfaction).toBeNull()

    // The link often has a few words in front of it, and the whole line has to
    // go: keeping the label would put it where the faction belongs.
    const labelled = parseArmyList(`Zerker POV - https://www.youtube.com/watch?v=5JJu-CTDLoc

Kill My Friends (2,000 Points)

World Eaters
Berzerker Warband (3 Detachment Points)

CHARACTERS

Khorne Berzerkers (180 points)
`)
    expect(labelled.faction).toBe('World Eaters')
    expect(labelled.subfaction).toBeNull()
  })
})

describe('parseArmyList - models and wargear in a flat unit block', () => {
  it('counts a model type once, not once per weapon it carries', () => {
    // The flat shape: wargear sits at the same bullet depth as its model, and
    // sometimes at a shallower one.
    const parsed = parseArmyList(`My list (2000 points)

Orks
More Dakka (3 Detachment Points)

BATTLELINE

Boyz (160 points)
• Attached as: Bodyguard (Battleline)
• 19x Boy
• 17x Choppa
2x Close combat weapon
2x Rokkit launcha
17x Shoota
17x Slugga
• 1x Boss Nob
• 1x Power klaw
1x Slugga
`)
    expect(parsed.units[0].models).toBe(20)
    expect(parsed.units[0].wargear).toEqual([
      'Choppa',
      'Close combat weapon',
      'Rokkit launcha',
      'Shoota',
      'Slugga',
      'Power klaw',
    ])
  })

  it('counts a second model type that opens its own group', () => {
    // Ghazghkull's datasheet brings Makari, listed after Ghazghkull's own
    // wargear, so both are models.
    const parsed = parseArmyList(`My list (2000 points)

Orks
More Dakka (3 Detachment Points)

CHARACTERS

Ghazghkull Thraka (235 points)
• 1x Ghazghkull Thraka
• Warlord
• 1x Gork's Klaw
1x Mork's Roar
• 1x Makari
• 1x Makari's stabba
`)
    expect(parsed.units[0].models).toBe(2)
    expect(parsed.units[0].wargear).toEqual(["Gork's Klaw", "Mork's Roar", "Makari's stabba"])
  })

  it('reads a vehicle as one model however many guns it lists', () => {
    const parsed = parseArmyList(`My list (2000 points)

Space Marines
Gladius Task Force (3 Detachment Points)

OTHER DATASHEETS

Land Raider Redeemer (240 points)
• 1x Armoured tracks
• 1x Flamestorm cannon
• 1x Twin assault cannon
• 1x Multi-melta
`)
    expect(parsed.units[0].models).toBe(1)
    expect(parsed.units[0].wargear).toEqual([
      'Armoured tracks',
      'Flamestorm cannon',
      'Twin assault cannon',
      'Multi-melta',
    ])
  })
})
