import type { ParsedArmyList, ArmyListCategory, ParsedUnit } from './types'
import { CATEGORY_ORDER } from './types'

// Parser for Warhammer 40,000 app list exports. The app ships several export
// shapes and users may paste any of them, so the parser is deliberately
// tolerant. Two families are handled:
//
//   Title format   - starts with "<name> (<pts> points/Points)", then faction
//                    lines, then section headers (CHARACTERS, BATTLELINE,
//                    OTHER DATASHEETS, ATTACHED UNITS, ...). Units read as
//                    "<name> (<pts> points)". Sub-bullets (•, ◦) list models
//                    and their weapons.
//   WTC/+++ format - a "+ FACTION KEYWORD:" header block, then CHARACTER /
//                    BATTLELINE / OTHER DATASHEETS sections with "<name>
//                    (<pts> pts)" units. The block is often pasted on top of a
//                    plain title-format export, so both are read.
//
// Name, points, model count, wargear and a display category are extracted. The
// category buckets mirror what the app shows; attached units are folded into
// characters (the leader) and battleline/other (the bodyguard) so the list
// reads as one clean army.

// The bucket a section header maps to. ATTACHED is special: the units inside
// carry their own "Attached as:" line that decides their real bucket.
type SectionCategory = ArmyListCategory | 'attached'

// Trimmed, upper-cased section headers -> bucket.
const SECTION_HEADERS: Record<string, SectionCategory> = {
  CHARACTER: 'characters',
  CHARACTERS: 'characters',
  BATTLELINE: 'battleline',
  'BATTLE LINE': 'battleline',
  'DEDICATED TRANSPORTS': 'transports',
  'DEDICATED TRANSPORT': 'transports',
  TRANSPORTS: 'transports',
  'OTHER DATASHEETS': 'other',
  'OTHER DATASHEET': 'other',
  OTHER: 'other',
  'ALLIED UNITS': 'other',
  ALLIES: 'other',
  'ATTACHED UNITS': 'attached',
  'ATTACHED UNIT': 'attached',
}

// Thousands separators the app emits: a comma, a dot, or a space in any of the
// widths it uses (plain, no-break, narrow no-break, thin). Locale decides which,
// so "1 995", "1,995" and "2.000 Points" all have to read the same. Points are
// always whole numbers, so a dot here is never a decimal point.
const THOUSANDS_SEPARATORS = ',.\\u0020\\u00a0\\u202f\\u2009'

// "<name> (1,995 points)" / "(390 pts)" / "(2 000 Points)". The word after the
// number is required so plain parentheticals like "(132)" (app version) never
// match. A trailing ": <wargear>" is captured because compact exports put a
// unit's weapons after the points on the same line (e.g. "Ghostkeel Battlesuit
// (160 pts): Ghostkeel fists, ..."). A trailing "*" is allowed because 11th
// edition exports footnote a unit that also carries the Battleline keyword, and
// a trailing bracketed or dashed note because players annotate a line
// ("[proxy]", "- Pablo Escobar himself").
const UNIT_LINE = new RegExp(
  `^(.+?)\\s*\\(([\\d${THOUSANDS_SEPARATORS}]+)\\s*(?:points|pts)\\)\\*?(?:\\s*\\[[^\\]]*\\])?(?:\\s*:\\s*(.*?))?(?:\\s+[-\\u2013\\u2014]\\s.*)?\\s*$`,
  'i'
)

// The five 11th edition force dispositions. An export names one on its own line
// in the header, between the detachment and the battle size, where a chapter or
// legion would otherwise be read as the subfaction.
const DISPOSITION_NAMES =
  /^(take and hold|purge the foe|reconnaissance|priority assets|disruption)$/i

// "+ Total Army Points: 1,995" in the WTC/+++ header block.
const TOTAL_POINTS_LINE = new RegExp(`^total army points:\\s*([\\d${THOUSANDS_SEPARATORS}]+)`, 'i')

// The battle sizes the app names. A battle-size line reads exactly like a unit
// line, so it is matched twice: to keep it out of the units, and to read the
// army total off it.
const BATTLE_SIZES = 'strike force|incursion|onslaught|combat patrol'

const NON_UNIT_NAMES = new RegExp(`^(?:${BATTLE_SIZES})$`, 'i')

