import "@babylonjs/loaders";
import {
	startMic,
	initVoice,
	callPeer,
	removePeer,
	setPeerDistance,
	removeAllVoiceConnections,
} from "./voice.js";

import { ColyseusSDK, Callbacks } from "@colyseus/sdk";
import { Predict } from "@colyseus/sdk/predict";
import type { default as server } from "../app.config.js";
import {CLOSE_LOGGED_IN_ELSEWHERE} from "../shared/constants.js";
import {createScene} from "./sceneSetup.js";
import {loadAssets} from "./assets.js";
import {loadLevel} from "./level.js";
import {RemotePlayer} from "./remotePlayer.js";
import {LocalPlayer} from "./localPlayer.js";
import { MSG_SET_EQUIPPED, MSG_UPDATE_POSITION } from "../shared/messages.js";

// --- DOM & Status Elements ---
const statusEl = document.getElementById("status")!;
const canvas = document.getElementById(
  "threejs_canvas",
) as HTMLCanvasElement | null;

if (canvas === null) {
  throw new TypeError("canvas was null. P.S: It shouldn't!");
}

// BASE_URL is /game/ in the build behind nginx and / in dev.
const client = new ColyseusSDK<typeof server>(
	`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${import.meta.env.BASE_URL}`,
);

const { engine, scene, camera } = createScene(canvas);

async function main() {
	let micTurnedOffWarning: boolean = false as boolean;

	await startMic().catch((e) => {
		if (e instanceof DOMException && e.name === "NotAllowedError") {
			statusEl.textContent = "User did not allow microphone use. ";
			micTurnedOffWarning = true;
		} else {
			console.error(e);
		}
	});

	const room = await client.joinOrCreate("my_room", {});

	room.reconnection.maxRetries = 5;

	initVoice(room);

	const predict = Predict.get(room);

	// Interpolate other players smoothly
	predict.attachAll("players", {
		mode: "lerp",
		fields: ["x", "y", "height"],
		smoothMs: 65,
	});

	// the render loop reads room.state, which only exists after the first state patch
	await new Promise<void>((resolve) =>
		room.onStateChange.once(() => resolve()),
	);

	if (micTurnedOffWarning === true) {
		statusEl.textContent += `Connected as ${room.sessionId}`;
	} else {
		statusEl.textContent = `Connected as ${room.sessionId}`;
	}

	const remotePlayers = new Map<string, RemotePlayer>();
	let local: LocalPlayer | undefined;

	addEventListener("keydown", (e) => {
		if (e.repeat || e.key !== "1") return;
		if (document.pointerLockElement !== canvas || !local) return;

		room.send(MSG_SET_EQUIPPED, { equipped: local.toggleGun() });
	});



	const callbacks = Callbacks.get(room);

	const assets = await loadAssets(scene);

	callbacks.onAdd("players", (player, sessionId) => {
		if (sessionId === room.sessionId) {
			local = new LocalPlayer(scene, camera, assets, sessionId);
			return;
		}

		const remote = new RemotePlayer(scene, assets, sessionId, player);
		callbacks.listen(player, "equipped", (value) => remote.setEquipped(value));
		remotePlayers.set(sessionId, remote);

		callPeer(sessionId).catch((err) => console.error(err));
	});

	callbacks.onRemove("players", (_player, sessionId) => {
		remotePlayers.get(sessionId)?.dispose();
		remotePlayers.delete(sessionId);
		removePeer(sessionId);
	});

	room.onLeave((code) => {
		statusEl.textContent = code === CLOSE_LOGGED_IN_ELSEWHERE ? "You joined from another tab or device." : "Disconnected";
		remotePlayers.forEach((p) => p.dispose());
		remotePlayers.clear();
		local?.dispose();
		local = undefined;

		removeAllVoiceConnections();
	});

	await loadLevel(scene);

	// --- Main Game Loop (Integrated with Babylon Render Loop) ---
	engine.runRenderLoop(() => {
		// Drives the interpolation of the other players
		predict.tick(performance.now());

		if (local) {
			room.send(MSG_UPDATE_POSITION, local.update(engine.getDeltaTime() / 1000));
		}

		for (const [sessionId, player] of room.state.players) {
			if (sessionId === room.sessionId) {
				continue;
			}
			const remote = remotePlayers.get(sessionId);
			if (!remote) {
				continue;
			}
			// remote players update from server state interpolation
			const x = predict.value(player, "x");
			const z = predict.value(player, "y");
			const height = predict.value(player, "height");
			remote.update(x, z, height, player.yaw, player.pitch);

			setPeerDistance(sessionId, Math.hypot(x - camera.position.x, z - camera.position.z));
		}
		scene.render();
	});
}

main().catch((e) => {
  console.error(e);
  statusEl.textContent = e.message;
});
