SparkCG - ban/pick board for Arena of Valor broadcasts
======================================================

START
  Double-click SparkCG.exe. A black window opens and says "SparkCG is
  running", and the control page opens in your browser.
  First time only:
    - Windows SmartScreen: click "More info", then "Run anyway"
      (the exe is not signed).
    - Windows Firewall: click "Allow", so OBS on another PC can reach
      port 4000.
  Double-clicking again while it runs just opens the control page.

STOP
  Close the black window. Keep it open for the whole show: closing it
  stops the graphics. What is on air comes back when you start it again.

OBS
  Add one Browser Source per output, width 1920, height 1080.
  The URLs are in the control page's Setup tab:
    http://<this-pc>:4000/cg/1  ...  http://<this-pc>:4000/cg/4

ADD CONTENT (no restart needed)
  Heroes      One PNG with the same filename in all three folders:
                assets\ban\   assets\globalban\   assets\heropick\
              The filename is the name the control page shows,
              e.g. KilGroth.png
  Team logos  assets\teamlogo\   (png, jpg, svg, webp)
  Fonts       assets\fonts\      (ttf, otf, woff, woff2)
  Board art   assets\overlayhud\hud.png

RESTYLE THE BOARD
  Edit style\draft.css (position, size and spacing of everything on the
  board), save, then refresh the Browser Source in OBS.
  Colours and fonts of team names, scores and match info are set in the
  control page, not in the CSS.

UPDATE TO A NEW VERSION
  Close SparkCG, then replace SparkCG.exe and the app folder with the new
  ones. Keep your assets and style folders: they hold your content and
  your edits.

DON'T TOUCH
  app\             the control and output pages. Deleting it blanks them.
  show-state.json  what is on air, written by SparkCG.
