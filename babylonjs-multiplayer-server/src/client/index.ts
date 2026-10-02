import * as BABYLON from '@babylonjs/core';
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
// import '@babylonjs/loaders/glTF';
import "@babylonjs/loaders";

import { ColyseusSDK, Callbacks } from "@colyseus/sdk";
import { Predict } from "@colyseus/sdk/predict";
import type { default as server } from "../app.config.js";
import type { MoveInput } from "../rooms/schema/MyRoomState.js";
import { stepEntity } from "../shared/movement.js";

// --- DOM & Status Elements ---
const statusEl = document.getElementById("status")!;
const useCanvas = document.getElementById("threejs_canvas") as HTMLCanvasElement;

if (useCanvas === null) {
    throw new TypeError("useCanvas was null. P.S: It shouldn't!");
}

// --- Colyseus Client Setup ---
const client = new ColyseusSDK<typeof server>(
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
);

const held = new Set<string>();
addEventListener("keydown", (e) => held.add(e.key.toLowerCase()));
addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

/** Opposite keys cancel out, so the axis is always exactly -1, 0 or 1. */
function axis(negative: string[], positive: string[]): -1 | 0 | 1 {
  const back = negative.some((k) => held.has(k));
  const forward = positive.some((k) => held.has(k));
  if (back === forward) { return 0; }
  return back ? -1 : 1;
}

// --- Babylon.js Main Init ---
const engine = new BABYLON.Engine(useCanvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1);

// Camera Setup (Universal Camera for 3D navigation)
const camera = new BABYLON.UniversalCamera("fpsCamera", new BABYLON.Vector3(0, 5, -10), scene);
camera.minZ = 0.1;
camera.maxZ = 1000;
camera.fov = 90 * (Math.PI / 180);
camera.inertia = 0; // Remove floaty movement for crisp mouse look

// Adjust mouse sensitivity (lower number = more sensitive)
camera.angularSensibility = 200;

// Disable camera controls on keys to avoid conflicts with Colyseus input
camera.keysUp = [];
camera.keysDown = [];
camera.keysLeft = [];
camera.keysRight = [];

// --- Pointer Lock Handling ---
useCanvas.addEventListener("click", () => {
  useCanvas.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  const isLocked = document.pointerLockElement === useCanvas;
  if (isLocked) {
    camera.attachControl(useCanvas, true);
  } else {
    camera.detachControl();
  }
});

// Window Resize Handling
window.addEventListener('resize', () => {
    engine.resize();
});

// --- Light & Environment ---
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 2.0;

// --- Ground Floor Placeholder ---
const floor = BABYLON.MeshBuilder.CreatePlane("floor", { size: 1000 }, scene);
floor.rotation.x = Math.PI / 2;

const floorMat = new BABYLON.StandardMaterial("floorMat", scene);
floorMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
floorMat.backFaceCulling = false;

floor.material = floorMat;
floor.checkCollisions = true;

