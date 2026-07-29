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
//                    (<pts> pts)" units.
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

// "<name> (1,995 points)" / "(390 pts)" / "(2,000 Points)". Points may carry a
// comma thousands separator. The word after the number is required so plain
// parentheticals like "(132)" (app version) never match. A trailing ": <wargear>"
// is captured because compact exports put a unit's weapons after the points on
// the same line (e.g. "Ghostkeel Battlesuit (160 pts): Ghostkeel fists, ...").
const UNIT_LINE = /^(.+?)\s*\(([\d,]+)\s*(?:points|pts)\)(?:\s*:\s*(.*))?\s*$/i

// Battle-size and detachment lines look like unit lines but are not units.
const NON_UNIT_NAMES = /^(strike force|incursion|onslaught|combat patrol)$/i

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

function stripBullet(line: string): { indent: number; text: string; bulleted: boolean } {
  // Indent is the visual depth: leading whitespace, then an optional bullet
  // marker also counts as depth so a "• foo" sits deeper than the line above it
  // even at the same left margin.
  const leading = line.length - line.trimStart().length
  let rest = line.slice(leading)
  let bulleted = false
  if (rest.length > 0 && BULLET_CHARS.includes(rest[0])) {
    bulleted = true
    rest = rest.slice(1).trimStart()
  }
  return { indent: leading + (bulleted ? 1 : 0), text: rest, bulleted }
}

function toNumber(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

// What a line inside a unit block says. Everything the parser reads is named
// here, so each reader picks its kind instead of running its own regex over
// every line, and wargear is simply what is left over.
type LineKind = 'attachedAs' | 'enhancement' | 'warlord' | 'trailer' | 'content'

interface BodyLine {
  /** Visual depth, with unbulleted continuations pulled up to their bullet. */
  depth: number
  text: string
  kind: LineKind
  /** The enhancement name, for kind 'enhancement'. */
  value?: string
}

function classify(text: string): { kind: LineKind; value?: string } {
  if (/^attached as:/i.test(text)) return { kind: 'attachedAs' }
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
    out.push({
      depth: bulleted ? indent : (lastBulletIndent ?? indent),
      text,
      ...classify(text),
    })
  }
  return out
}

// The depth at which a unit's models sit. Models are the shallowest "Nx <name>"
// lines that have deeper children (their weapons). Null when nothing nests: the
// unit is then a single model (a lone character or a vehicle) and every bullet
// is a weapon.
function modelDepth(body: BodyLine[]): number | null {
  let found = Infinity
  for (let i = 0; i < body.length; i++) {
    const hasCount = COUNT_PREFIX.test(body[i].text)
    const next = body[i + 1]
    const hasChild = next ? next.depth > body[i].depth : false
    if (hasCount && hasChild) found = Math.min(found, body[i].depth)
  }
  return found === Infinity ? null : found
}

function countModels(body: BodyLine[], depth: number | null): number | null {
  if (depth === null) {
    // No nesting: a single-model unit as long as it has any content at all.
    return body.length > 0 ? 1 : null
  }
  let total = 0
  for (const line of body) {
    const m = line.text.match(COUNT_PREFIX)
    if (m && line.depth === depth) total += Number(m[1])
  }
  return total > 0 ? total : null
}

// Weapons and wargear: the content lines below the model lines, plus whatever
// trailed the points on the unit line. Counts are stripped and entries deduped,
// so a squad reads "Bolt pistol, Bolt rifle" instead of repeating per model.
function collectWargear(
  body: BodyLine[],
  depth: number | null,
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
    if (depth !== null && line.depth <= depth) continue
    add(line.text)
  }
  return items
}

// The bucket for a unit inside an ATTACHED UNITS section, read from its
// "Attached as:" line. Leaders are characters; bodyguards annotated Battleline
// go to battleline, everything else to other.
function attachedCategory(body: BodyLine[]): ArmyListCategory {
  const attachedAs = body.find((l) => l.kind === 'attachedAs')?.text
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
  points: number | null
}

// Reads the preamble that precedes the first section header. Handles both the
// title format and the "+ FACTION KEYWORD:" block.
function parseHeader(preamble: string[]): HeaderInfo {
  const info: HeaderInfo = {
    name: null,
    faction: null,
    subfaction: null,
    detachment: null,
    points: null,
  }

  const plusBlock = preamble.some((l) => l.trim().startsWith('+'))
  if (plusBlock) {
    for (const raw of preamble) {
      const line = raw.replace(/^\s*\+\s*/, '').trim()
      const faction = line.match(/^faction keyword:\s*(.+)$/i)
      if (faction) info.faction = faction[1].trim()
      const det = line.match(/^detachment:\s*(.+)$/i)
      if (det) info.detachment = det[1].trim()
      const pts = line.match(/^total army points:\s*([\d,]+)/i)
      if (pts) info.points = toNumber(pts[1])
    }
    return info
  }

  const lines = preamble.map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length === 0) return info

  // Title line: "<name> (<pts> points)".
  const titleMatch = lines[0].match(UNIT_LINE)
  if (titleMatch) {
    info.name = titleMatch[1].trim()
    info.points = toNumber(titleMatch[2])
  }

  for (const line of lines.slice(1)) {
    const det = line.match(/^(.+?)\s*\(\d+\s*detachment points\)/i)
    if (det && !info.detachment) {
      info.detachment = det[1].trim()
      continue
    }
    if (/^force disposition/i.test(line)) continue
    // Skip any parenthetical line (battle size, mission notes) — factions and
    // chapters never carry parentheses.
    if (line.includes('(')) continue
    // First two plain lines are faction then subfaction (chapter/legion).
    if (!info.faction) info.faction = line
    else if (!info.subfaction) info.subfaction = line
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

  const units: ParsedUnit[] = []
  // Null until a section header is seen, so lists with no headers fall back to
  // per-unit inference (a "CharN" slot is a character, everything else "other").
  let currentSection: SectionCategory | null = null

  // Accumulate the lines that belong to the unit currently being read so its
  // model count and flags can be computed when the next unit or section starts.
  let pending: PendingUnit | null = null

  const flush = () => {
    if (!pending) return
    const body = readBody(pending.body)
    const depth = modelDepth(body)
    const category: ArmyListCategory =
      currentSection === 'attached'
        ? attachedCategory(body)
        : (currentSection ?? (pending.charId ? 'characters' : 'other'))
    units.push({
      name: pending.name,
      points: pending.points,
      models: pending.count ?? countModels(body, depth),
      category,
      enhancement: body.find((l) => l.kind === 'enhancement')?.value ?? null,
      wargear: collectWargear(body, depth, pending.sameLineWargear),
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

    // "Attached unit 1" style sub-labels inside the attached section are not
    // units; skip them so they never start a block.
    if (/^ATTACHED UNIT \d+$/.test(keys[i])) {
      flush()
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
    if (unitMatch && !bulleted && !NON_UNIT_NAMES.test(unitMatch[1].trim())) {
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

  const summedPoints = units.reduce((sum, u) => sum + (u.points ?? 0), 0)

  // Emit in display order. Attached leaders and their bodyguards are interleaved
  // in the export, so without this the sections would come out shuffled.
  const ordered = CATEGORY_ORDER.flatMap((category) =>
    units.filter((u) => u.category === category)
  )

  return {
    name: header.name,
    faction: header.faction,
    subfaction: header.subfaction,
    detachment: header.detachment,
    points: header.points ?? (summedPoints > 0 ? summedPoints : null),
    units: ordered,
  }
}
