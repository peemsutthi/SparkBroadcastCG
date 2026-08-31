import { Fragment, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { API, useRelay } from './relay'
import {
  DEFAULT_COLORS,
  DONE_STEP,
  LAST_PHASE,
  SWAP_STEP,
  emptyTeam,
  phaseLabel,
} from '../../shared/draft'
import type { DraftColors, DraftState, Team } from '../../shared/draft'
import './App.css'

const TABS = ['Draft / Ban', 'Setup'] as const
type Tab = (typeof TABS)[number]

const GAMES = [1, 2, 3, 4, 5, 6, 7]

const COLORS_KEY = 'sparkcg.colors'

/** Colours are a show setting, not part of a draft — they are set once and
 *  should outlive the reload that puts the board back to step 0. Spread over
 *  the defaults so a key added later fills itself in. */
const loadColors = (): DraftColors => {
  try {
    const saved = JSON.parse(localStorage.getItem(COLORS_KEY) ?? '{}')
    return { ...DEFAULT_COLORS, ...saved }
  } catch {
    return DEFAULT_COLORS // no storage, or someone hand-edited the value
  }
}

/** A module in the rack. `live` burns the tally rail: the panel has a
 *  graphic on air. */
function Panel({
  legend,
  readout,
  live = false,
  tone,
  children,
}: {
  legend: string
  readout?: string
  live?: boolean
  tone?: 'blue' | 'red'
  children: ReactNode
}) {
  return (
    <section className={`panel${live ? ' live' : ''}${tone ? ' ' + tone : ''}`}>
      <div className="rail" />
      <div className="panel-body">
        <header className="panel-head">
          <h2 className="legend">{legend}</h2>
          {readout && <span className="panel-readout">{readout}</span>}
        </header>
        <div className="panel-content">{children}</div>
      </div>
    </section>
  )
}

/** The roster, read off the relay. Picks and bans autocomplete against it:
 *  a mistyped hero name is a blank image on air with no error anywhere. */
function useHeroes() {
  const [heroes, setHeroes] = useState<string[]>([])
  useEffect(() => {
    fetch(`${API}/api/heroes`)
      .then((r) => r.json())
      .then(setHeroes)
      .catch(() => {}) // relay down: the inputs still accept typed names
  }, [])
  return heroes
}

/** The team logo roster, read off the relay the same way heroes are — a file
 *  drop in assets/teamlogo, no code change. Unlike heroes it's a closed set
 *  the operator picks from, so control renders it as a dropdown, not a
 *  free-typed field. */
function useTeamLogos() {
  const [logos, setLogos] = useState<string[]>([])
  useEffect(() => {
    fetch(`${API}/api/teamlogos`)
      .then((r) => r.json())
      .then(setLogos)
      .catch(() => {}) // relay down: dropdown just stays empty
  }, [])
  return logos
}

const at = (xs: string[], i: number, v: string) =>
  xs.map((x, j) => (j === i ? v : x))

// Reads only from the original array, so neither slot can clobber the other.
const swapAt = (xs: string[], a: number, b: number) =>
  xs.map((x, i) => (i === a ? xs[b] : i === b ? xs[a] : x))

const SIDES = {
  blue: { legend: 'Blue team', eg: 'team1' },
  red: { legend: 'Red team', eg: 'team2' },
} as const

const SLOTS = [0, 1, 2, 3, 4]
const BANS = [0, 1, 2, 3]

function TeamPanel({
  side,
  team,
  logos,
  onChange,
  onSwap,
}: {
  side: 'blue' | 'red'
  team: Team
  logos: string[]
  onChange: (patch: Partial<Team>) => void
  onSwap: () => void
}) {
  const { legend, eg } = SIDES[side]
  const { name, score, logo, players, picks, bans, used: pool } = team
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(4)

  const setName = (v: string) => onChange({ name: v })
  const setScore = (v: string) => onChange({ score: v })
  const setLogo = (v: string) => onChange({ logo: v })
  const setPlayers = (v: string[]) => onChange({ players: v })
  const setPicks = (v: string[]) => onChange({ picks: v })
  const setBans = (v: string[]) => onChange({ bans: v })
  const setPool = (v: string[][]) => onChange({ used: v })

  return (
    <Panel
      tone={side}
      legend={legend}
      readout={`${name.trim() || '—'} · ${score || '0'}`.toUpperCase()}
    >
      <div className="group">
        <div className="row">
          <label className="field field-grow">
            <span className="legend">Team</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={eg} />
          </label>
          <label className="field field-logo">
            <span className="legend">Logo</span>
            <select value={logo} onChange={(e) => setLogo(e.target.value)}>
              <option value="">None</option>
              {logos.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-score">
            <span className="legend">Score</span>
            <div className="score-input">
              <input
                inputMode="numeric"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-mini"
                onClick={() => setScore(String(Number(score || 0) + 1))}
              >
                +1
              </button>
            </div>
          </label>
        </div>
      </div>

      <div className="group divided">
        <span className="legend">Players &amp; picks</span>
        <div className="picks">
          {SLOTS.map((i) => (
            <Fragment key={i}>
              <input
                value={players[i]}
                onChange={(e) => setPlayers(at(players, i, e.target.value))}
                placeholder={`Player ${i + 1}`}
              />
              <input
                list="heroes"
                value={picks[i]}
                onChange={(e) => setPicks(at(picks, i, e.target.value))}
                placeholder={`Pick ${i + 1}`}
              />
            </Fragment>
          ))}
        </div>
      </div>

      <div className="group">
        <span className="legend" id={`${side}-swap`}>
          Swap picks
        </span>
        <div className="swap" role="group" aria-labelledby={`${side}-swap`}>
          <select value={from} onChange={(e) => setFrom(Number(e.target.value))}>
            {SLOTS.map((i) => (
              <option key={i} value={i}>{`P${i + 1}`}</option>
            ))}
          </select>
          <span className="swap-arrow">&#8596;</span>
          <select value={to} onChange={(e) => setTo(Number(e.target.value))}>
            {SLOTS.map((i) => (
              <option key={i} value={i}>{`P${i + 1}`}</option>
            ))}
          </select>
          <button
            className="btn"
            onClick={() => {
              setPicks(swapAt(picks, from, to))
              onSwap()
            }}
          >
            Swap
          </button>
        </div>
      </div>

      <div className="group divided">
        <span className="legend">Bans</span>
        <div className="bans">
          {BANS.map((i) => (
            <input
              key={i}
              list="heroes"
              value={bans[i]}
              onChange={(e) => setBans(at(bans, i, e.target.value))}
              placeholder={`Ban ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="group divided">
        <span className="legend">Global Bans</span>
        <div className="pool">
          {pool.map((row, g) => (
            <Fragment key={g}>
              <span className="pool-label">{`G${g + 1}`}</span>
              {row.map((hero, i) => (
                <input
                  key={i}
                  list="heroes"
                  value={hero}
                  onChange={(e) =>
                    setPool(pool.map((r, j) => (j === g ? at(r, i, e.target.value) : r)))
                  }
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function MatchPanel({
  matchName,
  gameNum,
  onChange,
}: {
  matchName: string
  gameNum: string
  onChange: (patch: Partial<DraftState>) => void
}) {
  const name = matchName
  const game = Number(gameNum)
  const setName = (v: string) => onChange({ matchName: v })
  const setGame = (n: number) => onChange({ gameNum: String(n) })

  return (
    <Panel
      legend="Match"
      readout={`${name.trim() || '—'} · GAME ${gameNum || '—'}`.toUpperCase()}
    >
      <label className="field field-wide">
        <span className="legend">Match name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Match name"
        />
      </label>

      <div className="field">
        <span className="legend" id="game-legend">
          Game
        </span>
        <div className="keys" role="group" aria-labelledby="game-legend">
          {GAMES.map((n) => (
            <button
              key={n}
              aria-pressed={n === game}
              className={n === game ? 'num-key on' : 'num-key'}
              onClick={() => setGame(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="num-key"
            onClick={() => setGame(Math.min(GAMES[GAMES.length - 1], game + 1))}
          >
            +1
          </button>
        </div>
      </div>
    </Panel>
  )
}

const SWATCHES: { key: keyof DraftColors; label: string }[] = [
  { key: 'teamName', label: 'Team name' },
  { key: 'score', label: 'Score' },
  { key: 'matchInfo', label: 'Match line' },
]

const HEX = /^#[0-9a-f]{6}$/i

/** A colour arrives as a hex far more often than as a point in a gradient —
 *  it comes off a brand sheet or out of the psd — so the hex is typed in
 *  here, not just read back off the swatch.
 *
 *  `typing` holds the half-written value and nothing else: `#45` is not a
 *  colour and must not reach air. It clears the moment the text parses, so
 *  the field falls back to the live value and the swatch, Defaults and a
 *  committed edit all show through with no syncing to keep them in step. */
function Swatch({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [typing, setTyping] = useState<string | null>(null)

  const type = (v: string) => {
    if (!HEX.test(v)) return setTyping(v)
    onChange(v.toLowerCase())
    setTyping(null)
  }

  return (
    <label className="field field-color">
      <span className="legend">{label}</span>
      <div className="color-input">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="swatch-hex"
          value={typing ?? value}
          spellCheck={false}
          onChange={(e) => type(e.target.value)}
          onBlur={() => setTyping(null)} // an entry that never parsed reverts
        />
      </div>
    </label>
  )
}

/** Set once per show, so it sits in Setup rather than beside the fields the
 *  operator drives the draft from. One colour per element, not per side: the
 *  hud art carries team identity, the text does not. */
function ColorPanel({
  colors,
  onChange,
}: {
  colors: DraftColors
  onChange: (c: DraftColors) => void
}) {
  return (
    <Panel legend="Colours">
      {SWATCHES.map(({ key, label }) => (
        <Swatch
          key={key}
          label={label}
          value={colors[key]}
          onChange={(v) => onChange({ ...colors, [key]: v })}
        />
      ))}

      <div className="field">
        <span className="legend">Reset</span>
        <button className="btn" onClick={() => onChange(DEFAULT_COLORS)}>
          Defaults
        </button>
      </div>
    </Panel>
  )
}

function OutputPanel() {
  // The URL an OBS or vMix browser source points at. The host comes from the
  // relay, not from this page: control is usually open on localhost, and a
  // localhost URL pasted into OBS on the streaming PC is a dead source.
  const [host, setHost] = useState(location.hostname)
  const [note, setNote] = useState('')

  useEffect(() => {
    fetch(`${API}/api/host`)
      .then((r) => r.json())
      .then((d) => d.host && setHost(d.host))
      .catch(() => {}) // relay down: this page's own host still works locally
  }, [])

  const url = `${location.protocol}//${host}:5174/?relay=${host}:4000`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setNote('Copied')
    } catch {
      // Plain http on a LAN address has no clipboard API. The URL is on
      // screen either way, so say so instead of failing silently.
      setNote('Copy failed — select the link')
    }
    setTimeout(() => setNote(''), 2000)
  }

  return (
    <Panel legend="Output">
      <div className="field">
        <span className="legend">Output 1</span>
        <div className="output-row">
          <a className="output-url" href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
          <button className="btn" onClick={copy}>
            Copy
          </button>
          {note && <span className="note">{note}</span>}
        </div>
      </div>
    </Panel>
  )
}

/** The step machine. One primary key drives the draft; the operator hits it
 *  once per phase, so it is pinned to the bottom of the window rather than
 *  sitting in a rack that scrolls. */
function Transport({
  step,
  onAir,
  onStep,
  onSync,
  onHide,
  onClear,
  onSwapSides,
}: {
  step: number
  onAir: boolean
  onStep: (next: number) => void
  onSync: () => void
  onHide: () => void
  onClear: () => void
  onSwapSides: () => void
}) {
  // Wiping the board mid-draft is not undoable, so it takes two presses. A
  // confirm() dialog would block the page, which is the last thing wanted
  // during a show.
  const [armed, setArmed] = useState(false)
  const primary =
    step === 0
      ? 'Show draft'
      : step <= LAST_PHASE
        ? 'Next phase'
        : step === SWAP_STEP
          ? 'Finish draft'
          : 'Hide draft'

  const readout =
    step === 0
      ? 'OFF AIR'
      : step <= LAST_PHASE
        ? `STEP ${step}/${LAST_PHASE} · ${phaseLabel(step).toUpperCase()}`
        : step === SWAP_STEP
          ? 'SWAP PHASE'
          : 'DRAFT COMPLETE'

  return (
    <aside className="transport-col">
      <Panel legend="Draft" readout={onAir ? 'ON AIR' : 'OFF AIR'} live={onAir}>
        <div className="group">
          <span className="step-readout">{readout}</span>
          <button
            className="btn btn-primary"
            onClick={() => (step === DONE_STEP ? onHide() : onStep(step + 1))}
          >
            {primary}
          </button>
          <div className="transport-keys">
            <button className="btn" disabled={step === 0} onClick={() => onStep(step - 1)}>
              Back
            </button>
            <button className="btn btn-sync" disabled={!onAir} onClick={onSync}>
              Sync
            </button>
            <button className="btn btn-hide" disabled={!onAir} onClick={onHide}>
              Hide
            </button>
          </div>

          <div className="transport-swap">
            <button className="btn btn-swap" onClick={onSwapSides}>
              Swap sides
            </button>
          </div>

          <div className="transport-clear">
            <button
              className={armed ? 'btn btn-clear armed' : 'btn btn-clear'}
              onClick={() => {
                if (armed) {
                  onClear()
                  setArmed(false)
                } else {
                  setArmed(true)
                  setTimeout(() => setArmed(false), 3000)
                }
              }}
            >
              {armed ? 'Press again to clear' : 'Clear picks & bans'}
            </button>
          </div>
        </div>
      </Panel>
    </aside>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('Draft / Ban')
  const { live, onAir, send } = useRelay()
  const heroes = useHeroes()
  const logos = useTeamLogos()

  const [draft, setDraft] = useState<DraftState>(() => ({
    step: 0,
    matchName: '',
    gameNum: '1',
    colors: loadColors(),
    blue: emptyTeam(),
    red: emptyTeam(),
  }))

  // The relay is the source of truth for what is up, so read it back rather
  // than tracking a second copy here.
  const draftUp = Boolean(onAir['draft'])

  const take = (state: DraftState) =>
    send({ type: 'take', layer: 'draft', template: 'draft', data: state })

  const patch = (p: Partial<DraftState>) => setDraft((d) => ({ ...d, ...p }))

  const patchTeam = (side: 'blue' | 'red') => (p: Partial<Team>) =>
    setDraft((d) => ({ ...d, [side]: { ...d[side], ...p } }))

  const goto = (next: number) => {
    const state = { ...draft, step: Math.max(0, Math.min(DONE_STEP, next)) }
    setDraft(state)
    take(state)
  }

  const hide = () => {
    // A bare clear unmounts the overlay instantly. Play the slide-out first,
    // then take it down — control owns the timing, cg just plays the class.
    take({ ...draft, hiding: true })
    setDraft((d) => ({ ...d, step: 0 }))
    setTimeout(() => send({ type: 'clear', layer: 'draft' }), 800)
  }

  // Picks and bans only. Team names, players, scores and the global bans
  // survive, because those carry across games while the board does not.
  const clearBoard = () => {
    const wipe = (t: Team): Team => ({
      ...t,
      picks: ['', '', '', '', ''],
      bans: ['', '', '', ''],
    })
    const next = { ...draft, blue: wipe(draft.blue), red: wipe(draft.red) }
    setDraft(next)
    if (draftUp) take(next)
  }

  // Picks moving after they are locked has to reach air immediately; before
  // that the operator is still filling the board and Sync is theirs to press.
  const syncIfLocked = () => {
    if (draftUp && draft.step >= LAST_PHASE) take(draft)
  }

  // Recolouring is a live correction as often as a pre-show setting, so it
  // reaches air the moment it changes rather than waiting on Sync.
  const setColors = (colors: DraftColors) => {
    const next = { ...draft, colors }
    setDraft(next)
    try {
      localStorage.setItem(COLORS_KEY, JSON.stringify(colors))
    } catch {
      // No storage: the colours still go to air, they just do not survive a
      // reload of this page.
    }
    if (draftUp) take(next)
  }

  const swapSides = () => {
    const next = { ...draft, blue: draft.red, red: draft.blue }
    setDraft(next)
    if (draftUp) take(next)
  }

  return (
    <>
      <header className="bezel">
        <span className="plate">SparkCG</span>

        <nav className="sections" role="tablist" aria-label="Sections">
          {TABS.map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={name === tab}
              className={name === tab ? 'legend section-key on' : 'legend section-key'}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </nav>

        <div className={live ? 'relay' : 'relay down'}>
          <span className="lamp" />
          {live ? 'ONLINE' : 'DOWN'}
        </div>
      </header>

      <main className="control">
        <div className="rack">
        {tab === 'Draft / Ban' && (
          <>
            <MatchPanel
              matchName={draft.matchName}
              gameNum={draft.gameNum}
              onChange={patch}
            />
            <div className="teams">
              <TeamPanel
                side="blue"
                team={draft.blue}
                logos={logos}
                onChange={patchTeam('blue')}
                onSwap={syncIfLocked}
              />
              <TeamPanel
                side="red"
                team={draft.red}
                logos={logos}
                onChange={patchTeam('red')}
                onSwap={syncIfLocked}
              />
            </div>
          </>
        )}
        {tab === 'Setup' && (
          <>
            <OutputPanel />
            <ColorPanel
              colors={draft.colors ?? DEFAULT_COLORS}
              onChange={setColors}
            />
          </>
        )}
        </div>

        {tab === 'Draft / Ban' && (
          <Transport
            step={draft.step}
            onAir={draftUp}
            onStep={goto}
            onSync={() => take(draft)}
            onHide={hide}
            onClear={clearBoard}
            onSwapSides={swapSides}
          />
        )}
      </main>

      <datalist id="heroes">
        {heroes.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
    </>
  )
}
