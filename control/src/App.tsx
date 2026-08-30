import { Fragment, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { API, useRelay } from './relay'
import {
  DONE_STEP,
  LAST_PHASE,
  SWAP_STEP,
  emptyTeam,
  phaseLabel,
} from '../../shared/draft'
import type { DraftState, Team } from '../../shared/draft'
import './App.css'

const TABS = ['Draft / Ban', 'Setup'] as const
type Tab = (typeof TABS)[number]

const GAMES = [1, 2, 3, 4, 5, 6, 7]

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
  onChange,
  onSwap,
}: {
  side: 'blue' | 'red'
  team: Team
  onChange: (patch: Partial<Team>) => void
  onSwap: () => void
}) {
  const { legend, eg } = SIDES[side]
  const { name, score, players, picks, bans, used: pool } = team
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(4)

  const setName = (v: string) => onChange({ name: v })
  const setScore = (v: string) => onChange({ score: v })
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
          <label className="field field-score">
            <span className="legend">Score</span>
            <input
              inputMode="numeric"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
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
      readout={`${name.trim() || '—'} · GAME ${game}`.toUpperCase()}
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
        </div>
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
}: {
  step: number
  onAir: boolean
  onStep: (next: number) => void
  onSync: () => void
  onHide: () => void
  onClear: () => void
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
            <button className="btn" disabled={!onAir} onClick={onSync}>
              Sync
            </button>
            <button className="btn" disabled={!onAir} onClick={onHide}>
              Hide
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

  const [draft, setDraft] = useState<DraftState>(() => ({
    step: 0,
    matchName: '',
    gameNum: '1',
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
                onChange={patchTeam('blue')}
                onSwap={syncIfLocked}
              />
              <TeamPanel
                side="red"
                team={draft.red}
                onChange={patchTeam('red')}
                onSwap={syncIfLocked}
              />
            </div>
          </>
        )}
        {tab === 'Setup' && <OutputPanel />}
        </div>

        {tab === 'Draft / Ban' && (
          <Transport
            step={draft.step}
            onAir={draftUp}
            onStep={goto}
            onSync={() => take(draft)}
            onHide={hide}
            onClear={clearBoard}
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
