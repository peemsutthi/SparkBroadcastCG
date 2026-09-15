import { readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import sirv from 'sirv'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT) || 4000

// Content — character art, sponsor logos, anything that changes with a game
// patch rather than a code change. One copy, both pages read it from here.
// sirv handles mime types, caching and (importantly) path traversal.
// Resolved from this file, not from cwd: `npm run dev` and
// `node server/src/index.js` launch from different directories, and a cwd-
// relative path would silently 404 in one of them.
const ASSETS = fileURLToPath(new URL('../../assets', import.meta.url))
const STYLE = fileURLToPath(new URL('../../style', import.meta.url))

// The CG page's stylesheets are served from style/ instead of bundled by Vite
// so restyling the board is an edit and a browser-source reload — no build,
// no Node on the editing machine. dev: true is load-bearing, not habit: it
// makes sirv answer Cache-Control: no-store, and a cached stylesheet would
// make every edit look like the feature is broken.
const serve = {
  dev: true,
  setHeaders: (res) => res.setHeader('Access-Control-Allow-Origin', '*'),
}
const assets = sirv(ASSETS, serve)
const style = sirv(STYLE, serve)

// Rosters are read off disk per request, never hardcoded: adding a hero, a
// logo or a font is a file drop, no code change and no restart. A readdir is
// cheap enough that caching would only add a staleness bug, and a missing
// folder must not take the relay down.
const list = (dir, ext) =>
  readdir(`${ASSETS}/${dir}`).then(
    (files) => files.filter((f) => ext.test(f)).sort(),
    () => [],
  )

// Hero art shares one basename across three folders, so the name is returned
// without its extension. Logos and fonts have no such pairing, so the filename
// returned (and sent back by control) keeps it.
const heroes = () => list('ban', /\.png$/).then((fs) => fs.map((f) => f.slice(0, -4)))
const teamLogos = () => list('teamlogo', /\.(png|jpe?g|svg|webp)$/i)
const fonts = () => list('fonts', /\.(ttf|otf|woff2?)$/i)

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
  if (req.url === '/api/teamlogos') return json(res, await teamLogos())
  if (req.url === '/api/fonts') return json(res, await fonts())
  if (req.url === '/api/host') return json(res, { host: lanAddress() })

  if (req.url.startsWith('/assets/')) {
    req.url = req.url.slice('/assets'.length)
    return assets(req, res, () => notFound(res))
  }
  if (req.url.startsWith('/style/')) {
    req.url = req.url.slice('/style'.length)
    return style(req, res, () => notFound(res))
  }
  notFound(res)
})

const wss = new WebSocketServer({ server })

// "output/layer" -> what's currently on it. Replayed to every new client,
// because OBS reloads the browser source on scene change and it comes back
// blank. Keyed by output as well as layer so /cg/1 and /cg/2 hold different
// graphics; a message with no output belongs to output 1, which is what an
// older client (or a browser source still on the pre-multi-output URL) sends.
const onAir = {}

const slot = (msg) => `${msg.output ?? 1}/${msg.layer}`

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

    if (msg.type === 'take') onAir[slot(msg)] = msg
    else if (msg.type === 'clear') delete onAir[slot(msg)]

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
  console.log(`style on http://localhost:${PORT}/style/`)
})
