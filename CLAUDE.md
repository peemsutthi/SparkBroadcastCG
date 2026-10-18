# CLAUDE.md

## Commands

One npm workspace: `npm install` at the root installs all three apps; `npm run dev` there starts
all three (`SERVER`/`CONTROL`/`CG` prefixes). One alone: `cd server && npm run dev` (WebSocket
relay + asset/API server, :4000), likewise `control` (operator UI, :5173) and `cg` (transparent
render surface for OBS, :5174). All tooling (TypeScript, ESLint, Vite, React) is in the root
`package.json`; `control/` and `cg/` are just `src/`, `index.html`, `vite.config.ts`.

| Task | Command |
| --- | --- |
| Tests | `npm test` (the only test suite; spawns its own relay) |
| Typecheck, lint | `npm run typecheck`, `npm run lint` — one root `tsconfig.json` / `eslint.config.js` covers control, cg and `shared/` |
| Build | `npm run build` — typechecks, then Vite builds both apps into `app/` |
| Ship | `npm run ship` — see *Shipping* |

`server/check.js` is one plain-node script, no runner, no single-test mode: the relay protocol end
to end (incl. `onAir` surviving a killed relay, on its own temp `STATE_FILE`), every hero in all
three art folders, `/api/host` a LAN address. It refuses a taken port — it sends clears, which on
the show machine take a graphic off air. Beside `npm run dev`, run `PORT=4100 npm test`.

## Architecture

```text
control/ :5173 ──take/clear, output N──► server/ :4000 ──rebroadcast──► cg/ :5174
                                         holds onAir, replays it        /cg/1../cg/4: one app,
                                         to every new client            the path picks the output
```

**The relay is the single source of truth for what is on air.** Control renders what comes back.

- OBS reloads a browser source on every scene change; it reconnects, gets the `sync`
  (`{ type: 'sync', onAir }`) and comes back with its graphics up. Anything held only in a
  component is lost on that reload, so state that must survive goes in the message.
- `onAir` is keyed by **output and layer** (`"2/draft"`). A `take` replaces that layer on that
  output; a `clear` removes it. `cg/src/App.tsx` renders only what the relay says is up, plus a
  just-cleared layer held on its last take while its out plays — never anything unconditional,
  which would go to air.
- `onAir` outlives the relay: every `take` and `clear` rewrites `show-state.json` in `ROOT` (temp
  file, then rename), loaded on start, so a crash or closed console window comes back with the
  same graphics up. Missing or unreadable: one log line, start empty. `STATE_FILE` overrides the
  path (gitignored).
- Four outputs (`OUTPUTS` in `shared/draft.ts`), **one Vite app**: `cg/src/main.tsx` reads the
  output off the path (`/cg/3` → 3, `/` → 1); `useRelay` keeps that output's slice, re-keyed by
  layer, so code below it reads `onAir['draft']`. Vite's SPA fallback serves `/cg/N`. Control
  drives one output at a time (*Target Output Channel*) while the relay holds the others; filtering
  is per render, not at the socket, so retargeting never drops the connection.

Protocol (types in `shared/draft.ts`). No `output` means output 1, so old browser-source URLs keep
working. Dropped, not stored or forwarded: anything but a take or clear (a page reads it as a
clear), and one whose `output` is not 1–4, `layer`/`template` not a non-empty string or `data`
not an object (stored, it would be replayed to every page on every reconnect).

```js
{ type: 'take',  output: 1, layer: 'draft', template: 'draft', data: { ...DraftState } }
{ type: 'clear', output: 1, layer: 'draft' }
```

### `shared/` is imported across vite roots

Both apps import `shared/draft.ts` and `shared/relay.ts` as `../../shared/...`. That needs
`server: { fs: { allow: ['..'] } }` in both `vite.config.ts` and `"shared"` in the root
`tsconfig.json` — remove either and the dev server fails with an opaque error. `relay.ts`'s react
import resolves from the root `node_modules` only because the apps are npm workspaces.
`shared/` holds the wire types, `OUTPUTS` (a fifth output is one entry here) and `slot()`, the
`output/layer` key. `server/src/index.js` copies `OUTPUTS` and `slot` only because it is plain JS:
keep them in step — if the `slot`s disagree, control's tally reads OFF AIR on a live board. It
also holds `DRAFT_SEQUENCE`, the 17-step pick/ban order (index = step, value = slot ids lit):
control names the phase via `phaseLabel()`, cg pulses the same ids. **Both read the one array on
purpose**: a copy would drift and light a different slot than the button names.

### Adding a template

Add an entry to `templates` in `cg/src/App.tsx`; the key is the `template` control sends (now
`draft`). A template owns its own out: after a `clear` it stays mounted with `leaving: true` and
calls `onLeft` on its out's `animationend`. cg's `App.tsx` also drops each leaving layer after a
1.5 s fallback timer, since a hidden OBS source can throttle animations and the event may never
come; a take for that layer during the out cancels the timer. The fallback must outlast every out.

### Assets, style, cross-machine

