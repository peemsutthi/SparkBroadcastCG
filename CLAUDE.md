# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Three processes, one npm workspace: a single `npm install` at the root
installs all three. `npm run dev` at the root starts all three concurrently
(prefixed `SERVER`/`CONTROL`/`CG` output via `concurrently`); to run one on
its own, `cd` into that app instead:

```sh
cd server  && npm run dev     # WebSocket relay + asset/API server, :4000
cd control && npm run dev     # operator UI, :5173
cd cg      && npm run dev     # transparent render surface for OBS, :5174
```

| Task | Command |
|---|---|
| Tests | `npm test` (the only test suite; spawns its own relay) |
| Typecheck | `npm run typecheck` — one root `tsconfig.json` covers control, cg and `shared/` |
| Lint | `npm run lint` — one root `eslint.config.js` covers control, cg and `shared/` |
| Build | `npm run build` — typechecks, then Vite builds both apps into `app/` |
| Ship | `npm run ship` — see *Shipping* below |

All tooling (TypeScript, ESLint, Vite, React) is declared once in the root
`package.json`; `control/` and `cg/` are just `src/`, `index.html` and a
`vite.config.ts`.

`server/check.js` is a single plain-node script — there is no test runner and no
way to run one test. It asserts the relay protocol end to end, then checks that
every hero in `/api/heroes` exists in all three art folders, and that
`/api/host` returns a LAN address rather than `localhost`.

It spawns its own relay on :4000 and refuses to run if one is already there —
it sends clears, and on the show machine those would take a graphic off air.
To run it beside `npm run dev`, give it a port of its own: `PORT=4100 npm test`.

## Architecture

Three pieces around one WebSocket relay.

```
control/ ──take/clear──► server/ ──rebroadcast──► cg/
  :5173     for output N   :4000                   :5174
                            │                        │
                            │                  /cg/1 .. /cg/4
                            │                  one app, the path
                            └── holds onAir,   picks the output
                                replays it to
                                every new client
```

**The relay is the single source of truth for what is on air.** Control renders
what comes back from the relay, not what it sent. Two consequences that shape
everything:

- An OBS browser source reloads on every scene change. It reconnects, receives
  `{ type: 'sync', onAir }`, and comes back with the correct graphics still up.
  Anything that lives only in the operator's browser is lost on that reload — so
  state that must survive belongs in the message, not in a component.
- `onAir` is keyed by **output and layer** (`"2/draft"`). A `take` replaces that
  layer on that output; a `clear` removes it. `cg/src/App.tsx` renders only what
  the relay says is up, so nothing may be rendered unconditionally there —
  anything unconditional goes to air.

Protocol (`shared/draft.ts` has the payload types):

```js
{ type: 'take',  output: 1, layer: 'draft', template: 'draft', data: { ...DraftState } }
{ type: 'clear', output: 1, layer: 'draft' }
```

A message with no `output` is output 1, so a browser source left on the old URL
keeps working.

### Outputs

Four CG outputs, `OUTPUTS` in `shared/draft.ts`. They are **one Vite app**, not
four: `cg/src/main.tsx` reads the output off `location.pathname` (`/cg/3` → 3,
bare `/` → 1) and hands it to `useRelay`, which keeps only that output's slice
of the relay's state and re-keys it by layer — so everything below the hook
reads `onAir['draft']` exactly as it did with one output. Vite's SPA fallback
serves `/cg/N` with no router and no config; adding a fifth output is one entry
in `OUTPUTS`.

Control addresses one output at a time — the *Target Output Channel* select in
the Match panel. The relay holds the other outputs' state untouched while it is
retargeted, so a board can sit on air on output 1 while the operator drives
output 2. Filtering happens per render, not at the socket, so switching target
never drops the connection.

### `shared/` is imported across vite roots

`shared/draft.ts` and `shared/relay.ts` sit above both apps and are imported
by each as `../../shared/draft` / `../../shared/relay`. This only works because
both `vite.config.ts` files set `server: { fs: { allow: ['..'] } }` and the
root `tsconfig.json` includes `"shared"`. Removing either breaks the dev
server with an opaque error. `relay.ts` also imports react, which resolves from
the root `node_modules` only because the apps are npm workspaces — a per-app
install would leave `shared/` with nothing to resolve against.

It holds the wire types and `slot()` — the `output/layer` key that decides
what is on air. `shared/relay.ts` imports them so the key format has one
definition; the server keeps its own copy of `slot` only because it is plain
JS and cannot import a `.ts` file. If those two ever disagree, control's tally
reads OFF AIR while a board is live.

It also holds `DRAFT_SEQUENCE` — the 17-step pick/ban order, where the index is the
step and the value is the slot ids lit at that step. Control names the phase on
its button via `phaseLabel()`, cg pulses the same ids. **Both read the one
array on purpose**: a duplicated copy would drift and put the highlight on a
different slot than the button names, which looks fine in review and is wrong on
air.

### Adding a template

Add an entry to the `templates` map in `cg/src/App.tsx`. The key is the string
control sends as `template`. Current: `draft`.

### Assets

Game content lives in `assets/` at the project root, served at
`http://localhost:4000/assets/...`. The roster is read off disk per request at
`GET /api/heroes`, so **adding a hero is a file drop** — three PNGs sharing one
filename (`ban/`, `globalban/`, `heropick/`), no code change and no restart.

Filenames are CamelCase (`KilGroth.png`, `WonderWoman.png`) and are used
verbatim. Do not lowercase or strip spaces from hero names when building asset
URLs; control's inputs autocomplete off `/api/heroes`, so what it sends already
matches disk.

