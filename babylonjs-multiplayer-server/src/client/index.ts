import * as BABYLON from "@babylonjs/core";
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
import type { MoveInput } from "../rooms/schema/MyRoomState.js";
import { stepEntity } from "../shared/movement.js";
import {
	PLAYER_SPEED,
	RUN_SPEED,
	GRAVITY,
	JUMP_SPEED,
	CLOSE_LOGGED_IN_ELSEWHERE,
} from "../shared/constants.js";

import {
	MODEL_YAW_OFFSET,
	CHARACTER_HEIGHT,
	CHARACTER_RADIUS,
	EYE_HEIGHT,
	GUN_SCALE,
	VIEWMODEL_OFFSET,
} from "./config.js";

import {createGun} from "./gun.js";
import {createScene} from "./sceneSetup.js";
import {loadAssets} from "./assets.js";
import {loadLevel} from "./level.js";
import {RemotePlayer} from "./remotePlayer.js";

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

const held = new Set<string>();
addEventListener("keydown", (e) => held.add(e.key.toLowerCase()));
addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

// Opposite keys cancel out, so the axis is always exactly -1, 0 or 1.
function axis(negative: string[], positive: string[]): -1 | 0 | 1 {
	const back = negative.some((k) => held.has(k));
	const forward = positive.some((k) => held.has(k));
	if (back === forward) {
		return 0;
	}
		return back ? -1 : 1;
}

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

	const input = room.input<MoveInput>({ mode: "reliable" });

	// Wait for the first state patch to create our own Player data reference
	await new Promise<void>((resolve) =>
		room.onStateChange.once(() => resolve()),
	);
	const self = room.state.players.get(room.sessionId);

	if (!self) {
		throw new Error("Failed to get our own player data.");
	}

	predict.reconciler(self, {
		input,
		fields: ["x", "y", "vx", "vy"],
		step: (ctx, predicted, command) => stepEntity(predicted, command, ctx.dt),
	});

	if (micTurnedOffWarning === true) {
		statusEl.textContent += `Connected as ${room.sessionId}`;
	} else {
		statusEl.textContent = `Connected as ${room.sessionId}`;
	}

	// 1. Declare your tracking map and callbacks first
	let selfGun: BABYLON.TransformNode | undefined;
	let selfEquipped = false;
	const remotePlayers = new Map<string, RemotePlayer>();
	let localMesh: BABYLON.AbstractMesh | undefined;
	let localEntries: BABYLON.InstantiatedEntries | undefined;

	addEventListener("keydown", (e) => {
		if (e.repeat) return;
		if (document.pointerLockElement !== canvas) return;
		if (e.key !== "1" || !selfGun) return;

		selfEquipped = !selfEquipped;
		selfGun.setEnabled(selfEquipped);
		room.send("setEquipped", {equipped: selfEquipped});
	});


	const callbacks = Callbacks.get(room);

	const assets = await loadAssets(scene);

	callbacks.onAdd("players", (player, sessionId) => {
		if (sessionId !== room.sessionId) {
			const remote = new RemotePlayer(scene, assets, sessionId, player);
			callbacks.listen(player, "equipped", (value) => remote.setEquipped(value));
			remotePlayers.set(sessionId, remote);

			callPeer(sessionId).catch((err) => console.error(err));
			return;
		}

		// local player: first person, so the body is invisible and only collides
		const entries = assets.character.instantiateModelsToScene();
		const mesh = entries.rootNodes[0] as BABYLON.AbstractMesh;
		mesh.name = `player_${sessionId}`;
		mesh.rotationQuaternion = null; // see RemotePlayer: the loader's 180° turn
		mesh.rotation.y = MODEL_YAW_OFFSET;
		mesh.position.y = 0; // model origin is at its feet
		mesh.getChildMeshes().forEach((m) => (m.isVisible = false));

		// collision capsule
		mesh.ellipsoid = new BABYLON.Vector3(CHARACTER_RADIUS, CHARACTER_HEIGHT / 2, CHARACTER_RADIUS);
		mesh.ellipsoidOffset = new BABYLON.Vector3(0, CHARACTER_HEIGHT / 2, 0);
		camera.position.y = mesh.position.y + EYE_HEIGHT;

		// local gun rides on the camera
		const viewGun = createGun(scene, assets.gun, "gun_self", GUN_SCALE);
		viewGun.parent = camera;
		viewGun.position.copyFrom(VIEWMODEL_OFFSET);
		selfGun = viewGun;

		localEntries = entries;
		localMesh = mesh;
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
		localEntries?.dispose();
		localEntries = undefined;
		localMesh = undefined;

		removeAllVoiceConnections();
	});

	await loadLevel(scene);

	let velocityY = 0;
	// --- Main Game Loop (Integrated with Babylon Render Loop) ---
	engine.runRenderLoop(() => {
		const now = performance.now();

		// Drives prediction, interpolation, and the reconciler
		const steps = predict.tick(now);

		for (const [sessionId, player] of room.state.players) {
		if (sessionId === room.sessionId) {
			const mesh = localMesh;
			if (!mesh) {
				continue;
			}
			// 1. Calculate input movement delta based on keys & camera yaw
			const rawForward = axis(["s", "arrowdown"], ["w", "arrowup"]);
			const rawRight = axis(["a", "arrowleft"], ["d", "arrowright"]);
			const yaw = camera.rotation.y;
			
			const deltaTime = engine.getDeltaTime() / 1000;

			const speed = held.has("shift") ? RUN_SPEED : PLAYER_SPEED;

			const moveX =
			(rawForward * Math.sin(yaw) + rawRight * Math.cos(yaw)) *
			speed *
			deltaTime;
			const moveZ =
			(rawForward * Math.cos(yaw) - rawRight * Math.sin(yaw)) *
			speed *
			deltaTime;

			const groundRay = new BABYLON.Ray(
			mesh.position.add(new BABYLON.Vector3(0, 0.1, 0)),
			new BABYLON.Vector3(0, -1, 0),
			0.2,
			);
			const groundHit: BABYLON.Nullable<BABYLON.PickingInfo> =
			scene.pickWithRay(groundRay, (m) => m.checkCollisions);

			const bodyCenter = mesh.position.add(
			new BABYLON.Vector3(0, CHARACTER_HEIGHT / 2, 0),
			);
			const facing = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
			const frontHit = scene.pickWithRay(
			new BABYLON.Ray(bodyCenter, facing, CHARACTER_RADIUS + 0.2),
			(m) => m.checkCollisions,
			);
			const backHit = scene.pickWithRay(
			new BABYLON.Ray(bodyCenter, facing.negate(), CHARACTER_RADIUS + 0.2),
			(m) => m.checkCollisions,
			);

			const againstWall: boolean = frontHit?.hit === true || backHit?.hit === true;

			const groundY = groundHit?.pickedPoint?.y;
			const grounded = groundY !== undefined && velocityY <= 0;

			if (grounded) {
				velocityY = 0;
				mesh.position.y = groundY;
			} else {
				velocityY -= GRAVITY * deltaTime;
			}

			if (held.has(" ") && (grounded || againstWall)) {
				velocityY = JUMP_SPEED;
			}

			// 2. Apply Babylon's native mesh collision sliding
			const displacement = new BABYLON.Vector3(
				moveX,
				velocityY * deltaTime,
				moveZ,
			);
			mesh.moveWithCollisions(displacement);

			// 3. Lock camera to the collision-safe mesh position
			camera.position.x = mesh.position.x;
			camera.position.z = mesh.position.z;
			camera.position.y = mesh.position.y + EYE_HEIGHT;

			// 4. Send your *actual* collision-checked position to the server
			// On the server, y is Babylon's z, and Babylon's y is our 'height'
			room.send("updatePosition", {
				x: mesh.position.x,
				y: mesh.position.z,
				height: mesh.position.y,
				yaw: camera.rotation.y,
				pitch: camera.rotation.x,
			});
			} else {
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
		}
    scene.render();
  });
}

main().catch((e) => {
  console.error(e);
  statusEl.textContent = e.message;
});
