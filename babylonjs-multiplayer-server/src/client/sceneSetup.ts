import * as BABYLON from "@babylonjs/core";

export type GameScene = {
	engine: BABYLON.Engine;
	scene: BABYLON.Scene;
	camera: BABYLON.UniversalCamera;
};

function createCamera(scene: BABYLON.Scene): BABYLON.UniversalCamera {
	const camera = new BABYLON.UniversalCamera(
		"fpsCamera",
		new BABYLON.Vector3(0, 5, -10),
		scene,
	);
	camera.minZ = 0.01; // the gun sits a few centimetres from the eye; 0.1 would cut it off
	camera.maxZ = 1000;
	camera.fov = 70 * (Math.PI / 180);
	camera.inertia = 0;
	// mouse sensitivity (lower number = more sensitive)
	camera.angularSensibility = 200;

	// disable camera controls on keys to avoid conflicts with Colyseus input
	camera.keysUp = [];
	camera.keysDown = [];
	camera.keysLeft = [];
	camera.keysRight = [];
	return camera;
}

function createLight(scene: BABYLON.Scene): void {
	const light = new BABYLON.HemisphericLight(
		"light",
		new BABYLON.Vector3(0, 1, 0),
		scene,
	);
	light.intensity = 2.0;
}

function createFloor(scene: BABYLON.Scene): void {
	const floor = BABYLON.MeshBuilder.CreatePlane("floor", { size: 1000 }, scene);
	floor.rotation.x = Math.PI / 2;

	const floorMat = new BABYLON.StandardMaterial("floorMat", scene);
	floorMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
	floorMat.backFaceCulling = false;

	floor.material = floorMat;
	floor.checkCollisions = true;
}

// the camera only turns with the mouse while the pointer is locked to the canvas
function setupPointerLock(canvas: HTMLCanvasElement, camera: BABYLON.UniversalCamera): void {
	canvas.addEventListener("click", () => {
		canvas.requestPointerLock();
	});

	document.addEventListener("pointerlockchange", () => {
		if (document.pointerLockElement === canvas) {
			camera.attachControl(canvas, true);
		} else {
			camera.detachControl();
		}
	});
}

export function createScene(canvas: HTMLCanvasElement): GameScene {
	const engine = new BABYLON.Engine(canvas, true, {
		preserveDrawingBuffer: true,
		stencil: true,
	});
	const scene = new BABYLON.Scene(engine);
	scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1);
	scene.collisionsEnabled = true;

	const camera = createCamera(scene);
	createLight(scene);
	createFloor(scene);
	setupPointerLock(canvas, camera);

	window.addEventListener("resize", () => engine.resize());

	return { engine, scene, camera };
}
