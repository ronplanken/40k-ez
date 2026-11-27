// "3x Wolf Guard" -> count 3. The bullet marker is stripped before matching.
export const COUNT_PREFIX = /^(\d+)x\s+/i

// What a line inside a unit block says. Everything the parser reads is named
// here, so each reader picks its kind instead of running its own regex over
// every line, and wargear is simply what is left over.
export type LineKind = 'attachedAs' | 'leading' | 'enhancement' | 'warlord' | 'trailer' | 'content'

export interface BodyLine {
  /** Visual depth, with unbulleted continuations pulled up to their bullet. */
  depth: number
  /** Whether the line carried a bullet marker of its own. */
  bulleted: boolean
  text: string
  kind: LineKind
  /** The leading "Nx" count, for lines that carry one. */
  count: number | null
  /** The enhancement name or the led unit's name, for those kinds. */
  value?: string
}

// The words a name compares on: lowercased, stripped of the leading count, of
// the "Squad" the app appends to some unit names, and of punctuation.
function nameWords(text: string): string[] {
  return text
    .replace(COUNT_PREFIX, '')
    .toLowerCase()
    .replace(/\bsquad\b/g, '')
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

// Whether a body line names the unit itself, which is how a squad writes its
// rank and file: "Daemonettes" lists "9x Daemonette", "Squighog Boyz" lists
// "6x Squighog Boy". The app also shortens the name to the words that identify
// the model ("Hyperadapted Raveners" lists "4x Raveners"), so the line matches
// on the last whole words of the unit name, with the plural one of them carries
// allowed to differ. Only the end of the name, because the front of it is what
// a weapon borrows: "Burna Boyz" lists both "4x Burna Boy", its models, and
// "4x Burna", the flamers they carry. It never runs the other way either, a
// line with more words than the unit name being wargear that took one of them,
// like a Piranha's "Piranha fusion blaster".
function namesTheUnit(text: string, unit: string[]): boolean {
  const named = nameWords(text)
  if (named.length === 0 || named.length > unit.length) return false
  const alike = (a: string, b: string) =>
    a === b || ['s', 'es', 'z'].some((p) => a + p === b || b + p === a)
  const offset = unit.length - named.length
  return named.every((word, i) =>
    i === named.length - 1 ? alike(word, unit[offset + i]) : word === unit[offset + i]
  )
}

/**
 * The lines that name a model, as opposed to a weapon.
 *
 * The app writes a unit as a run of groups, one per model type: the model, then
 * its wargear. Two shapes turn up, and only the first is nested:
 *
 *     • 4x Custodian Guard        • 19x Boy
 *     ◦ 2x Guardian spear         • 17x Choppa
 *     ◦ 1x Misericordia           2x Rokkit launcha
 *                                 • 1x Boss Nob
 *
 * When the wargear nests, the models are simply the counted bullets at the
 * outer depth. When it does not, the model is the counted bullet that *opens* a
 * group, and everything until the next group is its wargear: a bullet is a
 * model only when the line before it was not, which is what separates "19x Boy"
 * from the "17x Choppa" right under it.
 *
 * Some exports lose their indentation on the way in, leaving a model's own
 * wargear bulleted with nothing unbulleted to close the group off. Counts alone
 * cannot read those, because a squad and a lone vehicle write the same shape:
 *
 *     Daemonettes              Stormlord
 *     • 1x Alluress            • 1x Armoured tracks
 *     • 1x Slashing claws      • 2x Heavy stubber
 *     • 9x Daemonette          • 2x Lascannon
 *     • 1x Daemonic Icon       • 1x Vulcan mega-bolter
 *
 * What separates them is the name. A squad's rank and file is named after the
 * unit it fills ("Daemonettes" -> "9x Daemonette"), and a weapon never is, so
 * mid-run only a line naming the unit opens a group. The tank keeps every line
 * as wargear and stays one model.
 *
 * A flat group whose opener is written "1x" is a lone model listing its weapons
 * ("• 1x Armoured tracks • 1x Flamestorm cannon"), so every line in it is
 * wargear and the unit falls back to one model. A higher count means a squad
 * ("• 6x Sanguinary Guard" then its weapons), so the opener is a model.
 *
 * The flat shape still misses the models it cannot name: a squad's second model
 * type, listed under another model's wargear with a name of its own ("1x Nob on
 * Smasha Squig"), reads exactly like wargear. That undercounts a few units
 * rather than multiplying every squad by its weapon list.
 */
export function findModelLines(body: BodyLine[], unitName: string): Set<BodyLine> {
  const counted = body.filter((l) => l.kind === 'content' && l.count !== null)
  const bulletDepths = counted.filter((l) => l.bulleted).map((l) => l.depth)
  // Nothing bulleted at all: a lone character listing only its weapons.
  if (bulletDepths.length === 0) return new Set()
  const modelDepth = Math.min(...bulletDepths)

  // The wargear nests under its model, so every outer bullet is a model.
  if (body.some((l) => l.kind === 'content' && l.depth > modelDepth))
    return new Set(counted.filter((l) => l.bulleted && l.depth === modelDepth))

  // The loadout an "X with Y" unit name carries is dropped, because that half
  // names a weapon: a "Big Mek with Shokk Attack Gun" lists "1x Shokk Attack
  // Gun" and is still one model.
  const unit = nameWords(unitName.replace(/\swith\s.*$/i, ''))

  const groups: Array<{ line: BodyLine; hasWargear: boolean; rankAndFile: boolean }> = []
  // Whether a group is open. The first bullet of a run always opens one; after
  // that only the rank and file does, everything else being its wargear. Rank
  // and file comes several strong, so a lone "1x" naming the unit mid-run is
  // the weapon the unit was named after, like a Skull Cannon's skull cannon.
  let grouped = false
  for (const line of counted) {
    if (!(line.bulleted && line.depth === modelDepth)) {
      grouped = false
      continue
    }
    const rankAndFile = (line.count ?? 0) > 1 && namesTheUnit(line.text, unit)
    if (!grouped || rankAndFile) groups.push({ line, hasWargear: false, rankAndFile })
    else groups[groups.length - 1].hasWargear = true
    grouped = true
  }

  // A group that listed no wargear of its own, sitting right in front of the
  // rank and file, is kit the whole unit shares rather than a model of its own:
  // the Bomb Squig a mob of Squighog Boyz brings along. Rank and file is never
  // dropped itself, which no export has needed but is what the rule means.
  const openers = groups
    .filter((g, i) => g.hasWargear || g.rankAndFile || !groups[i + 1]?.rankAndFile)
    .map((g) => g.line)

  const namesModels = openers.length > 1 || (openers[0]?.count ?? 0) > 1
  return new Set(namesModels ? openers : [])
}

export function countModels(body: BodyLine[], modelLines: Set<BodyLine>): number | null {
  // No model line found: a single-model unit as long as it has any content.
  if (modelLines.size === 0) return body.length > 0 ? 1 : null
  let total = 0
  for (const line of modelLines) total += line.count ?? 0
  return total > 0 ? total : null
}
