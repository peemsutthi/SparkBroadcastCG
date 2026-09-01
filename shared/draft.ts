// The pick/ban order, ported from the prototype's DRAFT_SEQUENCE.
// The index is the step; the value is the slot ids lit at that step.
//
// Both apps import this. The overlay highlights these ids and control names
// them on its button, so the two can never point at different slots — a drift
// that would look fine in review and be wrong on air.
export const DRAFT_SEQUENCE: string[][] = [
  [],
  ['bb-1'],
  ['rb-1'],
  ['bb-2'],
  ['rb-2'],
  ['bp-1'],
  ['rp-1', 'rp-2'],
  ['bp-2', 'bp-3'],
  ['rp-3'],
  ['rb-3'],
  ['bb-3'],
  ['rb-4'],
  ['bb-4'],
  ['rp-4'],
  ['bp-4', 'bp-5'],
  ['rp-5'],
]

export const LAST_PHASE = DRAFT_SEQUENCE.length - 1 // 15
export const SWAP_STEP = 16
export const DONE_STEP = 17

/** "Blue ban 1", "Red pick 1–2" — read off the same ids the overlay lights. */
export function phaseLabel(step: number): string {
  const ids = DRAFT_SEQUENCE[step]
  if (!ids || ids.length === 0) return ''
  const side = ids[0].startsWith('b') ? 'Blue' : 'Red'
  const action = ids[0][1] === 'b' ? 'ban' : 'pick'
  return `${side} ${action} ${ids.map((id) => id.split('-')[1]).join('–')}`
}

/** The CG outputs, each rendered by the one cg app at /cg/1 .. /cg/4 and
 *  held as its own state by the relay. Control routes a take to one of them;
 *  the array is the source for both control's picker and its output URLs. */
export const OUTPUTS = [1, 2, 3, 4]

// The relay protocol. Both pages and the server key what is on air by output
// *and* layer, so a take only replaces the layer on the output it names.
// `output` is optional on the wire: a message without one belongs to output 1,
// which is what a browser source still on the pre-multi-output URL sends.
export type Take = {
  type: 'take'
  output?: number
  layer: string
  template: string
  data: Record<string, unknown>
}
export type Clear = { type: 'clear'; output?: number; layer: string }
export type Msg = Take | Clear
export type OnAir = Record<string, Take>

/** The key a message lands on. The server computes the same string in
 *  `slot()` — if the two ever disagree, control's tally reads OFF AIR while a
 *  board is live, so keep them in step. */
export const slot = (msg: Msg) => `${msg.output ?? 1}/${msg.layer}`

export type Team = {
  name: string
  score: string
  logo: string // filename in assets/teamlogo, '' for none
  players: string[] // 5
  picks: string[] // 5
  bans: string[] // 4
  used: string[][] // 4 games x 5 heroes
}

/** The on-air text colours the operator can set. These live here rather than
 *  as `color` rules in cg's stylesheet so there is one source: control seeds
 *  its pickers from them and cg falls back to them, which a duplicated hex in
 *  two apps could not promise. The values are the samplehud.psd text fills. */
export type DraftColors = {
  teamName: string
  score: string
  matchInfo: string
}

export const DEFAULT_COLORS: DraftColors = {
  teamName: '#456ac6',
  score: '#456ac6',
  matchInfo: '#5973b3',
}

// Same three elements as DraftColors, one filename in assets/fonts per
// element rather than one family for everything — a scoreboard font and a
// name-plate font are picked independently. '' falls back to cg's own
// default font for that element.
export type DraftFonts = {
  teamName: string
  score: string
  matchInfo: string
}

export const DEFAULT_FONTS: DraftFonts = {
  teamName: '',
  score: '',
  matchInfo: '',
}

export type DraftState = {
  step: number
  hiding?: boolean
  matchName: string
  gameNum: string
  // Optional: a take sent before this field existed still has to render, and
  // cg fills the gap from DEFAULT_COLORS.
  colors?: DraftColors
  fonts?: DraftFonts
  blue: Team
  red: Team
}

export const emptyTeam = (): Team => ({
  name: '',
  score: '0',
  logo: '',
  players: ['', '', '', '', ''],
  picks: ['', '', '', '', ''],
  bans: ['', '', '', ''],
  used: [0, 1, 2, 3].map(() => ['', '', '', '', '']),
})