The CG page's stylesheets live in `style/` at the root too — `index.css`
(page and stage) and `draft.css` (the board) — served at `http://localhost:4000/style/...` and linked
at runtime by `cg/src/main.tsx` against the relay host, not bundled by Vite. So
**restyling the board is a file edit**: change `style/draft.css`, reload the
OBS browser source, and it lands with no build and no restart. The relay serves
it with `dev: true`, which is what makes the reload see the edit — a cached
stylesheet would look like the feature is broken. No unstyled flash is
possible: `App.tsx` renders nothing until the relay's `sync` arrives, from the
same host that serves the CSS, so there is deliberately no fallback CSS.

`assets/` and `style/` sit at the root rather than under `server/` because they
belong to the show, not the relay. Chrome that belongs to a template instead —
its own background, an icon, a font — goes in `cg/src/assets/` and is bundled
by Vite.

### Cross-machine

OBS usually runs on the streaming PC, not the machine hosting the relay. Both
pages accept `?relay=host:port`; cg's stylesheet `<link>`s follow it too, since
they are built off the same host. The **CG output URLs shown in control's Setup tab
are built from `GET /api/host`**, not from `location.hostname` — a browser cannot
discover its own LAN address, and a copied `localhost` URL is a dead source the
moment it is pasted into OBS on another machine. One URL per output:
`http://<host>:5174/cg/2?relay=<host>:4000`.

## Shipping (Windows)

`npm run ship` → `release/SparkCG/`, the folder handed to the operator:
`SparkCG.exe` + `style/` + `assets/` + `app/`. No Node on the show machine.

- **Built, the relay serves everything on :4000**: control at `/`, cg at
  `/cg/N` (sirv `single: true`), plus `/assets`, `/style`, `/api/*`. `npm run
  build` writes `app/control` and `app/cg` at the root for this; control's
  bundle dir is `ui/` and cg's base is `/cg/` so neither collides with the
  relay's `/assets/`. Built pages take the relay from `location.host`
  (`shared/relay.ts`), so OBS URLs are `http://<lan>:4000/cg/2`, no `?relay=`.
- The exe is a Node single executable: `scripts/ship.mjs` bundles the
  relay (via Vite's `build()`) into `server/dist/relay.cjs`, which is injected into the official
  `node.exe` of the **same Node version** running the build. That is why it
  builds from a Mac.
- In the exe, `ROOT` is the exe's own folder (`sea.isSea()` in
  `server/src/index.js`) — that is what keeps `style/` and `assets/` editable
  after shipping. It also opens the browser on start, and a second
  double-click just opens the browser. The console window is the off switch.
- macOS is not built yet: darwin node binary, `--macho-segment-name
  NODE_SEA`, `codesign --sign -`, and `open` in place of `start`.

## Design language (control UI)

Colour carries a fixed broadcast-purpose palette, defined once in `:root` in
`control/src/index.css` and read everywhere else by name — no component
carries its own hex:

| Token | Purpose | Hex |
|---|---|---|
| `--normal-camera` | Normal / Camera | `#1e3a5f` |
| `--team-a` | Team A identity | `#2563eb` |
| `--team-b` | Team B identity | `#dc2626` |
| `--replay-a` | Replay A | `#7c3aed` |
| `--replay-b` | Replay B | `#c026d3` |
| `--program-live` | Program / Live — **ON AIR and nothing else** | `#16a34a` |
| `--preview` | Preview | `#ea580c` |
| `--graphics-cg` | Graphics / CG | `#0891b2` |
| `--audio` | Audio | `#0d9488` |
| `--utility` | Utility / Control | `#475569` |
| `--warning` | Warning / attention | `#ca8a04` |
| `--disabled` | Disabled | `#374151` |

- `--program-live` is the tally colour: a panel with a graphic up burns the
  4px rail down its left edge program-live green. `--team-a`/`--team-b` are
  identity, not state, and are carried on the panel head's top edge instead —
  clear of the tally rail so team colour never reads as on-air.
- `--warning` is attention (relay-down lamp, the armed "press again to
  clear" state). `--disabled` is a disabled control's text colour.
- `--replay-a`/`--replay-b`/`--preview`/`--graphics-cg`/`--audio` are defined
  for the wider purpose palette but have no consumer in this app yet — wire
  them up rather than inventing a new hex when that functionality lands.
- `--key-lit` and `--accent` (the "lit key" hover/selected chrome) are
  aliases onto `--normal-camera`/`--team-a` respectively, not independent
  colours — everything still traces back to the one table above.

Two rules that carry through every panel:

- **Labels are tracked caps (Archivo), values are mono (Azeret Mono).** Labels
  do not change, values do.
- **Press it → raised. Type in it → recessed.** Buttons and selects get a top
  highlight; inputs get an inset shadow.

## Known issue

Reloading control resets its local draft state to step 0 while the relay still
holds the live draft, so the tally rail reads ON AIR while the transport reads
OFF AIR. Pressing *Show draft* in that state pushes control's empty board to
air. Retargeting the output has the same shape: the tally follows the new
output, while the board on screen is still the one the operator was driving.
The fix is to adopt the target output's `draft` layer as control's state on
connect and on retarget; not yet done.

## `legacy/`

`control.html` and `output.html` are the original single-file socket.io
prototype, kept as reference. The draft step engine and overlay were ported from
them. Not built, not served, not imported.
