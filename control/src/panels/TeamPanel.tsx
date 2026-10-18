import { Fragment, useState } from 'react'
import type { Team } from '../../../shared/draft'
import Panel from './Panel'

const SIDES = {
  blue: { legend: 'Blue team', eg: 'team1' },
  red: { legend: 'Red team', eg: 'team2' },
} as const

const SLOTS = [0, 1, 2, 3, 4]
const BANS = [0, 1, 2, 3]

export default function TeamPanel({
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
            <input value={name} onChange={(e) => onChange({ name: e.target.value })} placeholder={eg} />
          </label>
          <label className="field field-logo">
            <span className="legend">Logo</span>
            <select value={logo} onChange={(e) => onChange({ logo: e.target.value })}>
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
                onChange={(e) => onChange({ score: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-mini"
                onClick={() => onChange({ score: String(Number(score || 0) + 1) })}
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
                onChange={(e) => onChange({ players: players.with(i, e.target.value) })}
                placeholder={`Player ${i + 1}`}
              />
              <input
                list="heroes"
                value={picks[i]}
                onChange={(e) => onChange({ picks: picks.with(i, e.target.value) })}
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
              onChange({ picks: picks.with(from, picks[to]).with(to, picks[from]) })
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
              onChange={(e) => onChange({ bans: bans.with(i, e.target.value) })}
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
                  onChange={(e) => onChange({ used: pool.with(g, row.with(i, e.target.value)) })}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </Panel>
  )
}
