import { useEffect, useState } from 'react'
import { API } from '../../../shared/relay'
import { OUTPUTS } from '../../../shared/draft'
import Panel from './Panel'

/** One browser-source URL per output. The host comes from the relay, not from
 *  this page: control is usually open on localhost, and a localhost URL pasted
 *  into OBS on the streaming PC is a dead source. */
export default function OutputPanel() {
  const [host, setHost] = useState(location.hostname)

  useEffect(() => {
    fetch(`${API}/api/host`)
      .then((r) => r.json())
      .then((d) => d.host && setHost(d.host))
      .catch(() => {}) // relay down: this page's own host still works locally
  }, [])

  return (
    <Panel legend="Output">
      {OUTPUTS.map((n) => (
        <OutputRow key={n} output={n} host={host} />
      ))}
    </Panel>
  )
}

/** Each row owns its own copied/failed note, so copying output 3 does not
 *  flash a "Copied" beside output 1. */
function OutputRow({ output, host }: { output: number; host: string }) {
  const [note, setNote] = useState('')
  // Built, the relay serves cg itself; in dev cg is its own Vite server.
  const url = import.meta.env.DEV
    ? `http://${host}:5174/cg/${output}?relay=${host}:4000`
    : `http://${host}:${location.port}/cg/${output}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setNote('Copied')
    } catch {
      // Plain http on a LAN address has no clipboard API. The URL is on
      // screen either way, so say so instead of failing silently.
      setNote('Copy failed — select the link')
    }
    setTimeout(() => setNote(''), 2000)
  }

  return (
    <div className="group">
      <span className="legend">{`Output ${output}`}</span>
      <div className="output-row">
        <a className="output-url" href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
        <button className="btn" onClick={copy}>
          Copy
        </button>
        {note && <span className="note">{note}</span>}
      </div>
    </div>
  )
}
