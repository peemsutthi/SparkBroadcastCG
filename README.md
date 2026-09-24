# SparkBroadcastCG RoV BroadcastCG overlays

Thanks to @LoongPaan for the codes, ideas and for the amazing support! <3

Live-stream CG overlays for the ban/pick phase of Arena of Valor / RoV broadcasts.

The operator drives the ban/pick sequence from a control page in the browser. The output pages render 1920×1080 transparent overlays that OBS or vMix use as Browser Sources.

## Download (Windows, no install)

Get `SparkCG-windows.zip` from the
[Releases](https://github.com/peemsutthi/SparkBroadcastCG/releases) page,
unzip it, and double-click `SparkCG.exe`. See
[Running the shipped app](#running-the-shipped-app) below.

## Develop

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

### Check

```sh
npm test            # relay protocol + asset checks
npm run typecheck   # control, cg and shared/
npm run lint
npm run build       # typecheck, then build both pages into app/
```

## Ship to a Windows show machine

```sh
npm run ship
```

This builds `release/SparkCG/` — `SparkCG.exe` plus `style/`, `assets/` and
`app/`. Zip it and attach it to a GitHub Release, or copy it straight to the
Windows PC. It needs nothing installed. It builds from macOS or Windows.

### Running the shipped app

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

Use the CG page as a Browser Source, one per output (1-4), sized 1920×1080:

```sh
http://<relay-pc>:4000/cg/1     # shipped app
http://localhost:5174/cg/1      # npm run dev
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
├── shared/          # Code both pages use: pick/ban order, message types, relay hook
├── scripts/         # ship.mjs — builds the Windows release
├── legacy/          # Original single-file prototype (control.html, output.html) for reference only
├── app/             # (generated) built control + cg, served by the relay — npm run build
├── release/         # (generated) the Windows folder — npm run ship
├── package.json     # All dependencies and scripts
├── tsconfig.json    # One typecheck for control, cg and shared/
└── eslint.config.js # One lint for control, cg and shared/
```
