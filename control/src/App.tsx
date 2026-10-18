import { useState } from 'react'
import { useRelay } from '../../shared/relay'
import { DEFAULT_COLORS, DEFAULT_FONTS, DONE_STEP, LAST_PHASE, emptyTeam } from '../../shared/draft'
import type { DraftState, Take, Team } from '../../shared/draft'
import { load, useList } from './lib'
import ColorPanel from './panels/StylePanel'
import MatchPanel from './panels/MatchPanel'
import OutputPanel from './panels/OutputPanel'
import TeamPanel from './panels/TeamPanel'
import Transport from './panels/Transport'
import './App.css'

const TABS = ['Draft / Ban', 'Setup'] as const
type Tab = (typeof TABS)[number]

// Tells another tab's takes from this tab's echoes. Not randomUUID: https-only.
const TAB = Math.random().toString(36).slice(2)

export default function App() {
  const [tab, setTab] = useState<Tab>('Draft / Ban')
  // Which CG every take from this page is addressed to. The relay holds one
  // state per output, so switching the target leaves the others on air
  // untouched — and the tally below reads the new target, not the old one.
  const [output, setOutput] = useState(1)
  const { live, onAir, syncs, send } = useRelay(output)
  const heroes = useList('/api/heroes')
  const logos = useList('/api/teamlogos')
  const fontFiles = useList('/api/fonts')

  const [draft, setDraft] = useState<DraftState>(() => ({
    step: 0,
    matchName: '',
    gameNum: '1',
    colors: load('colors', DEFAULT_COLORS),
    fonts: load('fonts', DEFAULT_FONTS),
    blue: emptyTeam(),
    red: emptyTeam(),
  }))

  // The relay is the source of truth for what is up, so read it back rather
  // than tracking a second copy here.
  const draftUp = Boolean(onAir['draft'])

  // A reload, a new target, or another control tab's take leaves this page's
  // draft describing a board that is not the one on air — and Show draft
  // would push it there. So the board on air becomes the draft here at each
  // of those. Never on this tab's own echo: it would overwrite a pick
  // mid-typing. With nothing up on the target, the local draft stands.
  // shortcut: another tab's Hide is not adopted (a clear names no sender), so
  // this tab keeps its step; tag clears with `from` too if two tabs drive one output.
  const up: Take | undefined = onAir['draft']
  const moment = `${syncs}/${output}`
  const [adopted, setAdopted] = useState('')
  const [seen, setSeen] = useState<Take>()
  if ((syncs > 0 && moment !== adopted) || (up && up.from !== TAB && up !== seen)) {
    setAdopted(moment)
    setSeen(up)
    if (up) setDraft((d) => ({ ...d, ...(up.data as DraftState) }))
  }

  const take = (state: DraftState) =>
    send({ type: 'take', output, layer: 'draft', template: 'draft', data: state, from: TAB })

  const patch = (p: Partial<DraftState>) => setDraft((d) => ({ ...d, ...p }))

  const patchTeam = (side: 'blue' | 'red') => (p: Partial<Team>) =>
    setDraft((d) => ({ ...d, [side]: { ...d[side], ...p } }))

  const goto = (next: number) => {
    const state = { ...draft, step: Math.max(0, Math.min(DONE_STEP, next)) }
    setDraft(state)
    take(state)
  }

  // A plain clear: cg plays the slide-out itself before it lets the board go,
  // so nothing here has to outlive the press — closing this page mid-hide
  // cannot strand a board half-out on air.
  const hide = () => {
    send({ type: 'clear', output, layer: 'draft' })
    setDraft((d) => ({ ...d, step: 0 }))
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

  // Restyling is a live correction as often as a pre-show setting, so it
  // reaches air the moment it changes rather than waiting on Sync — and is
  // saved so it outlives a reload of this page.
  const setStyle = (style: Pick<DraftState, 'colors' | 'fonts'>) => {
    const next = { ...draft, ...style }
    setDraft(next)
    try {
      for (const [field, value] of Object.entries(style)) {
        localStorage.setItem(`sparkcg.${field}`, JSON.stringify(value))
      }
    } catch {
      // No storage: it still goes to air, it just does not survive a reload.
    }
    if (draftUp) take(next)
  }

  // Panic swap: the teams went in on the wrong sides. Everything each one owns
  // moves across in one press, and straight to air: a mistake on air can't wait.
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
              output={output}
              onOutputChange={setOutput}
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
              fonts={draft.fonts ?? DEFAULT_FONTS}
              fontFiles={fontFiles}
              onChange={setStyle}
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
