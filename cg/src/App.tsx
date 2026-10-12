import { useState } from 'react'
import type { ComponentType } from 'react'
import Draft from './Draft'
import { useRelay } from '../../shared/relay'
import type { OnAir } from '../../shared/draft'

/** `leaving`: the relay has cleared this layer and the template is playing its
 *  way out. It calls `onLeft` once it is gone, and only then is it unmounted. */
type TemplateProps = {
  data: Record<string, unknown>
  leaving: boolean
  onLeft: () => void
}

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

  const drop = (layer: string) =>
    setKept((prev) => {
      const rest = { ...prev }
      delete rest[layer]
      return rest
    })

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
