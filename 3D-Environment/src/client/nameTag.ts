import * as BABYLON from "@babylonjs/core";
import { CHARACTER_HEIGHT } from "./config.js";


export function createNameTag(scene: BABYLON.Scene, text: string, parent: BABYLON.TransformNode): BABYLON.Mesh {
	const plane = BABYLON.MeshBuilder.CreatePlane(`nametag_${text}`, { width: 1, height: 0.25 }, scene);
	plane.parent = parent;
	plane.position.y = CHARACTER_HEIGHT + 0.3;
	plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // always faces the camera
	plane.isPickable = false;

	const tex = new BABYLON.DynamicTexture("nametag_tex", { width: 512, height: 128 }, scene, true);
	tex.hasAlpha = true;
	tex.drawText(text, null, 90, "bold 80px sans-serif", "white", "transparent", true);

	const mat = new BABYLON.StandardMaterial("nametag_mat", scene);
	mat.diffuseTexture = tex;
	mat.opacityTexture = tex;
	mat.emissiveColor = BABYLON.Color3.White(); // unaffected by scene lighting
	mat.disableLighting = true;
	plane.material = mat;
	return plane;
}
