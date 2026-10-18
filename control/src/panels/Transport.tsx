import { useState } from 'react'
import { DONE_STEP, LAST_PHASE, SWAP_STEP, phaseLabel } from '../../../shared/draft'
import Panel from './Panel'

/** The step machine. One primary key drives the draft; the operator hits it
 *  once per phase, so it is pinned to the bottom of the window rather than
 *  sitting in a rack that scrolls. */
export default function Transport({
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
            {/* Stops at step 1: step 0 reads OFF AIR, so only Hide may land there. */}
            <button className="btn" disabled={step <= 1} onClick={() => onStep(step - 1)}>
              Back
            </button>
            <button className="btn btn-sync" disabled={!onAir} onClick={onSync}>
              Sync
            </button>
            <button className="btn btn-hide" disabled={!onAir} onClick={onHide}>
              Hide
            </button>
          </div>

          {/* Clear can't be undone, so it takes two presses; Swap undoes itself, so one. */}
          <div className="transport-panic" role="group" aria-labelledby="panic">
            <span className="legend" id="panic">
              PANIC
            </span>
            <button
              className={armed ? 'btn btn-panic armed' : 'btn btn-panic'}
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
            <button className="btn btn-panic" onClick={onSwapSides}>
              Swap sides
            </button>
          </div>
        </div>
      </Panel>
    </aside>
  )
}
