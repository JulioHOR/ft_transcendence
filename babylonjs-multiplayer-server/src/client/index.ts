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
	IDLE_ANIMATION_NAME,
	WALK_MOVING_EPSILON,
	GUN_SCALE,
	HELD_GUN_SCALE,
	VIEWMODEL_OFFSET,
	HELD_GUN_OFFSET
} from "./config.js";

import {createGun} from "./gun.js";
import {createNameTag} from "./nameTag.js";
import {createScene} from "./sceneSetup.js";
import {loadAssets, type Clip} from "./assets.js";
import {loadLevel} from "./level.js";

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
	const playerMeshes = new Map<string, BABYLON.AbstractMesh>();
	const playerHeads = new Map<string, BABYLON.TransformNode>();
	let selfGun: BABYLON.TransformNode | undefined;
	let selfEquipped = false;

	addEventListener("keydown", (e) => {
		if (e.repeat) return;
		if (document.pointerLockElement !== canvas) return;
		if (e.key !== "1" || !selfGun) return;

		selfEquipped = !selfEquipped;
		selfGun.setEnabled(selfEquipped);
		room.send("setEquipped", {equipped: selfEquipped});
	});

	const playerTagAnchors = new Map<string, BABYLON.TransformNode>();
	type PlayerAnim = {
		groups: BABYLON.AnimationGroup[];
		skeletons: BABYLON.Skeleton[];
		clips: Map<Clip, BABYLON.AnimationGroup>;
		current: Clip;
		lastX: number;
		lastZ: number;
	};
  	const playerAnimations = new Map<string, PlayerAnim>();

  	const callbacks = Callbacks.get(room);

	const {character, gun: gunContainer, moveClips} = await loadAssets(scene);

	// 3. Now callbacks and playerMeshes are fully in scope
	callbacks.onAdd("players", (player, sessionId) => {
		const isSelf = sessionId === room.sessionId;

		const entries = character.instantiateModelsToScene();
		const playerMesh = entries.rootNodes[0] as BABYLON.AbstractMesh;
		playerMesh.name = `player_${sessionId}`;

		const idleAnim = entries.animationGroups.find((a) =>
			a.name.endsWith(IDLE_ANIMATION_NAME),
		);

		// animation retargeting
		const nodesByName = new Map<string, BABYLON.Node>();
		for (const n of playerMesh.getDescendants())
			nodesByName.set(n.name.replace(/^Clone of /, ""), n);

		const clips = new Map<Clip, BABYLON.AnimationGroup>();
		if (idleAnim) {
			clips.set("idle", idleAnim);
		}
		const extra: BABYLON.AnimationGroup[] = [];
		for (const [dir, src] of moveClips) {
			const g = src.clone(
				`${dir}_${sessionId}`,
				(old) => nodesByName.get(old.name) ?? old,
		);
			clips.set(dir, g);
			extra.push(g);
		}
		for (const g of clips.values()) {
			g.enableBlending = true;
			g.blendingSpeed = 0.08;
		}

		idleAnim?.play(true);
		playerAnimations.set(sessionId, {
			groups: [...entries.animationGroups, ...extra],
			skeletons: entries.skeletons,
			clips,
			current: "idle",
			lastX: player.x,
			lastZ: player.y,
		});

		playerMesh.rotationQuaternion = null;
		playerMesh.rotation.y = MODEL_YAW_OFFSET;

		// Set initial position immediately
		playerMesh.position.y = 0; // model origin is at its feet

		if (isSelf) { // local player
			// get all child meshes under this root node and hide them for first-person view
			const childMeshes = playerMesh.getChildMeshes();
			childMeshes.forEach((m) => (m.isVisible = false));

			// collision capsule
			playerMesh.ellipsoid = new BABYLON.Vector3(
				CHARACTER_RADIUS,
				CHARACTER_HEIGHT / 2,
				CHARACTER_RADIUS,
			);
			playerMesh.ellipsoidOffset = new BABYLON.Vector3(
				0,
				CHARACTER_HEIGHT / 2,
				0,
			);
			camera.position.y = playerMesh.position.y + EYE_HEIGHT;

			// local gun rides on the camera
			const viewGun = createGun(scene, gunContainer, "gun_self", GUN_SCALE);
			viewGun.parent = camera;
			viewGun.position.copyFrom(VIEWMODEL_OFFSET);
			selfGun = viewGun;
		} else { // remote players
		// other players' guns hang from an invisible head that turns with their aim.
			const head = new BABYLON.TransformNode(`head_${sessionId}`, scene);
			const gun = createGun(scene, gunContainer, `gun_${sessionId}`, HELD_GUN_SCALE);
			gun.parent = head;
			gun.position.copyFrom(HELD_GUN_OFFSET);
			gun.setEnabled(player.equipped);
			callbacks.listen(player, "equipped", (value) => gun.setEnabled(value));

			playerHeads.set(sessionId, head);
			const tagAnchor = new BABYLON.TransformNode(`tag_${sessionId}`, scene);
			tagAnchor.parent = null;
			createNameTag(scene, player.name, tagAnchor);
			playerTagAnchors.set(sessionId, tagAnchor);

			callPeer(sessionId).catch((err) => console.error(err));
		}

		playerMeshes.set(sessionId, playerMesh);
	});


	callbacks.onRemove("players", (_player, sessionId) => {
		const mesh = playerMeshes.get(sessionId);
		if (mesh) {
			mesh.dispose();
			playerMeshes.delete(sessionId);
		}
		// disposing the head takes its gun with it
		playerHeads.get(sessionId)?.dispose();
		playerHeads.delete(sessionId);
		
		playerTagAnchors.get(sessionId)?.dispose(false, true);
		playerTagAnchors.delete(sessionId);
		
		const anim = playerAnimations.get(sessionId);
		anim?.groups.forEach((g) => g.dispose());
		anim?.skeletons.forEach((s) => s.dispose());
		playerAnimations.delete(sessionId);

		removePeer(sessionId);
	});

	room.onLeave((code) => {
		statusEl.textContent = code === CLOSE_LOGGED_IN_ELSEWHERE ? "You joined from another tab or device." : "Disconnected";
		playerMeshes.forEach((mesh) => mesh.dispose());
		playerMeshes.clear();
		playerHeads.forEach((head) => head.dispose());
		playerHeads.clear();
		playerAnimations.forEach((anim) => {
			anim.groups.forEach((g) => g.dispose());
			anim.skeletons.forEach((s) => s.dispose());
		});
		playerAnimations.clear();
		playerTagAnchors.forEach((a) => a.dispose(false, true));
		playerTagAnchors.clear();

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
		const mesh = playerMeshes.get(sessionId);
		if (!mesh) {
			continue;
		}

		if (sessionId === room.sessionId) {
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
				// Remote players update normally from server state interpolation
				const posX = predict.value(player, "x");
				const posZ = predict.value(player, "y");
				const posHeight = predict.value(player, "height");
				mesh.position.x = posX;
				mesh.position.z = posZ;
				mesh.position.y = posHeight;
				mesh.rotation.y = player.yaw + MODEL_YAW_OFFSET;

				const anim = playerAnimations.get(sessionId);
				if (anim) {
					const dx = posX - anim.lastX,
						dz = posZ - anim.lastZ;
					anim.lastX = posX;
					anim.lastZ = posZ;

					let next: Clip = "idle";
					if (Math.hypot(dx, dz) > WALK_MOVING_EPSILON) {
						const fwd = dx * Math.sin(player.yaw) + dz * Math.cos(player.yaw);
						const right = dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw);
						if (Math.abs(fwd) >= Math.abs(right))
						next = fwd >= 0 ? "forward" : "back";
						else next = right >= 0 ? "right" : "left";
					}

					if (next !== anim.current) {
						anim.clips.get(anim.current)?.stop();
						(anim.clips.get(next) ?? anim.clips.get("idle"))?.play(true);
						anim.current = next;
					}
				}

				// The head follows the character at eye level and turns like their camera
				const head = playerHeads.get(sessionId);
				if (head) {
					head.position.set(posX, posHeight + EYE_HEIGHT, posZ);
					head.rotation.set(player.pitch, player.yaw, 0);
				}
				const anchor = playerTagAnchors.get(sessionId);
				if (anchor) anchor.position.set(posX, posHeight, posZ);  
					const distance = Math.hypot(
					posX - camera.position.x,
					posZ - camera.position.z,
				);

				setPeerDistance(sessionId, distance);
			}
		}
    scene.render();
  });
}

main().catch((e) => {
  console.error(e);
  statusEl.textContent = e.message;
});