- `assets/` and `style/` belong to the show, not the relay, so they sit at the root; a template's
  own chrome (background, icon, font) goes in `cg/src/assets/`, bundled by Vite.
- `GET /api/heroes` reads the roster off disk per request, so **adding a hero is a file drop**:
  three PNGs, one filename, in `assets/ban/`, `globalban/`, `heropick/`; no code change, no
  restart. Filenames are CamelCase (`KilGroth.png`), used verbatim — never lowercase or strip
  spaces in asset URLs; control autocompletes off `/api/heroes`, so it already matches disk.
- `style/` (`index.css` page and stage, `draft.css` the board) is linked at runtime by
  `cg/src/main.tsx` against the relay host, not bundled: **restyling is a file edit** and a
  browser-source reload. The relay serves it with `dev: true` (no cache) — a cached stylesheet
  would look like the feature is broken. No fallback CSS on purpose: `App.tsx` renders nothing
  until `sync` arrives from the host serving the CSS.
- OBS usually runs on another PC. Both pages accept `?relay=host:port`; cg's stylesheet links
  follow it. **Control's Setup tab builds the CG URLs from `GET /api/host`**, not
  `location.hostname`: a browser cannot learn its own LAN address, and a copied `localhost` URL
  is dead in OBS on another PC. One per output: `http://<host>:5174/cg/2?relay=<host>:4000`.

## Shipping (Windows)

`npm run ship` → `release/SparkCG/`: `SparkCG.exe` + `style/` + `assets/` + `app/` + `README.txt`
(= `scripts/operator-README.txt`; keep it in step with the exe). No Node on the show machine.
Empty `assets/teamlogo/` and `assets/fonts/` show the operator where to drop.

- **Built, the relay serves all on :4000**: control `/`, cg `/cg/N` (sirv `single: true`),
  `/assets`, `/style`, `/api/*`; control's bundle dir `ui/` and cg's base `/cg/` keep clear of
  `/assets/`. Pages take the relay from `location.host`: OBS URL `http://<lan>:4000/cg/2`.
- The exe is a Node SEA: `scripts/ship.mjs` bundles the relay (Vite) into `server/dist/relay.cjs`,
  injected into the official `node.exe` of the **same Node version** as the build, so a Mac can.
- In the exe `ROOT` is its own folder (`sea.isSea()`), so `style/` and `assets/` stay editable.
  Start opens the browser; a second double-click only does that. The console window is the
  operator's "running" sign and off switch: titled *SparkCG — RUNNING · close this window to
  stop*, with a plain-English banner, not dev logs.
- A pushed `v*` tag runs `release.yml`: lint, test, ship on Ubuntu, then `SparkCG-windows.zip`
  (the name README's download link promises) as a GitHub Release. No macOS build yet: needs darwin
  node, `--macho-segment-name NODE_SEA`, `codesign --sign -`, `open` in place of `start`.

## Design language (control UI)

One broadcast palette, in `:root` of `control/src/index.css`, read by name — no component hex:

| Token | Purpose | Hex | Token | Purpose | Hex |
| --- | --- | --- | --- | --- | --- |
| `--normal-camera` | Normal / Camera | `#1e3a5f` | `--preview` | Preview | `#ea580c` |
| `--team-a` | Team A identity | `#2563eb` | `--graphics-cg` | Graphics / CG | `#0891b2` |
| `--team-b` | Team B identity | `#dc2626` | `--audio` | Audio | `#0d9488` |
| `--replay-a` | Replay A | `#7c3aed` | `--utility` | Utility / Control | `#475569` |
| `--replay-b` | Replay B | `#c026d3` | `--warning` | Warning / attention | `#ca8a04` |
| `--program-live` | Program / Live — **ON AIR and nothing else** | `#16a34a` | `--disabled` | Disabled | `#374151` |

- `--program-live` is the tally: a panel with a graphic up burns its 4px left rail green. Team
  colours are identity, not state, so they sit on the panel head's top edge, clear of the rail.
- `--warning` is attention (relay-down lamp, armed clear); `--disabled` a disabled control's text.
  Replay/preview/graphics-cg/audio have no consumer yet: wire them up, don't invent a hex.
  `--key-lit` and `--accent` alias `--normal-camera` and `--team-a`.
- **Labels are tracked caps (Archivo), values are mono (Azeret Mono).** Labels don't change.
- **Press it → raised, type in it → recessed**: buttons/selects top highlight, inputs inset.

## Control adopts what is on air

Control's draft is local; what is on air is the relay's. On every `sync` (control reload, relay
back), a change of target output, or a take from another control tab, control takes the target
output's `draft` layer as its draft; with nothing up there, the local draft stands (that is how a
board is copied to a fresh output). `useRelay` counts `syncs` to tell a sync from an echo. Every
take carries `from`, the sender tab's id: a tab adopts another tab's take, never its own echo
(that would overwrite a field mid-typing). The exe opens a tab per start, so after a restart there
are two, and a stale one must not push its old board over the live one. A clear carries no `from`,
so another tab's *Hide* leaves this tab's step alone. The cost: anything not yet sent to air
(*Next phase*, *Sync*) is replaced at those moments by what is on air.
