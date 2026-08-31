# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Three processes. `npm run dev` at the root starts all three concurrently
(prefixed `SERVER`/`CONTROL`/`CG` output via `concurrently`); to run one on
its own, `cd` into that app instead:

```sh
cd server  && npm run dev     # WebSocket relay + asset/API server, :4000
cd control && npm run dev     # operator UI, :5173
cd cg      && npm run dev     # transparent render surface for OBS, :5174
```

| Task | Command |
|---|---|
| Tests | `cd server && npm test` (the only test suite; spawns its own relay) |
| Typecheck | `cd control && npx tsc -b` — same in `cg/` |
| Lint | `cd control && npm run lint` — same in `cg/` |
| Build | `npm run build` at the root (runs `build:control` then `build:cg`) — or `cd control && npm run build` for one app (runs `tsc -b` then `vite build`) |

`server/check.js` is a single plain-node script — there is no test runner and no
way to run one test. It asserts the relay protocol end to end, then checks that
every hero in `/api/heroes` exists in all three art folders, and that
`/api/host` returns a LAN address rather than `localhost`.

Not a git repository.

## Architecture

Three pieces around one WebSocket relay.

```
control/ ──take/clear──► server/ ──rebroadcast──► cg/
  :5173                   :4000                   :5174
                            │
                            └── holds onAir, replays it to every new client
```

**The relay is the single source of truth for what is on air.** Control renders
what comes back from the relay, not what it sent. Two consequences that shape
everything:

- An OBS browser source reloads on every scene change. It reconnects, receives
  `{ type: 'sync', onAir }`, and comes back with the correct graphics still up.
  Anything that lives only in the operator's browser is lost on that reload — so
  state that must survive belongs in the message, not in a component.
- `onAir` is keyed by **layer**. A `take` replaces that layer; a `clear` removes
  it. `cg/src/App.tsx` renders only what the relay says is up, so nothing may be
  rendered unconditionally there — anything unconditional goes to air.

Protocol (`shared/draft.ts` has the payload types):

```js
{ type: 'take',  layer: 'draft', template: 'draft', data: { ...DraftState } }
{ type: 'clear', layer: 'draft' }
```

### `shared/` is imported across vite roots

`shared/draft.ts` sits above both apps and is imported by each as
`../../shared/draft`. This only works because both `vite.config.ts` files set
`server: { fs: { allow: ['..'] } }` and both `tsconfig.app.json` files include
`"../shared"`. Removing either breaks the dev server with an opaque error.

It holds `DRAFT_SEQUENCE` — the 17-step pick/ban order, where the index is the
step and the value is the slot ids lit at that step. Control names the phase on
its button via `phaseLabel()`, cg pulses the same ids. **Both read the one
array on purpose**: a duplicated copy would drift and put the highlight on a
different slot than the button names, which looks fine in review and is wrong on
air.

### Adding a template

Add an entry to the `templates` map in `cg/src/App.tsx`. The key is the string
control sends as `template`. Current: `lower-third`, `hero-pick`, `hero-ban`,
`global-ban`, `hud`, `draft` — the first four are placeholders superseded by
`draft`.

### Assets

Game content lives in `assets/` at the project root, served at
`http://localhost:4000/assets/...`. The roster is read off disk per request at
`GET /api/heroes`, so **adding a hero is a file drop** — three PNGs sharing one
filename (`ban/`, `globalban/`, `heropick/`), no code change and no restart.

Filenames are CamelCase (`KilGroth.png`, `WonderWoman.png`) and are used
verbatim. Do not lowercase or strip spaces from hero names when building asset
URLs; control's inputs autocomplete off `/api/heroes`, so what it sends already
matches disk.

`assets/` sits at the root rather than under `server/` because it belongs to the
show, not the relay. Chrome that belongs to a template instead — its own
background, an icon, a font — goes in `cg/src/assets/` and is bundled by Vite.

### Cross-machine

OBS usually runs on the streaming PC, not the machine hosting the relay. Both
pages accept `?relay=host:port`. The **CG output URL shown in control's Setup tab
is built from `GET /api/host`**, not from `location.hostname` — a browser cannot
discover its own LAN address, and a copied `localhost` URL is a dead source the
moment it is pasted into OBS on another machine.

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
air. The fix is to adopt the relay's `draft` layer as control's state on
connect; not yet done.

## `samplecode/`

`control.html` and `output.html` are the original single-file socket.io
prototype, kept as reference. The draft step engine and overlay were ported from
them. Not built, not served, not imported.
