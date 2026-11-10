import * as BABYLON from "@babylonjs/core";
import type { Player } from "../rooms/schema/MyRoomState.js";
import type { Assets, Clip } from "./assets.js";
import { createGun } from "./gun.js";
import { createNameTag } from "./nameTag.js";
import {
	EYE_HEIGHT,
	HELD_GUN_OFFSET,
	HELD_GUN_SCALE,
	IDLE_ANIMATION_NAME,
	MODEL_YAW_OFFSET,
	WALK_MOVING_EPSILON,
} from "./config.js";

/** Everything the scene holds for one other player: character, animations, gun and name tag. */
export class RemotePlayer {
	private readonly entries: BABYLON.InstantiatedEntries;
	private readonly mesh: BABYLON.AbstractMesh;
	private readonly clips = new Map<Clip, BABYLON.AnimationGroup>();
	private readonly moveClipClones: BABYLON.AnimationGroup[] = [];
	private current: Clip = "idle";
	private lastX: number;
	private lastZ: number;

	// other players' guns hang from an invisible head that turns with their aim
	private readonly head: BABYLON.TransformNode;
	private readonly gun: BABYLON.TransformNode;
	private readonly tagAnchor: BABYLON.TransformNode;

	constructor(scene: BABYLON.Scene, assets: Assets, sessionId: string, player: Player) {
		this.entries = assets.character.instantiateModelsToScene();
		this.mesh = this.entries.rootNodes[0] as BABYLON.AbstractMesh;
		this.mesh.name = `player_${sessionId}`;

		// The loader stores a 180° turn in rotationQuaternion, and while it is set
		// Babylon ignores .rotation. Swap it for the same turn as Euler so .rotation.y works.
		this.mesh.rotationQuaternion = null;
		this.mesh.rotation.y = MODEL_YAW_OFFSET;
		this.mesh.position.y = 0; // model origin is at its feet

		this.lastX = player.x;
		this.lastZ = player.y;
		this.setupAnimations(assets, sessionId);

		this.head = new BABYLON.TransformNode(`head_${sessionId}`, scene);
		this.gun = createGun(scene, assets.gun, `gun_${sessionId}`, HELD_GUN_SCALE);
		this.gun.parent = this.head;
		this.gun.position.copyFrom(HELD_GUN_OFFSET);
		this.setEquipped(player.equipped);

		this.tagAnchor = new BABYLON.TransformNode(`tag_${sessionId}`, scene);
		createNameTag(scene, player.name, this.tagAnchor);
	}

	setEquipped(equipped: boolean): void {
		this.gun.setEnabled(equipped);
	}

	/** Called every frame with the interpolated position. y is Babylon's z; height is Babylon's y. */
	update(x: number, z: number, height: number, yaw: number, pitch: number): void {
		this.mesh.position.set(x, height, z);
		this.mesh.rotation.y = yaw + MODEL_YAW_OFFSET;
		this.playClip(this.pickClip(x, z, yaw));

		// the head follows the character at eye level and turns like their camera
		this.head.position.set(x, height + EYE_HEIGHT, z);
		this.head.rotation.set(pitch, yaw, 0);
		this.tagAnchor.position.set(x, height, z);
	}

	dispose(): void {
		this.entries.dispose(); // mesh, skeleton and the character's own animation groups
		this.moveClipClones.forEach((g) => g.dispose());
		this.head.dispose(); // takes the gun with it
		this.tagAnchor.dispose(false, true); // also the name tag's material and texture
	}

	private setupAnimations(assets: Assets, sessionId: string): void {
		// instantiateModelsToScene prefixes clones with "Clone of ", so match on the suffix
		const idle = this.entries.animationGroups.find((a) =>
			a.name.endsWith(IDLE_ANIMATION_NAME),
		);
		if (idle) {
			this.clips.set("idle", idle);
		}

		// animation retargeting: each clone of a move clip must drive this player's own skeleton
		const nodesByName = new Map<string, BABYLON.Node>();
		for (const n of this.mesh.getDescendants()) {
			nodesByName.set(n.name.replace(/^Clone of /, ""), n);
		}
		for (const [dir, source] of assets.moveClips) {
			const clone = source.clone(
				`${dir}_${sessionId}`,
				(old) => nodesByName.get(old.name) ?? old,
			);
			this.clips.set(dir, clone);
			this.moveClipClones.push(clone);
		}

		for (const g of this.clips.values()) {
			g.enableBlending = true;
			g.blendingSpeed = 0.08;
		}
		idle?.play(true);
	}

	/** Walking direction relative to where they face decides the clip. */
	private pickClip(x: number, z: number, yaw: number): Clip {
		const dx = x - this.lastX;
		const dz = z - this.lastZ;
		this.lastX = x;
		this.lastZ = z;

		if (Math.hypot(dx, dz) <= WALK_MOVING_EPSILON) {
			return "idle";
		}
		const forward = dx * Math.sin(yaw) + dz * Math.cos(yaw);
		const right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
		if (Math.abs(forward) >= Math.abs(right)) {
			return forward >= 0 ? "forward" : "back";
		}
		return right >= 0 ? "right" : "left";
	}

	private playClip(next: Clip): void {
		if (next === this.current) {
			return;
		}
		this.clips.get(this.current)?.stop();
		(this.clips.get(next) ?? this.clips.get("idle"))?.play(true);
		this.current = next;
	}
}