// "Strike Force (2,000 Points)", and the same line written without its
// parentheses as "Strike Force 1995pts". Every export states the battle size,
// so it is the one army total that is always there, even when the list has no
// title line to carry one.
const BATTLE_SIZE_LINE = new RegExp(
  `^(?:${BATTLE_SIZES})\\s*\\(?\\s*([\\d${THOUSANDS_SEPARATORS}]+)\\s*(?:points|pts)\\)?\\s*$`,
  'i'
)

// The app signs its exports off with a build stamp, and some exports run the
// list's own title straight onto the end of it. Left alone the whole thing
// reads as a unit line, putting a datasheet called "Exported with App Version"
// in the list.
const EXPORT_FOOTER = /^exported with app version\b/i

// Whether a line that reads like "<name> (<pts> points)" is in fact chrome the
// export puts around the list: its battle size, or the build stamp it signs off
// with. Both look exactly like a unit and neither is one.
function isExportChrome(name: string): boolean {
  return NON_UNIT_NAMES.test(name) || EXPORT_FOOTER.test(name)
}

// "Ironstorm Spearhead (3 Detachment Points)", and the same suffix on a
// "+ DETACHMENT:" field. The count is a property of the detachment, not part of
// its name. The name is optional because some exports break the line, leaving a
// bare "(3 Detachment Points)" of its own.
const DETACHMENT_POINTS = /^(.*?)\s*\((\d+)\s*detachment points\)/i

// Players drop links to a list builder or a theme song in the header, often
// with a few words in front ("Theme song: https://..."). A faction or a chapter
// never carries a link, so the whole line goes, prefix and all.
const CARRIES_LINK = /(?:https?:\/\/|www\.)\S/i

// Well past the longest real faction or chapter name ("Adeptus Mechanicus" is
// 18). Anything longer in the header is the list's description.
const MAX_FACTION_NAME_LENGTH = 60

// "3x Wolf Guard" -> count 3. The bullet marker is stripped before matching.
const COUNT_PREFIX = /^(\d+)x\s+/i

// Compact WTC exports prefix a character with its roster slot, e.g.
// "Char4: 1x Commander ...". The same slot id appears in the header WARLORD line.
const CHAR_PREFIX = /^(char\d+):\s*/i

// Compact exports write a whole model's loadout on one line, with the model in
// front of it ("1x Broadside Shas'vre: Marker Drone, Shield Drone") and
// per-model counts spelled out either way ("3x Storm Shield", "3 with Close
// combat weapon"). A fragment can carry several of these in a row, e.g.
// "Crisis Shas'ui: 2 with Gun Drone", so they are peeled off until only the
// wargear name is left.
const LOADOUT_PREFIX = /^(?:(?:[^:]+:|\d+\s+with|\d+x)\s*)+/i

const BULLET_CHARS = '•◦▪‣·*-'

// The app marks a sub-bullet with "◦" under a "•" or "*" parent. Some exports
// indent that second level and some do not, so the marker carries the level on
// its own: a "◦" always sits one step below the bullet above it, indented or
// not. Without this a flat export reads as one level and a squad's weapons look
// like more models.
const SUB_BULLET = '◦'

function stripBullet(line: string): { indent: number; text: string; bulleted: boolean } {
  // Indent is the visual depth: leading whitespace, then an optional bullet
  // marker also counts as depth so a "• foo" sits deeper than the line above it
  // even at the same left margin.
  const leading = line.length - line.trimStart().length
  let rest = line.slice(leading)
  let marker = ''
  if (rest.length > 0 && BULLET_CHARS.includes(rest[0])) {
    marker = rest[0]
    rest = rest.slice(1).trimStart()
  }
  const depth = marker === SUB_BULLET ? 2 : marker ? 1 : 0
  return { indent: leading + depth, text: rest, bulleted: marker !== '' }
}

const SEPARATOR_RE = new RegExp(`[${THOUSANDS_SEPARATORS}]`, 'g')

function toNumber(raw: string): number | null {
  const n = Number(raw.replace(SEPARATOR_RE, ''))
  return Number.isFinite(n) ? n : null
}

// What a line inside a unit block says. Everything the parser reads is named
// here, so each reader picks its kind instead of running its own regex over
// every line, and wargear is simply what is left over.
type LineKind =
  | 'attachedAs'
  | 'leading'
  | 'enhancement'
  | 'warlord'
  | 'trailer'
  | 'content'

