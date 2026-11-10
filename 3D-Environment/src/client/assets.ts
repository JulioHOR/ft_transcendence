import * as BABYLON from "@babylonjs/core";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";

const MOVE_CLIPS = {
	forward: "models/walk1.glb",
	back: "models/walk-back1.glb",
	left: "models/left-strafe1.glb",
	right: "models/right-strafe1.glb",
} as const;

export type MoveDir = keyof typeof MOVE_CLIPS;
export type Clip = MoveDir | "idle";

export type Assets = {
	character: BABYLON.AssetContainer;
	gun: BABYLON.AssetContainer;
	/** One source animation per direction; every player clones these onto their own skeleton. */
	moveClips: Map<MoveDir, BABYLON.AnimationGroup>;
};

async function loadMoveClips(scene: BABYLON.Scene): Promise<Map<MoveDir, BABYLON.AnimationGroup>> {
	const entries = await Promise.all( // loads all in parallel. 
		(Object.entries(MOVE_CLIPS) as [MoveDir, string][]).map(async ([dir, url]) => {
			const container = await LoadAssetContainerAsync(url, scene);
			return [dir, container.animationGroups[0]] as const;
		}),
	);
	return new Map(entries);
}

export async function loadAssets(scene: BABYLON.Scene): Promise<Assets> {
	const [character, gun, moveClips] = await Promise.all([
		LoadAssetContainerAsync("models/character.glb", scene),
		LoadAssetContainerAsync("models/ak-47.glb", scene),
		loadMoveClips(scene),
	]);
	return { character, gun, moveClips };
}
