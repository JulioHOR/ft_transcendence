import * as BABYLON from "@babylonjs/core";
import type { Assets } from "./assets.js";
import {
	CHARACTER_HEIGHT,
	CHARACTER_RADIUS,
	EYE_HEIGHT,
	GUN_SCALE,
	MODEL_YAW_OFFSET,
	VIEWMODEL_OFFSET,
	GRAVITY,
	JUMP_SPEED,
	PLAYER_SPEED,
	RUN_SPEED
} from "./config.js";
import { createGun } from "./gun.js";
import { axis, isHeld } from "./input.js";

/** What the server needs each frame. On the server, y is Babylon's z and height is Babylon's y. */
export type PositionUpdate = {
	x: number;
	y: number;
	height: number;
	yaw: number;
	pitch: number;
};

/** Your own player: first person, so the body is invisible and only collides. */
export class LocalPlayer {
	private readonly scene: BABYLON.Scene;
	private readonly camera: BABYLON.UniversalCamera;
	private readonly entries: BABYLON.InstantiatedEntries;
	private readonly mesh: BABYLON.AbstractMesh;
	private readonly gun: BABYLON.TransformNode;
	private equipped = false;
	private velocityY = 0;

	constructor(
		scene: BABYLON.Scene,
		camera: BABYLON.UniversalCamera,
		assets: Assets,
		sessionId: string,
	) {
		this.scene = scene;
		this.camera = camera;

		this.entries = assets.character.instantiateModelsToScene();
		this.mesh = this.entries.rootNodes[0] as BABYLON.AbstractMesh;
		this.mesh.name = `player_${sessionId}`;
		this.mesh.rotationQuaternion = null; // see RemotePlayer: the loader's 180° turn
		this.mesh.rotation.y = MODEL_YAW_OFFSET;
		this.mesh.position.y = 0; // model origin is at its feet
		this.mesh.getChildMeshes().forEach((m) => (m.isVisible = false));

		// collision capsule
		this.mesh.ellipsoid = new BABYLON.Vector3(CHARACTER_RADIUS, CHARACTER_HEIGHT / 2, CHARACTER_RADIUS);
		this.mesh.ellipsoidOffset = new BABYLON.Vector3(0, CHARACTER_HEIGHT / 2, 0);
		camera.position.y = this.mesh.position.y + EYE_HEIGHT;

		// the gun rides on the camera, so it follows where you look for free
		this.gun = createGun(scene, assets.gun, "gun_self", GUN_SCALE);
		this.gun.parent = camera;
		this.gun.position.copyFrom(VIEWMODEL_OFFSET);
	}

	/** Shows or hides your gun at once and returns the new state, to send to the server. */
	toggleGun(): boolean {
		this.equipped = !this.equipped;
		this.gun.setEnabled(this.equipped);
		return this.equipped;
	}

	/** One frame of input, gravity and collision. Returns the collision-checked position. */
	update(deltaTime: number): PositionUpdate {
		const yaw = this.camera.rotation.y;
		const move = this.horizontalMove(yaw, deltaTime);
		const groundY = this.groundHeight();
		const againstWall = this.isAgainstWall(yaw);

		const grounded = groundY !== undefined && this.velocityY <= 0;
		if (grounded) {
			this.velocityY = 0;
			this.mesh.position.y = groundY;
		} else {
			this.velocityY -= GRAVITY * deltaTime;
		}

		if (isHeld(" ") && (grounded || againstWall)) {
			this.velocityY = JUMP_SPEED;
		}

		// Babylon's native mesh collision sliding
		this.mesh.moveWithCollisions(
			new BABYLON.Vector3(move.x, this.velocityY * deltaTime, move.z),
		);

		// lock the camera to the collision-safe mesh position
		this.camera.position.set(
			this.mesh.position.x,
			this.mesh.position.y + EYE_HEIGHT,
			this.mesh.position.z,
		);

		return {
			x: this.mesh.position.x,
			y: this.mesh.position.z,
			height: this.mesh.position.y,
			yaw: this.camera.rotation.y,
			pitch: this.camera.rotation.x,
		};
	}

	dispose(): void {
		this.entries.dispose();
		this.gun.dispose();
	}

	/** Keys and camera yaw to a displacement on the ground plane for this frame. */
	private horizontalMove(yaw: number, deltaTime: number): { x: number; z: number } {
		const forward = axis(["s", "arrowdown"], ["w", "arrowup"]);
		const right = axis(["a", "arrowleft"], ["d", "arrowright"]);
		const speed = isHeld("shift") ? RUN_SPEED : PLAYER_SPEED;
		return {
			x: (forward * Math.sin(yaw) + right * Math.cos(yaw)) * speed * deltaTime,
			z: (forward * Math.cos(yaw) - right * Math.sin(yaw)) * speed * deltaTime,
		};
	}

	/** Height of the floor just under the feet, or undefined while in the air. */
	private groundHeight(): number | undefined {
		const ray = new BABYLON.Ray(
			this.mesh.position.add(new BABYLON.Vector3(0, 0.1, 0)),
			new BABYLON.Vector3(0, -1, 0),
			0.2,
		);
		return this.scene.pickWithRay(ray, (m) => m.checkCollisions)?.pickedPoint?.y;
	}

	/** A wall right in front of or behind you lets you jump again (wall jump). */
	private isAgainstWall(yaw: number): boolean {
		const bodyCenter = this.mesh.position.add(new BABYLON.Vector3(0, CHARACTER_HEIGHT / 2, 0));
		const facing = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
		const reach = CHARACTER_RADIUS + 0.2;
		const frontHit = this.scene.pickWithRay(new BABYLON.Ray(bodyCenter, facing, reach), (m) => m.checkCollisions);
		const backHit = this.scene.pickWithRay(new BABYLON.Ray(bodyCenter, facing.negate(), reach), (m) => m.checkCollisions);
		return frontHit?.hit === true || backHit?.hit === true;
	}
}
