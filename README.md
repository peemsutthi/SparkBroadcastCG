# SparkBroadcastCG — ban/pick CG overlays for RoV broadcasts

Thanks to @LoongPaan for the codes, ideas and for the amazing support! <3

Live-stream CG overlays for the ban/pick phase of Arena of Valor / RoV broadcasts.

The operator drives the ban/pick sequence from a control page in the browser. The output pages render 1920×1080 transparent overlays that OBS or vMix use as Browser Sources.

![Ban/pick board](docs/board.png)

Architecture, protocol and the rules behind them: [CLAUDE.md](CLAUDE.md).

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

This builds `release/SparkCG/` — `SparkCG.exe` plus `style/`, `assets/`,
`app/` and `README.txt`, the operator's copy of the steps below. It needs
nothing installed on the Windows PC, and it builds from macOS or Windows.
Copy it straight across, or publish it:

```sh
git tag v1.0.0 && git push origin v1.0.0
```

A pushed `v*` tag runs `.github/workflows/release.yml`, which lints,
typechecks, tests, ships and attaches `SparkCG-windows.zip` to a GitHub Release
of that tag. Every push and pull request runs `.github/workflows/ci.yml`: the
same checks plus a build, then a Windows job that ships and starts `SparkCG.exe`.

### Running the shipped app

- Double-click `SparkCG.exe` — the control page opens in the browser.
  First run: SmartScreen says *More info → Run anyway* (the exe is unsigned),
  and allow the firewall prompt so OBS on another PC can reach port 4000.
- The OBS browser-source URLs are in control's **Setup** tab
  (`http://<this-pc>:4000/cg/1` … `/cg/4`).
- Edit `style/*.css` and reload the browser source to restyle live.
- Drop hero PNGs into `assets/ban`, `assets/globalban`, `assets/heropick`
  (same filename in all three), logos into `assets/teamlogo`, fonts into
  `assets/fonts` — no restart.
- The console window says *SparkCG is running*; close it to stop.

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
