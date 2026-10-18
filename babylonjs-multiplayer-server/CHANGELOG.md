# Changelog

Newest first. Each section is one batch of related work, usually what went up
in one push. It lists the commit titles it covers, so every change can still be
found in `git log`, and describes each change once, however many commits it
took. Older sections, written one per commit, are kept as they were.

## Wall climbing, voice cleanup on disconnect

**Date:** 2026-10-17 · **Author:** Julio

**Commits:** `feat: we have glitch, and other bugfixes`

- **Climbing walls (on purpose)**

  The previous version had a glitch where you could climb walls by jumping
  against them, and it is back as a feature. Two short horizontal rays are
  cast from the middle of the body, one where the camera faces and one
  behind, counting only meshes with collisions. If either hits, the player is
  against a wall and can jump even in the air, so holding Space against a
  wall climbs it smoothly. Letting go, or getting past the top, drops you
  back down.

- **Voice stops when you leave the room**

  Voice is peer-to-peer, so it kept working after your own connection to the
  room ended. `removeAllVoiceConnections()` in `voice.ts` closes every voice
  connection, and it now runs in `room.onLeave`. When another player leaves,
  `onRemove` still closes just theirs.

- **Faster give-up on reconnection**

  When the connection drops, the SDK first tries to reconnect (`onDrop`), and
  only fires `onLeave` when it gives up. By default that took about a minute.
  `room.reconnection.maxRetries` is now 5, which measured about 10 seconds.
  The server still holds a dropped player's seat for 30 seconds, so if only
  one player loses their network, others may see them standing still until
  then.

## Proximity voice, running, jumping

**Date:** 2026-10-17 · **Author:** Julio

**Commits:** `wip: jump and voice` · `feat: we have jump, voice, and running`

- **Voice fades with distance**

  Every frame, each other player's distance is passed to `setPeerDistance`,
  which sets the volume of their audio: full when close, silent at
  `MAX_DISTANCE_VOICE_HEARD`. The volume follows the square of the remaining
  distance, because a straight line sounded like nothing changed and then
  cut off at once. There is no direction yet (no left/right).

- **Running**

  Holding Shift moves at `RUN_SPEED` instead of `PLAYER_SPEED` (both in
  `src/shared/constants.ts`). There is no running animation yet.

- **Jumping, seen by everyone**

  Space jumps. `GRAVITY` and `JUMP_SPEED` are in `src/shared/constants.ts`,
  and the loop adds gravity to the vertical speed and passes the movement to
  `moveWithCollisions`, the way the Babylon docs do it. The player's height is
  now part of the state (`height` on `Player`), sent in `updatePosition`,
  checked with `Number.isFinite` on the server and smoothed by `predict` like
  `x` and `y`. On the server, `y` is Babylon's `z`, and Babylon's `y` goes in
  `height`.

- **Ground check with a ray**

  To know whether the player is on the ground, a short ray is cast down from
  the feet (`scene.pickWithRay`), counting only meshes with collisions. On the
  ground, the player sticks to the point the ray hit. The first version pushed
  the player down every frame and checked whether something stopped it, which
  made the height flicker by a few millimetres and other players saw everyone
  shaking.

- **Removed code that did nothing**

  `scene.gravity` only affects cameras with `applyGravity`, and ours has it
  off, so it is gone (`scene.collisionsEnabled` stays: collisions need it). A
  check that kept the player above y = 0 never ran, since the floor has
  collisions. The large block of commented-out old game loop is gone too.

## Voice chat between players, Fred's walking animations

**Date:** 2026-10-13 to 2026-10-15 · **Author:** Julio, with two commits from
Fred

**Commits:** `fix idle animation for all clients` ·
`walking animation four directions and idle animation controller` ·
`wip: voice again` · `wip: prior to prettier execution` ·
`feat: voice works pretty well`

- **Players can talk to each other**

  Voice is peer-to-peer WebRTC: every player has a direct connection to every
  other player, and the server only relays the setup messages through the
  `"signal"` channel. There is no proximity yet, so everyone hears everyone at
  the same volume. How a connection is set up, all in `voice.ts`:

  - When a player shows up, only the side with the smaller `sessionId` calls
    (`callPeer`). If both called at once, the two offers would cross and the
    negotiation would get stuck.
  - The caller sends an offer, the other side replies with an answer. Both are
    SDP text describing the audio each side sends.
  - Each side then sends its ICE candidates (the network addresses where it can
    be reached) as the browser finds them.
  - When the other player's audio arrives, it plays in an `<audio>` element
    created in memory.
  - When a player leaves, `removePeer` closes the connection and stops the
    audio.

- **Signaling moved into `voice.ts`**

  `initVoice(room)` keeps the room and registers the `"signal"` handler.
  `index.ts` only calls `initVoice` after joining, `callPeer` when a player
  shows up and `removePeer` when one leaves. The temporary test message from
  the previous batch is gone.

- **The microphone is resolved before joining the room**

  `startMic` is awaited before `joinOrCreate`, so the mic is ready before any
  connection is made. If permission is denied, the status line says so, and
  the player can still hear others (the connection is set up as receive-only).

- **Idle animation fixed for every client (Fred)**

  Babylon renames cloned animation groups to `Clone of ...`, so the idle clip
  is now found by the end of its name. If it is missing, a warning lists the
  names that were found.

- **Walking in four directions (Fred)**

  Four Mixamo clips (`walk1`, `walk-back1`, `left-strafe1`, `right-strafe1`)
  are loaded once and cloned for each player, retargeted to that player's
  skeleton by node name. The clip is chosen from how the player moved compared
  to where they face, and clips blend into each other. `PLAYER_SPEED` went from
  10 to 2.

- **More Prettier**

  Fred's new code was formatted (tabs to spaces), and so were `README.md`,
  `flow.md` and the old `project/` prototype. Those are formatting changes
  only.

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
