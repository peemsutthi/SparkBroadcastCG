import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import Draft from './Draft'
import { useRelay } from '../../shared/relay'
import type { OnAir } from '../../shared/draft'

/** `leaving`: the relay has cleared this layer and the template is playing its
 *  way out. It calls `onLeft` once it is gone, and only then is it unmounted —
 *  or when LEAVE_FALLBACK runs out, whichever comes first. */
type TemplateProps = {
  data: Record<string, unknown>
  leaving: boolean
  onLeft: () => void
}

// For when a template's animationend never comes: OBS throttles animations in
// a hidden source, and a layer that never reports done would never leave. Must
// outlast the longest out, Draft's 0.8s slide-down.
const LEAVE_FALLBACK = 1500

// Add a template by adding an entry here. The name is what control sends.
const templates: Record<string, ComponentType<TemplateProps>> = {
  draft: Draft,
}

// Renders what the relay says is on air for this output, plus any layer it
// has just cleared that is still playing out. Anything unconditional here goes
// to air, so no placeholders.
export default function App({ output }: { output: number }) {
  const { onAir } = useRelay(output)

  // The last take each layer showed. A clear removes the layer from onAir at
  // once; this keeps it drawn until its template says the out is done, so the
  // template owns the out animation and no sender has to time it.
  const [kept, setKept] = useState<OnAir>({})
  if (Object.keys(onAir).some((layer) => kept[layer] !== onAir[layer])) {
    setKept({ ...kept, ...onAir })
  }

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const stop = (layer: string) => {
    clearTimeout(timers.current[layer])
    delete timers.current[layer]
  }

  const drop = (layer: string) => {
    stop(layer)
    setKept((prev) => {
      const rest = { ...prev }
      delete rest[layer]
      return rest
    })
  }

  // One timer per leaving layer, started once: cg re-renders on every output's
  // messages, and a timer restarted on each would never fire while another is
  // driven. A take back on the layer mid-out cancels it.
  useEffect(() => {
    for (const layer of Object.keys(kept)) {
      if (onAir[layer]) stop(layer)
      else timers.current[layer] ??= setTimeout(() => drop(layer), LEAVE_FALLBACK)
    }
  })

  // Cleared and forgotten on unmount, so StrictMode's dev re-mount starts fresh
  // timers instead of finding dead ids that block them.
  useEffect(() => {
    const all = timers.current
    return () => {
      Object.values(all).forEach(clearTimeout)
      timers.current = {}
    }
  }, [])

  // Keyed by layer, so a take that lands mid-out re-renders the same
  // template rather than remounting it — the out stops, no entry replays.
  return (
    <div className="stage">
      {Object.values({ ...kept, ...onAir }).map((graphic) => {
        const Template = templates[graphic.template]
        return Template ? (
          <Template
            key={graphic.layer}
            data={graphic.data}
            leaving={!onAir[graphic.layer]}
            onLeft={() => drop(graphic.layer)}
          />
        ) : null
      })}
    </div>
  )
}
