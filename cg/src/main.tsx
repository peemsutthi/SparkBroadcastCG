import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OUTPUTS } from '../../shared/draft'

// One app serves every output: /cg/1 .. /cg/4. The path is the only thing
// that differs between the four browser sources, and it is what decides which
// output's state this page renders. A bare "/" is output 1, so a source still
// on the old URL keeps working — and so does a path nobody takes to, which
// would otherwise render a blank source that looks exactly like one waiting
// for its first graphic.
const asked = Number(location.pathname.match(/\/cg\/(\d+)/)?.[1])
const output = OUTPUTS.includes(asked) ? asked : 1

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App output={output} />
  </StrictMode>,
)
