# SparkBroadcastCG RoV BroadcastCG overlays

Thanks to @LoongPaan for the codes and ideas and for the amazing suppport! <3

This program is a live-stream CG overlays during the BAN/PICK phases for Arena of Valor / RoV broadcasts systems.

The operator can control a ban/pick sequence via a control page in a browser.The output page render 1920×1080 transparent overlays that OBS or vMix can used as input as Browser Sources.

## Dev

Three terminals:

```sh
cd server  && npm run dev
cd control && npm run dev
cd cg      && npm run dev
```

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

Game content and everything goes in `assets/` at the project root:

```
assets/ban/charname.png        72x72    pick-phase ban icon
assets/globalban/charname.png  72x72    global ban icon
assets/heropick/charname.png   138x250  pick splash art
assets/overlayhud/hud.png  1920x1080
assets/fonts/
```

Served at `http://localhost:4000/assets/...`. The roster is read off disk at
`GET /api/heroes`

## OBS / vMix

Browser source at the `cg` URL, sized to your programme resolution (1920x1080).
Leave "shutdown source when not visible" **off** so graphics survive scene changes.
