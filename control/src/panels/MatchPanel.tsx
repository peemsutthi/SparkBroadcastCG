import { OUTPUTS } from '../../../shared/draft'
import type { DraftState } from '../../../shared/draft'
import Panel from './Panel'

const GAMES = [1, 2, 3, 4, 5, 6, 7]

/** The match line, and the output every take from this page is addressed to.
 *  The target sits here rather than in Setup: it decides which CG the next
 *  press reaches, so it belongs where the operator can see it mid-show. */
export default function MatchPanel({
  matchName,
  gameNum,
  output,
  onOutputChange,
  onChange,
}: {
  matchName: string
  gameNum: string
  output: number
  onOutputChange: (n: number) => void
  onChange: (patch: Partial<DraftState>) => void
}) {
  const game = Number(gameNum)
  const setGame = (n: number) => onChange({ gameNum: String(n) })

  return (
    <Panel
      legend="Match"
      readout={`${matchName.trim() || '—'} · GAME ${gameNum || '—'}`.toUpperCase()}
    >
      <label className="field field-wide">
        <span className="legend">Match name</span>
        <input
          value={matchName}
          onChange={(e) => onChange({ matchName: e.target.value })}
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

      <label className="field field-target">
        <span className="legend">Target Output Channel</span>
        <select value={output} onChange={(e) => onOutputChange(Number(e.target.value))}>
          {OUTPUTS.map((n) => (
            <option key={n} value={n}>{`Output ${n}`}</option>
          ))}
        </select>
      </label>
    </Panel>
  )
}
