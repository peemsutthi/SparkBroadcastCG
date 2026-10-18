import type { ReactNode } from 'react'

/** A module in the rack. `live` burns the tally rail: the panel has a
 *  graphic on air. */
export default function Panel({
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
