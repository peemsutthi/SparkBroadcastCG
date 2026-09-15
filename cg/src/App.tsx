import type { ComponentType } from 'react'
import Draft from './Draft'
import { useRelay } from '../../shared/relay'

// Add a template by adding an entry here. The name is what control sends.
const templates: Record<string, ComponentType<{ data: Record<string, unknown> }>> = {
  draft: Draft,
}

// Renders only what the relay says is on air, and only what is on air for
// this output. Anything unconditional here goes to air, so no placeholders.
export default function App({ output }: { output: number }) {
  const { onAir } = useRelay(output)

  return (
    <div className="stage">
      {Object.values(onAir).map((graphic) => {
        const Template = templates[graphic.template]
        return Template ? (
          <Template key={graphic.layer} data={graphic.data} />
        ) : null
      })}
    </div>
  )
}