async function main() {
  const room = await client.joinOrCreate("my_room");
  const predict = Predict.get(room);

  // Interpolate other players smoothly
  predict.attachAll("players", { mode: "lerp", fields: ["x", "y"], smoothMs: 65 });

  const input = room.input<MoveInput>({ mode: "reliable" });

  // Wait for the first state patch to create our own Player data reference
  await new Promise<void>((resolve) => room.onStateChange.once(() => resolve()));
  const self = room.state.players.get(room.sessionId);

  predict.reconciler(self, {
    input,
    fields: ["x", "y", "vx", "vy"],
    step: (ctx, predicted, command) => stepEntity(predicted, command, ctx.dt),
  });

  statusEl.textContent = `Connected as ${room.sessionId}`;

  // 1. Declare your tracking map and callbacks first
  const playerMeshes = new Map<string, BABYLON.AbstractMesh>();
  const callbacks = Callbacks.get(room);

  // 2. Load your container 
  const container = await LoadAssetContainerAsync("models/linux-char.glb", scene);

  // 3. Now callbacks and playerMeshes are fully in scope and won't show squiggles
  callbacks.onAdd("players", (_player, sessionId) => {
      const isSelf = sessionId === room.sessionId;
      
      // Instantiates a copy of the model for this player
      const entries = container.instantiateModelsToScene();
      const playerMesh = entries.rootNodes[0];
      playerMesh.name = `player_${sessionId}`;

      if (isSelf) {
        // Get all child meshes under this root node and hide them for first-person view
        const childMeshes = playerMesh.getChildMeshes();
        childMeshes.forEach(m => m.isVisible = false);
      }

      playerMeshes.set(sessionId, playerMesh as unknown as BABYLON.AbstractMesh);
    });

  callbacks.onRemove("players", (_player, sessionId) => {
    const mesh = playerMeshes.get(sessionId);
    if (mesh) {
      mesh.dispose();
      playerMeshes.delete(sessionId);
    }
  });

  room.onLeave(() => {
    statusEl.textContent = "Disconnected";
    playerMeshes.forEach((mesh) => mesh.dispose());
    playerMeshes.clear();
  });
  

  // level loading meshes
  const buildingContainer = await LoadAssetContainerAsync("models/build1.glb", scene);
  const buildingEntries = buildingContainer.instantiateModelsToScene();
  const buildingRoot = buildingEntries.rootNodes[0] as BABYLON.TransformNode;

  // 2. Place it in the world
  buildingRoot.position = new BABYLON.Vector3(0, 0, 10); // X (right/left), Y (up/down), Z (forward/backward)
  // buildingRoot.rotation = new BABYLON.Vector3(0, Math.PI / 4, 0);
  // buildingRoot.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);

  // Enable collisions on every sub-mesh of the building
  // const buildingMeshes = buildingRoot.getChildMeshes();
  // buildingMeshes.forEach((mesh) => {
  //   mesh.checkCollisions = true;
  // });

  // --- Main Game Loop (Integrated with Babylon Render Loop) ---
  engine.runRenderLoop(() => {
    const now = performance.now();

    // Drives prediction, interpolation, and the reconciler
    const steps = predict.tick(now);

    for (let i = 0; i < steps; i++) {

      const rawForward = axis(["s", "arrowdown"], ["w", "arrowup"]);
      const rawRight = axis(["a", "arrowleft"], ["d", "arrowright"]);

      const yaw = camera.rotation.y;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      const moveX = rawForward * sin + rawRight * cos;
      const moveY = rawForward * cos - rawRight * sin;

      const length = Math.hypot(moveX, moveY);
      if (length > 1) {
        input.data.moveX = moveX / length;
        input.data.moveY = moveY / length;
      } else {
        input.data.moveX = moveX;
        input.data.moveY = moveY;
      }

      input.send();

      // input.data.moveX = axis(["a", "arrowleft"], ["d", "arrowright"]);
      // input.data.moveY = axis(["s", "arrowdown"], ["w", "arrowup"]);
      // input.send();
    }

    // Sync network positions to 3D player meshes
    for (const [sessionId, player] of room.state.players) {
      const mesh = playerMeshes.get(sessionId);
      if (!mesh) { continue; }

      // Map Colyseus 2D coordinates (x, y) into Babylon 3D space (x, z)
      const posX = predict.value(player, "x");
      const posZ = predict.value(player, "y"); // Map 2D Y to 3D Z plane

      mesh.position.x = posX;
      mesh.position.z = posZ;
      mesh.position.y = 1.75 / 2; // Keep feet on the floor

      // If it's the local player, lock the camera to eye level (First-Person view)
      if (sessionId === room.sessionId) {
        camera.position.x = posX;
        camera.position.z = posZ;
        camera.position.y = 1.5; // Eye-level height inside the 1.75 capsule
      }
    }
    scene.render();
  });
}

main().catch((e) => {
  console.error(e);
  statusEl.textContent = "Could not connect";
});
