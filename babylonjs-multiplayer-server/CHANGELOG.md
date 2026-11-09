# Changelog

Newest first. Each section is one batch of related work, usually what went up
in one push. It lists the commit titles it covers, so every change can still be
found in `git log`, and describes each change once, however many commits it
took. Older sections, written one per commit, are kept as they were.

## Game client split into modules, server cleanup

**Date:** 2026-11-08 · **Author:** Fred

**Commits:** `clean up: new files for index.ts refactoring, part 1`,
`cleanup: move scene, camera and floor setup into sceneSetup.ts`,
`cleanup: move model loading into assets and level modules`,
`cleanup: add remoteplayer to handle remote players scene objects`,
`cleanup: move local player movement and input out of index`,
`fix: ignore non-numeric position and signal data from clients`,
`cleanup: remove the unused server-side input and prediciton path`,
`clean up: removed the functions and variables for movement prediction on server`,
`refactor: share message names between client and server unified in the message.ts to prevent listener names missmatches`

- **`client/index.ts` went from 676 lines to about 170**

  The file did everything in one 450-line `main()`. It is now split by job:
  `config.ts` (sizes and offsets), `sceneSetup.ts` (engine, camera, light,
  floor, pointer lock), `assets.ts` (loads the character, gun and walking
  clips, now in parallel), `level.ts` (building and its collisions),
  `input.ts` (held keys), `gun.ts`, `nameTag.ts`, `localPlayer.ts` (your own
  movement, gravity, jumping and collisions, one method per step) and
  `remotePlayer.ts` (one class per other player). `index.ts` only connects to
  the room and runs the render loop. Behaviour is the same, except that your
  own invisible character no longer plays an idle animation, and your own
  update now always runs before the others each frame.

- **Players leaving no longer leak memory**

  Every player that left used to leave a name tag material, its texture and
  the character's skeleton behind in the scene (textures grew by one per
  leave). `RemotePlayer.dispose()` now removes the instantiated entries, the
  walking clips, the head with its gun, and the name tag with its material and
  texture. After five joins and leaves the scene counts stayed flat.

- **The server ignores bad position numbers**

  `updatePosition` stored `x` and `y` as they came. A modified client could
  send `NaN`, `Infinity` or a string and that went to every other player, and a
  missing payload threw. Each field now needs `Number.isFinite`, a missing
  payload is ignored, and `signal` ignores messages without a string `to`. The
  client is still trusted for where it is (Babylon resolves collisions in the
  browser); the server only refuses values that are not numbers.

- **The unused input path is gone from the server**

  The Colyseus template's input buffer, fixed-timestep `step()`, `MoveInput`,
  `vx`/`vy` and `shared/movement.ts` were never fed by the client, which sends
  positions instead. They and the client's reconciler are removed, and the
  movement constants moved to `client/config.ts`. Players now start at the
  origin instead of a ring around the middle of the old 500 by 500 arena. The
  tests were rewritten around the real messages (join, position stored, bad
  values ignored, empty payload).

- **Message names live in one file**

  `shared/messages.ts` holds `updatePosition`, `setEquipped` and `signal`. A
  name misspelled on one side was never handled and nothing reported it; now it
  fails to compile. `voice.ts` keeps its own `"signal"` strings.

- **Template leftovers removed**

  The Colyseus `/hi` and `/api/hello` routes were reachable in production
  through `/game/`. They are deleted, with the unused `animations/` folder,
  `linux-char.glb`, the `loadtest` stub and its dependency, and the PM2
  `ecosystem.config.cjs`.

- **The room stays up**

  `my_room` is created when the server starts (`beforeListen`) and is not
  disposed when empty, so there is always a room to join.

- **Next: spawn points and several rooms**

  Players start at the origin for now. The plan is a list of spawn points per
  room, chosen on join by skipping points that have a player on them, with the
  client starting from the position the server chose. Rooms are created from a
  server-side config by name, and clients may only pass the name.

## Gun toggle, dashboard login in the game, game in Docker

**Date:** 2026-11-05 · **Author:** Fred

