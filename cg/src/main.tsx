import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { API } from '../../shared/relay'
import { OUTPUTS } from '../../shared/draft'

// One app serves every output: /cg/1 .. /cg/4. The path is the only thing
// that differs between the four browser sources, and it is what decides which
// output's state this page renders. A bare "/" is output 1, so a source still
// on the old URL keeps working — and so does a path nobody takes to, which
// would otherwise render a blank source that looks exactly like one waiting
// for its first graphic.
const asked = Number(location.pathname.match(/\/cg\/(\d+)/)?.[1])
const output = OUTPUTS.includes(asked) ? asked : 1

// Stylesheets come from the relay (style/ at the repo root), not the bundle,
// so a colour change is an edit and a browser-source reload — no build, no
// Node on the editing machine. The host is API from relay.ts, never re-parsed
// here: a second definition of the relay host would drift. No unstyled flash
// to guard against: App renders nothing until the relay's sync arrives, a
// round trip to the same host serving these — and if that host is down, the
// socket is down too and nothing is on air.
for (const file of ['index.css', 'draft.css']) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `${API}/style/${file}`
  document.head.append(link)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App output={output} />
  </StrictMode>,
)
