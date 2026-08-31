# SparkBroadcastCG RoV BroadcastCG overlays

Thanks to @LoongPaan for the codes, ideas and for the amazing suppport! <3

This program is a live-stream CG overlays during the BAN/PICK phases for Arena of Valor / RoV broadcasts systems.

The operator can control a ban/pick sequence via a control page in a browser.The output page render 1920×1080 transparent overlays that OBS or vMix can used as input as Browser Sources.

## Quick Start

### Requirements

- Node.js
- npm

### Install

Clone the repo and install the dependencies:

```sh
git clone https://github.com/peemsutthi/SparkBroadcastCG.git cd SparkBroadcastCG npm install
```

### Run

Start the server, control UI, and CG with:

```sh
npm run dev
```

Or to run one on its own:

```sh
cd server  && npm run dev     # relay, :4000
cd control && npm run dev     # operator UI, :5173
cd cg      && npm run dev     # render surface, :5174
```

## Protocol

The Control page sends commands to the server, which stores and broadcasts the current state to all connected clients.

### Take a CG

```sh
{
  type: 'take',
  layer: 'draft',
  template: 'draft',
  data: { ...DraftState }
}
```

### Clear a CG

```sh
{
  type: 'clear',
  layer: 'draft'
}
```

When a client connects, the server immediately sends:

```sh
{
  type: 'sync',
  onAir: ...
}
```

This allows a CG browser source to reload or reconnect and automatically recover the current on-air graphics.

## Assets

All game and broadcast assets are stored in the root `assets/` directory.

```text
assets/ban/charname.png        72x72    pick-phase ban icon
assets/globalban/charname.png  72x72    global ban icon
assets/heropick/charname.png   138x250  pick splash art
assets/overlayhud/hud.png  1920x1080
assets/fonts/
```

Served at `http://localhost:4000/assets/...`. The roster is read off disk at
`GET /api/heroes`

## OBS / vMix

Use the CG Page as a Browser Source.

CG URL:

```sh
http://localhost:5174
```

## Project Structure

```text
SparkBroadcastCG/
├── assets/          # Game and broadcast assets (ban/, globalban/, heropick/, overlayhud/, fonts/)
├── control/         # Control panel (Vite + React), :5173
├── cg/              # Broadcast CG render surface (Vite + React), :5174
├── server/          # WebSocket relay + asset/API server, :4000
├── shared/          # Shared types / utils
├── legacy/          # Original single-file prototype (control.html, output.html) for reference only
├── package.json     # Root dev/build scripts
└── README.md
```
