# Changelog

Newest first. Each section is one batch of related work, usually what went up
in one push. It lists the commit titles it covers, so every change can still be
found in `git log`, and describes each change once, however many commits it
took. Older sections, written one per commit, are kept as they were.

## Voice signaling, Fred's animated character, Prettier

**Date:** 2026-10-09 · **Author:** Julio, merging Fred's branch

**Commits:** `wip: voice, and formatting our code` ·
`Merge branch 'babylon-player-animation' into feature/babylon` ·
`wip:browser negotiation`

- **The microphone is requested when the page loads**

  `startMic` runs once at startup and does nothing if the mic is already open.
  If permission is denied, the status line says so.

- **The server relays voice signaling messages**

  `MyRoom` has a new `"signal"` handler. A client sends `{ to, data }`, the
  server finds the `to` client with `this.clients.get()` and forwards
  `{ from, data }` to it. The server fills in `from` itself, so nobody can pose
  as someone else, and it never reads `data`. WebRTC will use this channel to
  exchange offers, answers and ICE candidates.

- **Test message between clients (temporary)**

  Every client logs the `"signal"` messages it gets, and sends a test one to
  each other player who shows up. With two tabs open, each console should log
  one message. The test send goes away once the real WebRTC messages use this
  channel.

- **Fred's animated character is in**

  From Fred's `babylon-player-animation` branch: the penguin is replaced by
  `character.glb` (Mixamo, ~1.8 tall) playing an idle animation.
  `HELD_GUN_OFFSET` was tuned for the 0.76 penguin, so other players' guns
  probably need adjusting.

- **Prettier on the whole babylon folder**

  Prettier is now a dev dependency and every file was formatted, so most of
  this diff is formatting only. It was also run on Fred's branch before the
  merge, to cut down on conflicts. It uses Prettier's defaults, which match the
  `frontend/` config. To run it: `npx prettier --write .` in
  `babylonjs-multiplayer-server`.

## Commit title: `strict null checks, mocha types for TS 6, real errors on screen`

**Date:** 2026-10-07 · **Author:** Julio

- **Your own player is checked before use**

  `main()` took your player from `room.state.players.get(...)` and handed it
  straight to the reconciler, but `.get()` returns `undefined` when the key is
  missing. It now throws a clear error instead of carrying on with nothing.

- **Startup errors show up on the page**

  Any error inside `main()` used to show "Could not connect", even when it had
  nothing to do with the connection. The status line now shows the real error
  message, and the console still gets the full error with its stack trace.

- **Test globals load in newer editors**

  VS Code ships its own TypeScript (6.0 or newer), which no longer loads every
  `@types` package on its own, so `describe`, `it` and `beforeEach` showed up as
  unknown in the tests. `tsconfig.json` now lists them explicitly with
  `"types": ["node", "mocha"]`. It changes nothing for the project's own
  TypeScript 5, and it's ready for an upgrade to 6.

- **Null checks are back on**

  The template had turned off `strictNullChecks`. It's on again, so TypeScript
  now warns when something might be `undefined`. For that to work, we now check
  for `undefined` where it was missing: your own player in `main()` and the
  player in the tests.

- **Voice chat groundwork**

  New `src/client/voice.ts` with `startMic`, which asks for the microphone.
  It isn't called anywhere yet.

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