**Commits:** `feat: gun toggle, dashboard login and docker service for the game`

- **Key 1 shows and hides the AK, for everyone**

  `Player` has a new `equipped` boolean. Pressing 1 (with the mouse locked,
  holding the key counts once) shows or hides your own gun at once and sends
  `setEquipped` with the value you want, not a toggle, so client and server
  can't drift apart. The server checks it's a real boolean and stores it.
  Other players' guns follow `equipped` through `callbacks.listen`, and a
  player who joins late sees the right state. Your own gun ignores the server
  echo, otherwise pressing 1 twice quickly could flash it back on. Guns are
  hidden with `setEnabled` on the gun's pivot, which also takes them out of
  raycasts, and they start disabled in `createGun`. The old `inputMap` and the
  observer that was added every frame are gone.

- **Your name comes from the dashboard login**

  The client no longer sends a name. The new static `onAuth` in `MyRoom`
  (logic in `src/rooms/auth.ts`) takes the browser's dashboard session cookie
  and asks the backend `GET /api/me` who it belongs to. The answer
  (`{ id, nickname }`) becomes `client.auth`, and the name tag uses the
  nickname. No session means the join is refused. Flask stays the only one that
  understands sessions: the game holds no secret and never reads the database.
  The `id` is kept on the server for later features (friends, stats, invites)
  but isn't synced to clients.

- **Without Docker, you play as a guest**

  When `NODE_ENV` isn't `production` and there is no cookie, or the backend
  can't be reached, you join as `dev_1234` with a negative id, so `npm start`
  works on its own. Production stays strict.

- **Same account twice: the newest connection wins**

  When an account joins a room it is already in (another tab, another PC), the
  older connection is closed with code `4100` (`CLOSE_LOGGED_IN_ELSEWHERE` in
  `src/shared/constants.ts`) and its page says why. Colyseus uses 4000–4099
  itself, and 4001 is its "server shutdown". Every close code except 4000 goes
  to `onDrop`, which holds the seat for 30 seconds, so `onDrop` lets 4100
  through to `onLeave` straight away. Otherwise the kicked player would stand
  in the room for half a minute.

- **The game runs in docker compose, behind the dashboard's nginx at `/game/`**

  - New `Dockerfile` (two stages: build with everything, then run with
    production dependencies only, as the `node` user) and `.dockerignore`. The
    build image needs `git`, because `npm ci` fetches `uWebSockets.js` from
    GitHub.
  - New `game` service in `docker-compose.yml`, with no published port. It
    gets the backend's certificate as a secret, and `NODE_EXTRA_CA_CERTS`
    makes Node trust it for the `/api/me` call.
  - nginx sends `/game/` to `game:2567` (the Colyseus Vite plugin fixes the
    port) and redirects `/game` to `/game/`, since the relative model paths
    need the slash. When `proxy_pass` uses a variable, nginx stops stripping
    the prefix, so a `rewrite` does it.
  - The production build uses `base: "/game/"`, the SDK connects through
    `import.meta.env.BASE_URL` (`/` in dev), and in production the game server
    serves the built client itself with `express.static`, since nothing else
    does.

- **Next steps**

  - Run the real flow with `make up`. Log in on the dashboard, open
    `https://localhost/game/` and check your nickname shows. Open a second tab
    with the same login: the first one should be kicked. Log out and reload:
    the join should be refused. If something fails,
    `make logs SERVICE=game` shows a `dashboard auth failed:` line with the
    reason. This is the first time the real `https://backend` call runs; tests
    only covered it with a fake backend.
  - Add a link to the game in the dashboard: a plain `<a href="/game/">`, not
    a router `<Link>`, because the game isn't part of the React app.
  - The backend allows 120 requests a minute per IP, and every `/api/me` check
    comes from the game container's IP. That's fine with 8 players a room. If
    it ever matters, forward the player's IP (`context.ip`) as
    `X-Forwarded-For` on that call. The backend's `ProxyFix` already trusts one
    hop.
  - Traffic between nginx and the game is plain HTTP inside the Docker
    network, while the backend uses TLS. Confirm the team is fine with that.

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
