import type { ComponentType } from 'react'
import Draft from './Draft'
import { ASSETS, useRelay } from './relay'
import './App.css'

type TemplateProps = { data: Record<string, unknown> }

const hero = (data: Record<string, unknown>) => String(data.hero ?? '')

function LowerThird({ data }: TemplateProps) {
  return (
    <div className="lower-third">
      <div className="name">{String(data.name ?? '')}</div>
      <div className="title">{String(data.title ?? '')}</div>
    </div>
  )
}

function HeroPick({ data }: TemplateProps) {
  return (
    <img className="hero-pick" src={`${ASSETS}/heropick/${hero(data)}.png`} alt="" />
  )
}

function HeroBan({ data }: TemplateProps) {
  return <img className="hero-ban" src={`${ASSETS}/ban/${hero(data)}.png`} alt="" />
}

function GlobalBan({ data }: TemplateProps) {
  return (
    <img className="hero-ban" src={`${ASSETS}/globalban/${hero(data)}.png`} alt="" />
  )
}

function Hud() {
  return <img className="hud" src={`${ASSETS}/overlayhud/hud.png`} alt="" />
}

// Add a template by adding an entry here. The name is what control sends.
const templates: Record<string, ComponentType<TemplateProps>> = {
  'lower-third': LowerThird,
  'hero-pick': HeroPick,
  'hero-ban': HeroBan,
  'global-ban': GlobalBan,
  hud: Hud,
  draft: Draft,
}

// Renders only what the relay says is on air. Anything unconditional here goes
// to air, so no placeholders.
export default function App() {
  const { onAir } = useRelay()

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
