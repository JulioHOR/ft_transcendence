# Changelog

Grouped by commit, so each change can be found in `git log`. Newest first.

## Commit title: `npm 12 setup, synced rotation, grounded penguins, AK-47 in hand`

**Date:** 2026-10-06 · **Author:** Julio

- **npm install works on npm 12**

  npm 12 blocks git dependencies and install scripts by default, so
  `npm install` was failing. `.npmrc` now allows git dependencies (`colyseus`
  pulls `uWebSockets.js` from GitHub), and `package.json` approves the install
  scripts of `esbuild` and `msgpackr-extract`. That approval is pinned to their
  exact versions, so npm asks again if either gets updated.

- **Clean install steps**

  The README now explains how to install and run the project on a fresh machine.

- **Player rotation is synced**

  Only the position used to reach the server, so other penguins never turned.
  Now the camera's yaw goes along with `updatePosition`, the server keeps it on
  `Player` (valid numbers only), and every client turns the other penguins with
  it. It isn't smoothed yet, so it can look a bit choppy.

- **A Babylon gotcha with `.glb` files**

  The loader turns the model 180° and stores that in `rotationQuaternion`, and
  while it's set Babylon ignores `.rotation`. We swap it for the same turn in
  `.rotation.y`. The 180° live in `MODEL_YAW_OFFSET`; if a new model faces
  backwards, fix it there.

- **Penguins stand on the ground**

  They were placed at `1.75 / 2`, as if the model were 1.75 tall with its origin
  in the middle. It's actually 0.76 tall with the origin at the feet, so they
  floated. They now sit at `y = 0`.

- **Collision and camera fit the penguin**

  Your own penguin used Babylon's default collision ellipsoid, which is 2 units
  tall. It's now penguin-sized and rests on the feet, and the camera dropped
  from 1.625 to eye level (0.6). The sizes live in `PENGUIN_HEIGHT`,
  `PENGUIN_RADIUS` and `EYE_HEIGHT`.

- **AK-47 model credited**

  `public/models/ak-47.glb` is by Lokeig on Sketchfab under CC BY-NC 4.0, which
  requires credit, so it's listed in a new `CREDITS.md` at the repo root, and
  the root `README.md` now points to that file.

- **You hold an AK-47**

  The gun is attached to the camera, so it follows where you look. The model
  came lying sideways, about 1.9 long and far from its own origin, so
  `createGun` wraps it in a small hierarchy: a pivot for aiming, a node that
  scales it and turns the barrel forward, and the glTF root shifted so the grip
  sits on the pivot. The camera's near plane went from 0.1 to 0.01, otherwise a
  gun this close to the eye gets cut off.

- **Everyone else holds one too**

  Each remote penguin gets an invisible head at eye level that turns with their
  yaw and pitch, and their gun hangs from it. `pitch` is new on `Player` and
  travels in `updatePosition`, checked like `yaw`. The head isn't a child of the
  penguin because the penguin's glTF root is mirrored (scale z = -1), which
  would distort the gun. When a player leaves, their head is disposed and the
  gun goes with it. The penguin itself doesn't tilt up or down, since the model
  has no skeleton; only the gun does.

- **Gun tuning knobs**

  `GUN_SCALE` and `VIEWMODEL_OFFSET` place your own gun; `HELD_GUN_SCALE` and
  `HELD_GUN_OFFSET` place everyone else's. They're separate because a gun a few
  centimetres from your eye and one seen across the room need different sizes.

Files: `.npmrc`, `package.json`, `README.md`, `src/rooms/schema/MyRoomState.ts`,
`src/rooms/MyRoom.ts`, `src/client/index.ts`, `public/models/ak-47.glb`, and
`CREDITS.md` and `README.md` at the repo root.
