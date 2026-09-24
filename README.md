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
git clone https://github.com/peemsutthi/SparkBroadcastCG.git
cd SparkBroadcastCG
npm install
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

## Ship to a Windows show machine

```sh
npm run ship
```

Copy `release/SparkCG/` to the Windows PC. It needs nothing installed.

- Double-click `SparkCG.exe` — the control page opens in the browser.
  First run: SmartScreen says *More info → Run anyway* (the exe is unsigned),
  and allow the firewall prompt so OBS on another PC can reach port 4000.
- The OBS browser-source URLs are in control's **Setup** tab
  (`http://<this-pc>:4000/cg/1` … `/cg/4`).
- Edit `style/*.css` and reload the browser source to restyle live.
- Drop hero PNGs into `assets/ban`, `assets/globalban`, `assets/heropick`
  (same filename in all three) — no restart.
- Close the console window to stop.

## Protocol

The Control page sends commands to the server, which stores and broadcasts the current state to all connected clients.

### Take a CG

```sh
{
  type: 'take',
  output: 1,
  layer: 'draft',
  template: 'draft',
  data: { ...DraftState }
}
```

### Clear a CG

```sh
{
  type: 'clear',
  output: 1,
  layer: 'draft'
}
```

`output` picks which of the 4 CG outputs the command targets and defaults to
1 when omitted, so a browser source left on an old URL keeps working.

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
assets/teamlogo/               any size  team logo, picked by filename
assets/overlayhud/hud.png  1920x1080
assets/fonts/
```

Served at `http://localhost:4000/assets/...`. The roster is read off disk at
`GET /api/heroes`

## OBS / vMix

Use the CG page as a Browser Source, one per output (1-4):

```sh
http://localhost:5174/cg/1
```

If OBS runs on a different machine than the relay, use control's Setup tab
to get the right URL for each output instead of typing `localhost` — a
browser can't know its own LAN address.

## Project Structure

```text
SparkBroadcastCG/
├── assets/          # Game and broadcast assets (ban/, globalban/, heropick/, teamlogo/, overlayhud/, fonts/)
├── style/           # CG stylesheets, served as-is — edit and reload, no rebuild
├── control/         # Control panel (Vite + React), :5173
├── cg/              # Broadcast CG render surface (Vite + React), :5174
├── server/          # WebSocket relay + asset/API server, :4000
├── shared/          # Shared types / utils
├── legacy/          # Original single-file prototype (control.html, output.html) for reference only
├── package.json     # Root dev/build scripts
└── README.md
```