interface BodyLine {
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

function classify(text: string): { kind: LineKind; value?: string } {
  if (/^attached as:/i.test(text)) return { kind: 'attachedAs' }
  // WTC exports name the unit a character joins on its own line:
  // "Leading: Zephyrim".
  const leading = text.match(/^leading:\s*(.+)$/i)
  if (leading) return { kind: 'leading', value: leading[1].trim() }
  // "Enhancement:" and "Enhancements:", dropping a trailing "(Upgrade)" or
  // "(+15 pts)" annotation the app sometimes appends.
  const labelled = text.match(
    /^enhancements?:\s*(.+?)(?:\s*\((?:upgrade|\+?[\d,]+\s*pts?)\))?\s*$/i
  )
  if (labelled) return { kind: 'enhancement', value: labelled[1].trim() }
  if (/^warlord$/i.test(text)) return { kind: 'warlord' }
  if (/^exported with/i.test(text)) return { kind: 'trailer' }
  // WTC exports write the enhancement with no label at all, just its cost:
  // "Fade to Darkness (+30 pts)".
  const priced = text.match(/^(.+?)\s*\(\+?[\d,]+\s*pts?\)\s*$/i)
  if (priced) return { kind: 'enhancement', value: priced[1].trim() }
  return { kind: 'content' }
}

// Reads a unit's body lines into a depth-annotated, classified list. An
// unbulleted line is a continuation of the bullet above it, not a child of it:
// the app wraps a model's extra weapons onto plain indented lines. Pulling them
// up to the bullet's depth keeps model detection and wargear collection honest.
function readBody(bodyLines: string[]): BodyLine[] {
  const out: BodyLine[] = []
  let lastBulletIndent: number | null = null
  for (const line of bodyLines) {
    if (line.trim().length === 0) continue
    const { indent, text, bulleted } = stripBullet(line)
    if (bulleted) lastBulletIndent = indent
    const count = text.match(COUNT_PREFIX)
    out.push({
      depth: bulleted ? indent : (lastBulletIndent ?? indent),
      bulleted,
      text,
      count: count ? Number(count[1]) : null,
      ...classify(text),
    })
  }
  return out
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
 * A flat group whose opener is written "1x" is a lone model listing its weapons
 * ("• 1x Armoured tracks • 1x Flamestorm cannon"), so every line in it is
 * wargear and the unit falls back to one model. A higher count means a squad
 * ("• 6x Sanguinary Guard" then its weapons), so the opener is a model.
 *
 * The flat shape does not mark models, so one case stays out of reach there: a
 * model carrying no wargear, listed straight before the next model, reads
 * exactly like wargear and is missed. That undercounts a few units rather than
 * multiplying every squad by its weapon list.
 */
function findModelLines(body: BodyLine[]): Set<BodyLine> {
  const counted = body.filter((l) => l.kind === 'content' && l.count !== null)
  const bulletDepths = counted.filter((l) => l.bulleted).map((l) => l.depth)
  // Nothing bulleted at all: a lone character listing only its weapons.
  if (bulletDepths.length === 0) return new Set()
  const modelDepth = Math.min(...bulletDepths)
  const outerBullets = counted.filter((l) => l.bulleted && l.depth === modelDepth)

  // The wargear nests under its model, so every outer bullet is a model.
  if (body.some((l) => l.kind === 'content' && l.depth > modelDepth)) return new Set(outerBullets)

  const openers: BodyLine[] = []
  let previousOpened = false
  for (const line of counted) {
    const opensGroup = line.bulleted && line.depth === modelDepth
    if (opensGroup && !previousOpened) openers.push(line)
    previousOpened = opensGroup
  }

  const namesModels = openers.length > 1 || (openers[0]?.count ?? 0) > 1
  return new Set(namesModels ? openers : [])
}

function countModels(body: BodyLine[], modelLines: Set<BodyLine>): number | null {
  // No model line found: a single-model unit as long as it has any content.
  if (modelLines.size === 0) return body.length > 0 ? 1 : null
  let total = 0
  for (const line of modelLines) total += line.count ?? 0
  return total > 0 ? total : null
}

// Weapons and wargear: the content lines that are not model lines, plus
// whatever trailed the points on the unit line. Counts are stripped and entries
// deduped, so a squad reads "Bolt pistol, Bolt rifle" instead of repeating per
// model.
function collectWargear(
  body: BodyLine[],
  modelLines: Set<BodyLine>,
  sameLine: string | null
): string[] {
  const seen = new Set<string>()
  const items: string[] = []

  const add = (entry: string) => {
    for (const part of entry.split(',')) {
      const name = part.trim().replace(LOADOUT_PREFIX, '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push(name)
    }
  }

  if (sameLine) add(sameLine)
  for (const line of body) {
    if (line.kind !== 'content') continue
    if (modelLines.has(line)) continue
    add(line.text)
  }
  return items
}

// The bucket for a unit inside an ATTACHED UNITS section, read from its
// "Attached as:" line. Leaders are characters; bodyguards annotated Battleline
// go to battleline, everything else to other.
function attachedCategory(attachedAs: string | null): ArmyListCategory {
  if (!attachedAs) return 'other'
  if (/leader|character/i.test(attachedAs)) return 'characters'
  if (/battleline/i.test(attachedAs)) return 'battleline'
  if (/transport/i.test(attachedAs)) return 'transports'
  return 'other'
}

interface HeaderInfo {
  name: string | null
  faction: string | null
  subfaction: string | null
  detachment: string | null
  detachmentPoints: number | null
  disposition: string | null
  points: number | null
}

function equalsIgnoringCase(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0
}

// Reads the preamble that precedes the first section header. A list may carry
// a "+ FIELD:" block, a title-format header, or both stacked, so this reads
// whichever parts are present rather than choosing one shape.
function parseHeader(preamble: string[]): HeaderInfo {
  const info: HeaderInfo = {
    name: null,
    faction: null,
    subfaction: null,
    detachment: null,
    detachmentPoints: null,
    disposition: null,
    points: null,
  }

  // A "+ FIELD:" block states some of the header outright. It is not always the
  // whole header though: WTC entries routinely paste the block on top of an
  // ordinary title-format export, so read the block, then carry on reading
  // whatever is left rather than returning on the block alone.
  for (const raw of preamble.filter((l) => l.trim().startsWith('+'))) {
    const line = raw.replace(/^\s*\+\s*/, '').trim()
    const faction = line.match(/^faction(?: keyword| used)?:\s*(.+)$/i)
    if (faction) info.faction ??= faction[1].trim()
    const det = line.match(/^detachment:\s*(.+)$/i)
    if (det && !info.detachment) {
      const value = det[1].trim()
      const withPoints = value.match(DETACHMENT_POINTS)
      info.detachment = withPoints ? withPoints[1].trim() : value
      if (withPoints) info.detachmentPoints = toNumber(withPoints[2])
    }
    const disposition = line.match(/^force dispositions?:\s*(.+)$/i)
    if (disposition) info.disposition ??= disposition[1].trim()
    const pts = line.match(TOTAL_POINTS_LINE)
    if (pts) info.points ??= toNumber(pts[1])
  }

  const lines = preamble.map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('+'))
  if (lines.length === 0) return info

  // Title line: "<name> (<pts> points)". Not every export has one, and when it
  // is missing the first line is already the faction, so only skip it when it
  // really was a title.
  const firstLine = lines[0].match(UNIT_LINE)
  const title = firstLine && !NON_UNIT_NAMES.test(firstLine[1].trim()) ? firstLine : null
  if (title) {
    info.name = title[1].trim()
    info.points ??= toNumber(title[2])
  }

  // Skip the first line only when it really was a title. A list that opens on
  // its battle size still has to read that line, or the army total is lost.
  for (const line of title ? lines.slice(1) : lines) {
    const det = line.match(DETACHMENT_POINTS)
    if (det && !info.detachment) {
      // Some exports break the line, leaving a bare "(3 Detachment Points)".
      // The detachment is then the plain line just read, which up to here has
      // been taken for the subfaction.
      const named = det[1].trim()
      const detachment = named || info.subfaction
      if (detachment) {
        info.detachment = detachment
        info.detachmentPoints = toNumber(det[2])
        if (!named) info.subfaction = null
        continue
      }
    }
    if (/^force disposition/i.test(line)) continue
    if (DISPOSITION_NAMES.test(line)) {
      info.disposition ??= line
      continue
    }
    const battleSize = line.match(BATTLE_SIZE_LINE)
    if (battleSize) {
      info.points ??= toNumber(battleSize[1])
      continue
    }
    // Skip any parenthetical line (battle size, mission notes) — factions and
    // chapters never carry parentheses.
    if (line.includes('(')) continue
    // Skip the optional free-text description the app puts under the title. A
    // faction or chapter name is short and is not a sentence, so a long line or
    // one carrying sentence punctuation is prose, not a faction.
    if (line.length > MAX_FACTION_NAME_LENGTH || /\.(\s|$)/.test(line)) continue
    if (CARRIES_LINK.test(line)) continue
    // First two plain lines are faction then subfaction (chapter/legion). A
    // "+ FACTION:" header names the same faction the list then repeats, so a
    // line equal to the faction is that repeat, not a chapter.
    if (!info.faction) info.faction = line
    else if (!info.subfaction && !equalsIgnoringCase(line, info.faction)) info.subfaction = line
  }

  return info
}

// The first line after a leading "+++ ... +++" header block: the first line
// that is not blank and not part of the block ("+++" fences, "+ FIELD:" lines,
// and "&" continuations). Used to find where units start in a compact export
// that lists them straight after the block with no section headers.
function headerBlockEnd(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t === '' || t.startsWith('+') || t.startsWith('&')) continue
    return i
  }
  return lines.length
}

