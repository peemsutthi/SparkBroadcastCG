import { useEffect, useRef, useState } from 'react'

// OBS usually runs on the streaming PC, not the machine hosting the relay.
// Point a page at another host with ?relay=192.168.1.5:4000
const HOST = new URLSearchParams(location.search).get('relay') ?? 'localhost:4000'

export const API = `http://${HOST}`
export const ASSETS = `${API}/assets`

export type Take = {
  type: 'take'
  layer: string
  template: string
  data: Record<string, unknown>
}
export type Clear = { type: 'clear'; layer: string }
export type Msg = Take | Clear
export type OnAir = Record<string, Take>

export function useRelay(url = `ws://${HOST}`) {
  const [onAir, setOnAir] = useState<OnAir>({})
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
        setOnAir((prev) =>
          msg.type === 'sync'
            ? msg.onAir
            : msg.type === 'take'
              ? { ...prev, [msg.layer]: msg }
              : Object.fromEntries(
                  Object.entries(prev).filter(([layer]) => layer !== msg.layer),
                ),
        )
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

  return {
    onAir,
    live,
    send: (msg: Msg) => sock.current?.send(JSON.stringify(msg)),
  }
}
