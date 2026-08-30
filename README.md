# SparkBroadcastCG

Broadcast character generator. Three pieces:

- `server/` — WebSocket relay, holds what's on air. `ws://localhost:4000`
- `control/` — operator UI. http://localhost:5173
- `cg/` — transparent render surface for an OBS/vMix browser source. http://localhost:5174

## Dev

Three terminals:

```sh
cd server  && npm run dev
cd control && npm run dev
cd cg      && npm run dev
```

`cd server && npm test` asserts the relay on its own (it spawns the server itself).

## Protocol

Control sends, the relay stores and rebroadcasts to everyone including the sender:

```js
{ type: 'take',  layer: 'lower-third', template: 'lower-third', data: { name, title } }
{ type: 'clear', layer: 'lower-third' }
```

Every client gets `{ type: 'sync', onAir }` the moment it connects, so a browser
source that reloads comes back with the correct graphics still up.

Add a template by putting a component in the `templates` map in `cg/src/App.tsx`.
Current templates: `hero-pick`, `hero-ban`, `global-ban`, `hud`, `lower-third`.

Both pages take `?relay=host:port` to point at a relay on another machine —
OBS usually runs on the streaming PC, not the one hosting the relay:

```
http://192.168.1.5:5174/?relay=192.168.1.5:4000
```

## Assets

Game content — character art, sponsor logos, anything that changes with a patch
rather than a code change — goes in `assets/` at the project root:

```
assets/ban/Airi.png        72x72    pick-phase ban icon
assets/globalban/Airi.png  72x72    global ban icon
assets/heropick/Airi.png   138x250  pick splash art
assets/overlayhud/hud.png  1920x1080
assets/fonts/
```

Served at `http://localhost:4000/assets/...`. The roster is read off disk at
`GET /api/heroes`, so **adding a hero is a file drop** — three PNGs sharing one
filename, no code change and no restart. `npm test` in `server/` fails if a hero
is present in one variant folder but missing from another.

It sits at the root rather than under `server/` because it belongs to the show,
not to the relay — the server is just what serves it today.

One copy, read by both pages. Drop a file in and it serves immediately, no
rebuild. Chrome that belongs to a template instead — its own background, an
icon, a font — goes in `cg/src/assets/` and gets bundled and hashed by Vite.

## OBS / vMix

Browser source at the `cg` URL, sized to your programme resolution (1920x1080).
Leave "shutdown source when not visible" **off** so graphics survive scene changes.
