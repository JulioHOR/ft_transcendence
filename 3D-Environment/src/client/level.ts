import * as BABYLON from "@babylonjs/core";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";

export async function loadLevel(scene: BABYLON.Scene, shadows: BABYLON.ShadowGenerator): Promise<void> {
	const container = await LoadAssetContainerAsync("models/build_chunked.glb", scene);
	const root = container.instantiateModelsToScene().rootNodes[0] as BABYLON.TransformNode;

	root.position = new BABYLON.Vector3(0, 0, 0); // X (right/left), Y (up/down), Z (forward/backward)

	// collisions on every sub-mesh of the building
	for (const mesh of root.getChildMeshes()) {
		mesh.checkCollisions = true;
		mesh.receiveShadows = true;
		shadows.addShadowCaster(mesh);
	}
}
