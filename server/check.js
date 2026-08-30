import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// 1x1 png fixture, written and removed here so the check owns everything it needs
const CHARS = fileURLToPath(new URL('../assets/chars', import.meta.url))
const FIXTURE = `${CHARS}/__check__.png`
mkdirSync(CHARS, { recursive: true })
writeFileSync(
  FIXTURE,
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
)
process.on('exit', () => rmSync(FIXTURE, { force: true }))

const server = spawn('node', ['src/index.js'], { stdio: 'inherit' })
process.on('exit', () => server.kill())

const connect = () =>
  new Promise((resolve, reject) => {
    const attempt = (tries) => {
      const ws = new WebSocket('ws://localhost:4000')
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

// garbage must not kill the relay
const stillAlive = next(cg)
control.send('not json')
control.send(JSON.stringify({ type: 'clear', layer: 'lower-third' }))
assert.equal((await stillAlive).type, 'clear')

// a client joining after the clear sees an empty stage
const late = await connect()
assert.deepEqual((await next(late)).onAir, {})

// assets are served, and the traversal escape hatch is shut
const png = await fetch('http://localhost:4000/assets/chars/__check__.png')
assert.equal(png.status, 200)
assert.equal(png.headers.get('content-type'), 'image/png')
assert.equal(png.headers.get('access-control-allow-origin'), '*')

const escape = await fetch('http://localhost:4000/assets/../package.json')
assert.notEqual(escape.status, 200)

// The roster endpoint is what control renders from
const roster = await (await fetch('http://localhost:4000/api/heroes')).json()
assert.ok(roster.length > 0, 'roster is empty')

// Every hero must exist in every variant folder. A hero present in heropick but
// missing from globalban is a blank image on air, mid-draft, with no error.
const ASSETS_DIR = fileURLToPath(new URL('../assets', import.meta.url))
const pngs = (dir) =>
  new Set(
    readdirSync(`${ASSETS_DIR}/${dir}`)
      .filter((f) => f.endsWith('.png') && !f.startsWith('__check__'))
      .map((f) => f.slice(0, -4)),
  )

for (const variant of ['ban', 'globalban', 'heropick']) {
  const have = pngs(variant)
  const missing = roster.filter((h) => !have.has(h))
  assert.deepEqual(missing, [], `${variant} is missing: ${missing.join(', ')}`)
}

// Control builds the copyable browser-source URL off this. localhost here
// means every URL an operator pastes into OBS points at the wrong machine.
const { host } = await (await fetch('http://localhost:4000/api/host')).json()
assert.match(host, /^\d+\.\d+\.\d+\.\d+$|^localhost$/, `bad host: ${host}`)

console.log(`ok — ${roster.length} heroes across 3 variants, host ${host}`)
process.exit(0)
