import { readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import sirv from 'sirv'
import { WebSocketServer } from 'ws'

const PORT = 4000

// Content — character art, sponsor logos, anything that changes with a game
// patch rather than a code change. One copy, both pages read it from here.
// sirv handles mime types, caching and (importantly) path traversal.
// Resolved from this file, not from cwd: `npm run dev` and
// `node server/src/index.js` launch from different directories, and a cwd-
// relative path would silently 404 in one of them.
const ASSETS = fileURLToPath(new URL('../../assets', import.meta.url))

const assets = sirv(ASSETS, {
  dev: true,
  setHeaders: (res) => res.setHeader('Access-Control-Allow-Origin', '*'),
})

// Roster read off disk per request, never hardcoded: adding a hero means
// dropping three PNGs in, no code change and no restart. Three readdirs is
// cheap enough that caching would only add a staleness bug.
const heroes = async () => {
  try {
    const files = await readdir(`${ASSETS}/ban`)
    return files
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.slice(0, -4))
      .sort()
  } catch {
    return [] // a missing folder must not take the relay down
  }
}

// A browser cannot discover the address of the machine it runs on, so control
// asks the relay. Without this the copyable browser-source URL says localhost,
// which is a dead source the moment OBS is on the streaming PC instead.
const lanAddress = () =>
  Object.values(networkInterfaces())
    .flat()
    .find((n) => n.family === 'IPv4' && !n.internal)?.address ?? 'localhost'

const json = (res, body) => {
  res.setHeader('content-type', 'application/json')
  res.setHeader('access-control-allow-origin', '*')
  res.end(JSON.stringify(body))
}

const notFound = (res) => {
  res.statusCode = 404
  res.end()
}

const server = createServer(async (req, res) => {
  if (req.url === '/api/heroes') return json(res, await heroes())
  if (req.url === '/api/host') return json(res, { host: lanAddress() })

  if (req.url.startsWith('/assets/')) {
    req.url = req.url.slice('/assets'.length)
    return assets(req, res, () => notFound(res))
  }
  notFound(res)
})

const wss = new WebSocketServer({ server })

// layer -> what's currently on it. Replayed to every new client, because OBS
// reloads the browser source on scene change and it comes back blank.
const onAir = {}

const send = (sock, msg) => sock.send(JSON.stringify(msg))

wss.on('connection', (sock) => {
  send(sock, { type: 'sync', onAir })

  sock.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return // a malformed message must not take the relay down mid-show
    }

    if (msg.type === 'take') onAir[msg.layer] = msg
    else if (msg.type === 'clear') delete onAir[msg.layer]

    // Echo to the sender too: the relay is the single source of truth for
    // what's on air, so control renders what comes back, not what it sent.
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) send(client, msg)
    }
  })
})

server.listen(PORT, () => {
  console.log(`sparkcg relay on ws://localhost:${PORT}`)
  console.log(`assets on http://localhost:${PORT}/assets/`)
})
