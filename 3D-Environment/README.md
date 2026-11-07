# Welcome to Colyseus!

## Clean install

Install the tools (here, the steps for an Arch distribution):

```sh
sudo pacman -S nodejs npm
```

Then go to the babylon folder and run:

```sh
cd babylonjs-multiplayer-server
npm install
npm run dev
```

`npm install` reads this folder's `package.json` and `package-lock.json` and
downloads the dependencies into `node_modules/`.

`npm run dev` runs the `dev` script from `package.json`, which here is Vite. With
the `colyseus/vite` plugin, it starts both the client (the game page) and the
Colyseus server (`src/app.config.ts`) in a single process. The address shows up
in the terminal. In another folder, `npm run dev` runs whatever that folder's
`package.json` defines.

This project was created with [⚔️ `create-colyseus-app`](https://github.com/colyseus/create-colyseus-app/).

[Documentation](https://docs.colyseus.io/)

## :crossed_swords: Usage

```
npm start
```

Then open http://localhost:2567 for the playground, or /monitor for the monitor.

## Structure

- `src/app.config.ts`: server configuration — rooms, HTTP routes, express middleware
- `src/rooms/MyRoom.ts`: your room handler
- `src/rooms/schema/MyRoomState.ts`: the state synchronized to every client in the room
- `test/MyRoom.test.ts`: boots the real server and connects a real client
- `loadtest/example.ts`: scriptable client for `npm run loadtest`
- `ecosystem.config.cjs`: pm2 configuration, used when deploying to Colyseus Cloud

## Scripts

- `npm start`: run Vite — client, server and playground on one port, with HMR
- `npm test`: run the mocha test suite
- `npm run build`: build client (`dist/client/`) and server (`dist/server/`)
- `npm run loadtest`: connect N simulated clients with [`@colyseus/loadtest`](https://github.com/colyseus/colyseus-loadtest/)

## What's included

### Single Vite project

Client, server and shared code live in one project on one port. `npm start`
runs Vite with the `colyseus/vite` plugin: it boots the server in-process and
hot-reloads your rooms when you edit them, so there is no second terminal and no
build step in development.

```
index.html
src/app.config.ts    server config (the plugin's `serverEntry`)
src/rooms/           your rooms
src/client/          browser code
```

`npm run build` produces both halves — `dist/client/` and `dist/server/server.mjs`.
`npm run build:client` skips the server, for deploying the client to a static
host while the server runs elsewhere.

Express runs _in front of_ Vite in development, so `/` belongs to the client and
the playground moved to `/playground`. The direct `@colyseus/playground`
dependency floors the version at 0.18.3, which redirects the slash-less
`/playground` itself — older versions render it blank.

- https://docs.colyseus.io/server/vite

### Fixed tick + client prediction

The room advances on `setFixedTimestep()`: a framework-owned accumulator runs
`step()` a whole number of times per frame, each advancing exactly `1/TICK_RATE`
seconds. A constant `dt` is what makes the client able to replay the same steps
— with `setTimestep()`'s measured delta it could not.

`defineInput(MoveInput, …)` gives each client a server-side input buffer.
`sanitize` clamps every field as it arrives, because nothing off the wire is
trustworthy. The input schema is deliberately flat and carries no `seq`, no `dt`
and no timestamp: the engine's own counter is the sequence, one input advances
exactly one step, and the SDK stamps lag-comp timing on the wire envelope.

`src/shared/movement.ts` holds the one function both sides run. It is typed
structurally so the same code steps a server Schema instance and the client
reconciler's plain predicted copy, and it is pure — no clocks, no randomness, no
reads outside its arguments. Keep it that way, or prediction and server will
disagree.

To add client-side prediction, see the client wiring in `src/client/` (generated
when the Vite layout is chosen) or the netcode guide:

- https://docs.colyseus.io/netcode/server-input
- https://docs.colyseus.io/netcode/client-prediction

### Client-side prediction

`src/client/index.ts` runs the same `stepEntity` the server runs. Every input is
applied locally the instant it is sent, so your own square responds with zero
latency; when the server's next patch acknowledges input _N_, the reconciler
rewinds to the authoritative state and replays inputs _N+1…_ through that same
function.

One `predict.tick(now)` per frame drives everything, and it returns how many
fixed steps are due — that is the loop that decides how many inputs to send, so
input rate follows the simulation rate rather than your monitor's refresh rate.

Other players are not yours to predict, so they are interpolated (`mode: "lerp"`)
toward the latest snapshot instead — with `smoothMs: 65` keeping their rendered
velocity continuous at the cost of ~65 ms of extra display lag (lower it, or set
0, when currency matters more than smoothness). Read every position through
`predict.value(player, "x")`: it returns the predicted value for your own
entity and the interpolated one for everyone else.

- https://docs.colyseus.io/netcode/client-prediction

### Lobby room

A `LobbyRoom` is registered as `lobby`, and the sample room is chained with
`.enableRealtimeListing()` so the lobby receives create/update/dispose events for
it. Clients join the lobby to render a live room browser:

```ts
const lobby = await client.joinOrCreate("lobby");
lobby.onMessage("rooms", (rooms) => {
  /* full list on join */
});
lobby.onMessage("+", ([roomId, room]) => {
  /* added or updated */
});
lobby.onMessage("-", (roomId) => {
  /* removed */
});
```

- https://docs.colyseus.io/matchmaker/lobby

### Reconnection

`MyRoom.onDrop()` holds a dropped client's seat for 30 seconds via
`allowReconnection()`. The SDK retries automatically with exponential backoff;
`onReconnect()` fires if it gets back in time, `onLeave()` if it does not.

- https://docs.colyseus.io/room/reconnection
