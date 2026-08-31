import type { SyntheticEvent } from 'react'
import { DEFAULT_COLORS, DRAFT_SEQUENCE } from '../../shared/draft'
import type { DraftState } from '../../shared/draft'
import { ASSETS } from './relay'
import './draft.css'

// Art is a file drop, so a hero with no image must go quiet rather than
// showing a broken icon on air.
const hide = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none'
}

const NAME_SIZE = 65
const NAME_MIN = 20 // absolute floor: small beats cut off
const WRAP_BELOW = 34 // one line under this is too small to read on air

/** The name plate is a fixed width (.draft-team-name in draft.css), so a
 *  long name is fitted, never cut. One line if it can; a two-word name that
 *  would shrink past legible wraps instead, which keeps the type twice the
 *  size. Runs off a ref keyed to the name, so it re-measures when the name
 *  changes and never on a step. */
const fitName = (el: HTMLSpanElement | null) => {
  const box = el?.parentElement
  if (!el || !box) return

  el.style.fontSize = ''
  el.style.whiteSpace = 'nowrap'
  el.style.width = ''

  const { clientWidth: w, clientHeight: h } = box
  if (el.scrollWidth <= w) return // fits at full size

  const oneLine = Math.floor((NAME_SIZE * w) / el.scrollWidth)
  if (oneLine >= WRAP_BELOW || !el.textContent?.includes(' ')) {
    el.style.fontSize = `${Math.max(NAME_MIN, oneLine)}px`
    return
  }

  // A flex item sizes to max-content, so it has to be pinned to the plate
  // width before it will wrap at all.
  el.style.whiteSpace = 'normal'
  el.style.width = `${w}px`
  for (let size = NAME_SIZE; size >= NAME_MIN; size -= 2) {
    el.style.fontSize = `${size}px`
    if (el.scrollWidth <= w && el.scrollHeight <= h) return
  }
}

const SLOTS = [1, 2, 3, 4, 5]
const BANS = [1, 2, 3, 4]

function PickSlot({
  id,
  side,
  hero,
  player,
  active,
}: {
  id: string
  side: 'blue' | 'red'
  hero: string
  player: string
  active: boolean
}) {
  const cls = [
    'pick-slot',
    hero ? 'filled' : 'empty',
    active ? `slot-active ${side}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} id={id}>
      <div className="image-mask">
        {hero && (
          // Keyed on the hero so a new pick remounts the image and replays the
          // lock-in flash. The prototype forced a reflow to do this.
          <img
            key={hero}
            className="hero-img"
            src={`${ASSETS}/heropick/${hero}.png`}
            onError={hide}
            alt=""
          />
        )}
        {hero && <div className="flash-fx" key={`flash-${hero}`} />}
        <div className="action-text">PICKING</div>
        <div className="arrows-container">
          <div className="arrow" />
          <div className="arrow" />
          <div className="arrow" />
        </div>
        {player && <div className={`player-name ${side}`}>{player}</div>}
      </div>
    </div>
  )
}

function BanSlot({
  id,
  side,
  hero,
  active,
}: {
  id: string
  side: 'blue' | 'red'
  hero: string
  active: boolean
}) {
  const cls = [
    'ban-slot',
    hero ? 'filled' : 'empty',
    active ? `slot-active ${side}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} id={id}>
      {hero && (
        <img key={hero} src={`${ASSETS}/ban/${hero}.png`} onError={hide} alt="" />
      )}
      <div className="action-text">BAN</div>
    </div>
  )
}

/** Sits in the blank square the hud art leaves either side of the centre
 *  badge, not beside the team name. */
function TeamLogo({ side, logo }: { side: 'blue' | 'red'; logo: string }) {
  if (!logo) return null

  return (
    <img
      className={`draft-team-logo ${side}`}
      src={`${ASSETS}/teamlogo/${logo}`}
      onError={hide}
      alt=""
    />
  )
}

/** `games` is the game indices that have bans, not a count — the rows are
 *  filtered, so the first row on air is not always G1 and the label has to
 *  name the game it actually holds. Keyed on that index too, so a game filled
 *  out of order animates the row it lands on rather than the last one. */
function GlobalStrip({
  side,
  games,
  used,
}: {
  side: 'blue' | 'red'
  games: number[]
  used: string[][]
}) {
  if (games.length === 0) return null

  return (
    <div className={`global-bp-container ${side}`}>
      {games.map((g) => {
        const row = used[g] ?? []

        return (
          <div className="global-bp-heroes" key={g}>
            <div className="global-bp-label">G{g + 1}</div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div className="global-bp-slot" key={i}>
                {row[i] && (
                  <img src={`${ASSETS}/globalban/${row[i]}.png`} onError={hide} alt="" />
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function Draft({ data }: { data: Record<string, unknown> }) {
  const s = data as unknown as DraftState
  const { step, hiding, blue, red } = s

  const lit = new Set(DRAFT_SEQUENCE[step] ?? [])

  // The operator's colours ride in the take. A take that predates them — or
  // one from anything but control — still renders, on the psd's own fills.
  const colors = { ...DEFAULT_COLORS, ...s.colors }

  // Filtered on either side having entries, so the two corners stay row for
  // row aligned instead of blue showing three games and red two.
  const games = [0, 1, 2, 3].filter(
    (i) => blue.used[i]?.some(Boolean) || red.used[i]?.some(Boolean),
  )

  // The overlay mounts once, so the entry animation runs once. Re-renders on
  // every later step leave it at its final frame.
  return (
    <div className="draft-overlay draft-in-anim">
      <div className={`draft-center${hiding ? ' slide-down-out' : ''}`}>
        <img
          className="draft-bg"
          src={`${ASSETS}/overlayhud/hud.png`}
          onError={hide}
          alt=""
        />
        {/* The centre badge, laid out as the psd has it: logo, score, score,
            logo — with the match line under it, not over it. */}
        <TeamLogo side="blue" logo={blue.logo} />
        <TeamLogo side="red" logo={red.logo} />
        <div className="draft-score blue" style={{ color: colors.score }}>
          {blue.score}
        </div>
        <div className="draft-score red" style={{ color: colors.score }}>
          {red.score}
        </div>
        <div className="draft-match-info" style={{ color: colors.matchInfo }}>
          {s.matchName}
          <br />
          Game {s.gameNum}
        </div>
      </div>

      {(['blue', 'red'] as const).map((side) => {
        const team = side === 'blue' ? blue : red
        const p = side === 'blue' ? 'b' : 'r'
        const out = side === 'blue' ? 'slide-left-out' : 'slide-right-out'

        return (
          <div className={`draft-${side}${hiding ? ' ' + out : ''}`} key={side}>
            <GlobalStrip side={side} games={games} used={team.used} />
            <div
              className={`draft-team-name ${side}`}
              style={{ color: colors.teamName }}
            >
              <span key={team.name} ref={fitName}>
                {team.name}
              </span>
            </div>

            {SLOTS.map((n) => (
              <PickSlot
                key={n}
                id={`${p}p-${n}`}
                side={side}
                hero={team.picks[n - 1] ?? ''}
                player={team.players[n - 1] ?? ''}
                active={lit.has(`${p}p-${n}`)}
              />
            ))}

            {BANS.map((n) => (
              <BanSlot
                key={n}
                id={`${p}b-${n}`}
                side={side}
                hero={team.bans[n - 1] ?? ''}
                active={lit.has(`${p}b-${n}`)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