// A unit plus what the export said about its attachment, which needs every
// other unit to resolve. The two export families spell it differently: the app
// puts a leader and its bodyguard together in the attached section, WTC names
// the led unit on the character's "Leading:" line.
interface WorkingUnit extends Omit<ParsedUnit, 'leaders'> {
  /** The characters leading this unit, held by reference until ordering. */
  leaders: WorkingUnit[]
  /** Which run of attached units this belongs to. Each leader starts one. */
  block: number | null
  /** The unit named on a "Leading:" line, if the export carries one. */
  leads: string | null
}

// The unit a "Leading:" line points at. Claimed units are off the table, so two
// characters leading two squads of the same name take one each.
function findLedUnit(
  units: WorkingUnit[],
  wanted: string,
  claimed: Set<WorkingUnit>
): WorkingUnit | undefined {
  const want = wanted.toLowerCase()
  const free = units.filter((u) => !claimed.has(u) && u.category !== 'characters')
  return (
    free.find((u) => u.name.toLowerCase() === want) ??
    // The two sides do not always spell the unit out in full ("Leading:
    // Zephyrim" against a "Zephyrim Squad"), so fall back to a prefix match.
    free.find(
      (u) => u.name.toLowerCase().startsWith(want) || want.startsWith(u.name.toLowerCase())
    )
  )
}

