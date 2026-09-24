import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// If a relay is already on this port, our own copy dies on bind and every
// connect() below lands on the running one instead — and this check sends
// clears, so on the show machine that is a graphic off air. Only ever talk to
// a relay we started ourselves; PORT=4100 npm test runs beside a dev one.
const PORT = process.env.PORT ?? '4000'
const BASE = `http://localhost:${PORT}`

if (await fetch(`${BASE}/api/host`).then(() => true, () => false)) {
  console.error(`something is already on :${PORT} — stop it, or set PORT`)
  process.exit(1)
}

const server = spawn('node', ['src/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT },
})
process.on('exit', () => server.kill())

const connect = () =>
  new Promise((resolve, reject) => {
    const attempt = (tries) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`)
      ws.onopen = () => resolve(ws)
      ws.onerror = () =>
        tries > 0
          ? setTimeout(() => attempt(tries - 1), 100)
          : reject(new Error('relay never came up'))
    }
    attempt(20)
  })

const next = (ws) => new Promise((res) => (ws.onmessage = (e) => res(JSON.parse(e.data))))

const cg = await connect()
assert.equal((await next(cg)).type, 'sync')

const control = await connect()
await next(control) // its own sync

const take = {
  type: 'take',
  layer: 'lower-third',
  template: 'name',
  data: { name: 'Peem' },
}
const relayed = next(cg)
control.send(JSON.stringify(take))
assert.deepEqual(await relayed, take)

// A take with no `output` belongs to output 1. The whole "a browser source
// still on the old URL keeps working" guarantee rests on this default.
const old = await connect()
assert.deepEqual(Object.keys((await next(old)).onAir), ['1/lower-third'])

// garbage must not kill the relay
const stillAlive = next(cg)
control.send('not json')
control.send(JSON.stringify({ type: 'clear', layer: 'lower-third' }))
assert.equal((await stillAlive).type, 'clear')

// a client joining after the clear sees an empty stage
const late = await connect()
assert.deepEqual((await next(late)).onAir, {})

// Outputs hold separate state. A take addressed to output 2 must not reach
// /cg/1, and clearing output 1 must leave output 2 up — four browser sources
// share this one relay, and a leak between them is a wrong graphic on air.
const onTwo = { type: 'take', output: 2, layer: 'draft', template: 'draft', data: {} }
const echoed = next(cg)
control.send(JSON.stringify(onTwo))
await echoed

const two = await connect()
assert.deepEqual(Object.keys((await next(two)).onAir), ['2/draft'])

const clearedOne = next(cg)
control.send(JSON.stringify({ type: 'clear', output: 1, layer: 'draft' }))
await clearedOne

const stillTwo = await connect()
assert.deepEqual(Object.keys((await next(stillTwo)).onAir), ['2/draft'])

// The CG stylesheets are served the same way — an operator edits style/*.css
// and reloads the browser source — and the same escape hatch must be shut.
const css = await fetch(`${BASE}/style/draft.css`)
assert.equal(css.status, 200)
assert.equal(css.headers.get('content-type'), 'text/css')
assert.notEqual((await fetch(`${BASE}/style/../package.json`)).status, 200)

// Built, the relay serves the pages too: the shipped folder is one port. /cg/2
// must fall back to cg's index (not control's), or OBS shows the operator UI.
if (existsSync(fileURLToPath(new URL('../app/cg', import.meta.url)))) {
  const page = await (await fetch(`${BASE}/cg/2`)).text()
  assert.match(page, /\/cg\/assets\//, '/cg/2 is not the cg page')
  const home = await fetch(`${BASE}/`)
  assert.equal(home.status, 200)
  assert.match(home.headers.get('content-type'), /text\/html/)
}

// The roster endpoint is what control renders from
const roster = await (await fetch(`${BASE}/api/heroes`)).json()
assert.ok(roster.length > 0, 'roster is empty')

// assets are served, and the traversal escape hatch is shut
const png = await fetch(`${BASE}/assets/ban/${roster[0]}.png`)
assert.equal(png.status, 200)
assert.equal(png.headers.get('content-type'), 'image/png')
assert.equal(png.headers.get('access-control-allow-origin'), '*')

const escape = await fetch(`${BASE}/assets/../package.json`)
assert.notEqual(escape.status, 200)

// Every hero must exist in every variant folder. A hero present in heropick but
// missing from globalban is a blank image on air, mid-draft, with no error.
const ASSETS_DIR = fileURLToPath(new URL('../assets', import.meta.url))
const pngs = (dir) =>
  new Set(
    readdirSync(`${ASSETS_DIR}/${dir}`)
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.slice(0, -4)),
  )

for (const variant of ['ban', 'globalban', 'heropick']) {
  const have = pngs(variant)
  const missing = roster.filter((h) => !have.has(h))
  assert.deepEqual(missing, [], `${variant} is missing: ${missing.join(', ')}`)
}

// Control builds the copyable browser-source URL off this. localhost here
// means every URL an operator pastes into OBS points at the wrong machine.
const { host } = await (await fetch(`${BASE}/api/host`)).json()
assert.match(host, /^\d+\.\d+\.\d+\.\d+$|^localhost$/, `bad host: ${host}`)

console.log(`ok — ${roster.length} heroes across 3 variants, host ${host}`)
process.exit(0)
