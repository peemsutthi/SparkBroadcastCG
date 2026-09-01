import { useEffect, useRef, useState } from 'react'
import { slot } from '../../shared/draft'
import type { Msg, OnAir } from '../../shared/draft'

// OBS usually runs on the streaming PC, not the machine hosting the relay.
// Point a page at another host with ?relay=192.168.1.5:4000
const HOST = new URLSearchParams(location.search).get('relay') ?? 'localhost:4000'

export const API = `http://${HOST}`
export const ASSETS = `${API}/assets`

/** `output` is which CG output this page speaks for — 1 unless told otherwise. */
export function useRelay(output = 1, url = `ws://${HOST}`) {
  const [all, setAll] = useState<OnAir>({})
  const [live, setLive] = useState(false)
  const sock = useRef<WebSocket | null>(null)

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout>

    const open = () => {
      const ws = new WebSocket(url)
      sock.current = ws
      ws.onopen = () => setLive(true)
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        setAll((prev) => {
          if (msg.type === 'sync') return msg.onAir
          if (msg.type === 'take') return { ...prev, [slot(msg)]: msg }
          const rest = { ...prev }
          delete rest[slot(msg)]
          return rest
        })
      }
      // A browser source that loses the relay and never retries is a dead
      // source, so always crawl back.
      ws.onclose = () => {
        setLive(false)
        if (!stopped) timer = setTimeout(open, 1000)
      }
    }
    open()

    return () => {
      stopped = true
      clearTimeout(timer)
      sock.current?.close()
    }
  }, [url])

  // Every page receives every output's state, because the relay broadcasts one
  // stream to everyone. Keep this page's slice and re-key it by layer, so
  // callers read onAir['draft'] exactly as they did with a single output.
  // Filtered here per render rather than at the socket: retargeting control
  // must not drop the connection.
  const onAir: OnAir = Object.fromEntries(
    Object.values(all)
      .filter((take) => (take.output ?? 1) === output)
      .map((take) => [take.layer, take]),
  )

  return {
    onAir,
    live,
    send: (msg: Msg) => sock.current?.send(JSON.stringify(msg)),
  }
}