// Writes each character's name onto the unit it leads.
function resolveAttachments(units: WorkingUnit[]): void {
  const claimed = new Set<WorkingUnit>()

  for (const character of units) {
    if (character.category !== 'characters') continue

    if (character.leads) {
      const led = findLedUnit(units, character.leads, claimed)
      if (led) {
        led.leaders.push(character)
        claimed.add(led)
      }
      continue
    }

    // Otherwise the units following it in its own block are the ones it leads.
    if (character.block === null) continue
    for (const other of units) {
      if (other === character || other.block !== character.block) continue
      if (other.category === 'characters') continue
      // A dedicated transport in the block is not led by the character, it is
      // just bought alongside it.
      if (other.category === 'transports') continue
      other.leaders.push(character)
    }
  }
}

interface PendingUnit {
  name: string
  points: number | null
  body: string[]
  /** Model count read from a leading "Nx" on the unit line, if present. */
  count: number | null
  /** The "CharN" roster slot the unit line carried, if any. */
  charId: string | null
  /** Wargear that trailed the points on the unit line, if any. */
  sameLineWargear: string | null
}

export function parseArmyList(input: string): ParsedArmyList {
  const lines = input.replace(/\r\n?/g, '\n').split('\n')

  // Normalise every line once, so the section-header lookup below and the main
  // loop share the work.
  const keys = lines.map((l) => l.trim().toUpperCase().replace(/\s+/g, ' '))
  const firstSection = keys.findIndex((k) => k in SECTION_HEADERS)

  // Where the unit body begins. With section headers the preamble is everything
  // before the first one. Without them (a compact export that lists units right
  // after the "+++" block) the preamble is that leading block.
  const bodyStart = firstSection >= 0 ? firstSection : headerBlockEnd(lines)
  const header = parseHeader(lines.slice(0, bodyStart))

  const units: WorkingUnit[] = []
  // Null until a section header is seen, so lists with no headers fall back to
  // per-unit inference (a "CharN" slot is a character, everything else "other").
  let currentSection: SectionCategory | null = null
  // Numbers the runs of attached units. The export usually labels them
  // ("Attached unit 2") and those labels are what the app grouped by, so they
  // win. Not every app version writes them; without them a new run starts at
  // every leader instead.
  let attachedBlock = 0
  let labelledBlocks = false

  // Accumulate the lines that belong to the unit currently being read so its
  // model count and flags can be computed when the next unit or section starts.
  let pending: PendingUnit | null = null

  const flush = () => {
    if (!pending) return
    const body = readBody(pending.body)
    const modelLines = findModelLines(body)
    const attached = currentSection === 'attached'
    const attachedAs = body.find((l) => l.kind === 'attachedAs')?.text ?? null
    const category: ArmyListCategory =
      currentSection === 'attached'
        ? attachedCategory(attachedAs)
        : (currentSection ?? (pending.charId ? 'characters' : 'other'))
    // A leader opens a block, so a character attached as support joins the
    // leader's block instead of starting one of its own. Without the
    // annotation any character opens one, as it always did.
    const opensBlock = attachedAs ? /leader/i.test(attachedAs) : category === 'characters'
    if (attached && !labelledBlocks && opensBlock) attachedBlock++
    units.push({
      name: pending.name,
      points: pending.points,
      models: pending.count ?? countModels(body, modelLines),
      category,
      enhancement: body.find((l) => l.kind === 'enhancement')?.value ?? null,
      wargear: collectWargear(body, modelLines, pending.sameLineWargear),
      leaders: [],
      block: attached ? attachedBlock : null,
      leads: body.find((l) => l.kind === 'leading')?.value ?? null,
    })
    pending = null
  }

  for (let i = bodyStart; i < lines.length; i++) {
    const raw = lines[i]

    if (keys[i] in SECTION_HEADERS) {
      flush()
      currentSection = SECTION_HEADERS[keys[i]]
      continue
    }

    // "Attached unit 1" style sub-labels are not units. They mark where one run
    // of attached units ends and the next begins, which is exactly the grouping
    // to keep.
    if (/^ATTACHED UNIT \d+$/.test(keys[i])) {
      flush()
      labelledBlocks = true
      attachedBlock++
      continue
    }

    // Only a line carrying "(<n> points)" can be a unit line. The cheap check
    // keeps the lazy UNIT_LINE match off the weapon bullets, which are most of
    // the input.
    if (!raw.includes('(')) {
      if (pending) pending.body.push(raw)
      continue
    }

    const { bulleted } = stripBullet(raw)
    const unitMatch = raw.match(UNIT_LINE)
    // A unit line starts at the left margin and is not bulleted (bulleted
    // "(x pts)" lines are enhancements/wargear inside a unit).
    if (unitMatch && !bulleted && !isExportChrome(unitMatch[1].trim())) {
      flush()
      let name = unitMatch[1].trim()
      // Peel a "CharN:" roster slot, then a leading "Nx" model count, off the
      // name (compact exports carry both; the other export shapes carry neither).
      const charMatch = name.match(CHAR_PREFIX)
      const charId = charMatch ? charMatch[1] : null
      if (charMatch) name = name.slice(charMatch[0].length)
      const countMatch = name.match(COUNT_PREFIX)
      const count = countMatch ? Number(countMatch[1]) : null
      if (countMatch) name = name.slice(countMatch[0].length)
      pending = {
        name: name.trim(),
        points: toNumber(unitMatch[2]),
        body: [],
        count,
        charId,
        sameLineWargear: unitMatch[3]?.trim() || null,
      }
      continue
    }

    if (pending) pending.body.push(raw)
  }
  flush()
  resolveAttachments(units)

  const summedPoints = units.reduce((sum, u) => sum + (u.points ?? 0), 0)

  // Emit in display order. Attached leaders and their bodyguards are interleaved
  // in the export, so without this the sections would come out shuffled.
  const ordered = CATEGORY_ORDER.flatMap((category) =>
    units.filter((u) => u.category === category)
  )
  // Leaders are held by reference while parsing. Now that the order is final,
  // resolve them to a position so nothing downstream needs object identity.
  const position = new Map(ordered.map((u, i) => [u, i]))
  const display: ParsedUnit[] = ordered.map(({ block, leads, ...unit }) => ({
    ...unit,
    leaders: unit.leaders.map((l) => ({ index: position.get(l as WorkingUnit)!, name: l.name })),
  }))

  return {
    name: header.name,
    faction: header.faction,
    subfaction: header.subfaction,
    detachment: header.detachment,
    detachmentPoints: header.detachmentPoints,
    disposition: header.disposition,
    points: header.points ?? (summedPoints > 0 ? summedPoints : null),
    units: display,
  }
}
