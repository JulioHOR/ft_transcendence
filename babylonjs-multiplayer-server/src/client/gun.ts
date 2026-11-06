import * as BABYLON from "@babylonjs/core";
import {
	GUN_GRIP,
	GUN_YAW_OFFSET,
} from "./config.js"

// gun asset load
export function createGun(
	scene: BABYLON.Scene,
	container: BABYLON.AssetContainer,
	name: string,
	scale: number,
): BABYLON.TransformNode {
	const pivot = new BABYLON.TransformNode(`${name}_pivot`, scene);
	const model = new BABYLON.TransformNode(`${name}_model`, scene);
	model.parent = pivot;
	model.scaling.setAll(scale);
	model.rotation.y = GUN_YAW_OFFSET;
	const root = container.instantiateModelsToScene()
		.rootNodes[0] as BABYLON.TransformNode;
	root.parent = model;
	root.position = GUN_GRIP.negate();
	pivot.setEnabled(false);
	return pivot;
}
