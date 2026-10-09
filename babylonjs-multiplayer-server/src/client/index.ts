import * as BABYLON from "@babylonjs/core";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
// import '@babylonjs/loaders/glTF';
import "@babylonjs/loaders";
import { startMic } from "./voice.js";

import { ColyseusSDK, Callbacks } from "@colyseus/sdk";
import { Predict } from "@colyseus/sdk/predict";
import type { default as server } from "../app.config.js";
import type { MoveInput } from "../rooms/schema/MyRoomState.js";
import { stepEntity } from "../shared/movement.js";
import { ARENA_WIDTH } from "../shared/constants.js";

// The glTF loader turns every model 180° around Y to convert it to Babylon's
// left-handed system. If the penguin ends up facing backwards, set this to 0.
const MODEL_YAW_OFFSET = Math.PI;

// linux-char.glb: origin at the feet, about 0.76 tall and 0.56 wide.
const PENGUIN_HEIGHT = 0.76;
const PENGUIN_RADIUS = 0.28;
// Camera height above the feet, roughly where the penguin's eyes are.
const EYE_HEIGHT = 0.6;

// ak-47.glb: ~1.92 long, lying along glTF +X, far from its own origin.
// Grip position measured from the file, converted to Babylon space (x flipped by the loader).
const GUN_GRIP = new BABYLON.Vector3(-4.33, 0.04, 0.38);
const GUN_SCALE = 0.25; // your own gun (first person), ~0.48 long
const HELD_GUN_SCALE = 0.35; // other players' guns, ~0.67 long next to a 0.76 penguin
const GUN_YAW_OFFSET = Math.PI / 2; // barrel from -X to +Z (forward); try -Math.PI / 2 if it points backwards
// Where your own gun sits relative to the camera: right, down, forward.
const VIEWMODEL_OFFSET = new BABYLON.Vector3(0.07, -0.1, -0.007);
// Where other players' guns sit relative to their eyes: right, down, forward.
// Further out than your own, so the gun shows outside the penguin's body.
const HELD_GUN_OFFSET = new BABYLON.Vector3(0.12, -0.2, 0.15);

// --- DOM & Status Elements ---
const statusEl = document.getElementById("status")!;
const useCanvas = document.getElementById(
  "threejs_canvas",
) as HTMLCanvasElement;

if (useCanvas === null) {
  throw new TypeError("useCanvas was null. P.S: It shouldn't!");
}

// --- Colyseus Client Setup ---
const client = new ColyseusSDK<typeof server>(
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`,
);

const held = new Set<string>();
addEventListener("keydown", (e) => held.add(e.key.toLowerCase()));
addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

/** Opposite keys cancel out, so the axis is always exactly -1, 0 or 1. */
function axis(negative: string[], positive: string[]): -1 | 0 | 1 {
  const back = negative.some((k) => held.has(k));
  const forward = positive.some((k) => held.has(k));
  if (back === forward) {
    return 0;
  }
  return back ? -1 : 1;
}

// --- Babylon.js Main Init ---
const engine = new BABYLON.Engine(useCanvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
});
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1);

// Enable physics/collision engine
scene.gravity = new BABYLON.Vector3(0, -0.98, 0);
scene.collisionsEnabled = true;

// Camera Setup (Universal Camera for 3D navigation)
const camera = new BABYLON.UniversalCamera(
  "fpsCamera",
  new BABYLON.Vector3(0, 5, -10),
  scene,
);
camera.minZ = 0.01; // the gun sits a few centimetres from the eye; 0.1 would cut it off
camera.maxZ = 1000;
camera.fov = 90 * (Math.PI / 180);
camera.inertia = 0; // Remove floaty movement for crisp mouse look

// Adjust mouse sensitivity (lower number = more sensitive)
camera.angularSensibility = 200;

// --- Collision Settings for Camera ---
// camera.checkCollisions = true;
// camera.applyGravity = false;
// camera.ellipsoid = new BABYLON.Vector3(0.5, 1.0, 0.5); // Player size: width, height, depth

// Disable camera controls on keys to avoid conflicts with Colyseus input
camera.keysUp = [];
camera.keysDown = [];
camera.keysLeft = [];
camera.keysRight = [];

startMic().catch((e) => {
  if (e instanceof DOMException && e.name === "NotAllowedError") {
    statusEl.textContent = "User did not allow microphone use.";
  } else {
    console.error(e);
  }
});

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
window.addEventListener("resize", () => {
  engine.resize();
});

// --- Light & Environment ---
const light = new BABYLON.HemisphericLight(
  "light",
  new BABYLON.Vector3(0, 1, 0),
  scene,
);
light.intensity = 2.0;

// --- Ground Floor Placeholder ---
const floor = BABYLON.MeshBuilder.CreatePlane("floor", { size: 1000 }, scene);
floor.rotation.x = Math.PI / 2;

const floorMat = new BABYLON.StandardMaterial("floorMat", scene);
floorMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
floorMat.backFaceCulling = false;

floor.material = floorMat;
floor.checkCollisions = true;

/** One AK: pivot (aim) → model (scale and turn) → glTF root, with the grip at the pivot. */
function createGun(
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
  return pivot;
}

async function main() {
  const room = await client.joinOrCreate("my_room");
  const predict = Predict.get(room);

  // Interpolate other players smoothly
  predict.attachAll("players", {
    mode: "lerp",
    fields: ["x", "y"],
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

  statusEl.textContent = `Connected as ${room.sessionId}`;

  // 1. Declare your tracking map and callbacks first
  const playerMeshes = new Map<string, BABYLON.AbstractMesh>();
  const playerHeads = new Map<string, BABYLON.TransformNode>();
  const callbacks = Callbacks.get(room);

  // 2. Load your container
  const container = await LoadAssetContainerAsync(
    "models/linux-char.glb",
    scene,
  );
  const gunContainer = await LoadAssetContainerAsync("models/ak-47.glb", scene);

  // 3. Now callbacks and playerMeshes are fully in scope and won't show squiggles
  callbacks.onAdd("players", (player, sessionId) => {
    const isSelf = sessionId === room.sessionId;

    // Instantiates a copy of the model for this player
    const entries = container.instantiateModelsToScene();
    // The glTF root is a Mesh, so it has moveWithCollisions and the collision ellipsoid
    const playerMesh = entries.rootNodes[0] as BABYLON.AbstractMesh;
    playerMesh.name = `player_${sessionId}`;

    // The loader stores that 180° turn in rotationQuaternion, and while it is set
    // Babylon ignores .rotation. Swap it for the same turn as Euler so .rotation.y works.
    playerMesh.rotationQuaternion = null;
    playerMesh.rotation.y = MODEL_YAW_OFFSET;

    // Set initial position immediately
    // playerMesh.position.x = player.x;
    // playerMesh.position.z = player.y; // Map schema Y to 3D Z
    playerMesh.position.y = 0; // model origin is at its feet

    if (isSelf) {
      // Get all child meshes under this root node and hide them for first-person view
      const childMeshes = playerMesh.getChildMeshes();
      childMeshes.forEach((m) => (m.isVisible = false));

      // Also sync initial camera position to match
      // camera.position.x = player.x;
      // camera.position.z = player.y;
      // Ellipsoid values are radii around the mesh origin; lift it by half the height so it sits on the feet.
      playerMesh.ellipsoid = new BABYLON.Vector3(
        PENGUIN_RADIUS,
        PENGUIN_HEIGHT / 2,
        PENGUIN_RADIUS,
      );
      playerMesh.ellipsoidOffset = new BABYLON.Vector3(
        0,
        PENGUIN_HEIGHT / 2,
        0,
      );
      camera.position.y = playerMesh.position.y + EYE_HEIGHT;

      // Your own gun rides on the camera, so it follows where you look for free.
      const viewGun = createGun(gunContainer, "gun_self", GUN_SCALE);
      viewGun.parent = camera;
      viewGun.position.copyFrom(VIEWMODEL_OFFSET);
    } else {
      // Other players' guns hang from an invisible head that turns with their aim.
      const head = new BABYLON.TransformNode(`head_${sessionId}`, scene);
      const gun = createGun(gunContainer, `gun_${sessionId}`, HELD_GUN_SCALE);
      gun.parent = head;
      gun.position.copyFrom(HELD_GUN_OFFSET);
      playerHeads.set(sessionId, head);
    }

    playerMeshes.set(sessionId, playerMesh);
  });

  callbacks.onRemove("players", (_player, sessionId) => {
    const mesh = playerMeshes.get(sessionId);
    if (mesh) {
      mesh.dispose();
      playerMeshes.delete(sessionId);
    }
    // Disposing the head takes its gun with it
    playerHeads.get(sessionId)?.dispose();
    playerHeads.delete(sessionId);
  });

  room.onLeave(() => {
    statusEl.textContent = "Disconnected";
    playerMeshes.forEach((mesh) => mesh.dispose());
    playerMeshes.clear();
    playerHeads.forEach((head) => head.dispose());
    playerHeads.clear();
  });

  // level loading meshes
  const buildingContainer = await LoadAssetContainerAsync(
    "models/build1.glb",
    scene,
  );
  const buildingEntries = buildingContainer.instantiateModelsToScene();
  const buildingRoot = buildingEntries.rootNodes[0] as BABYLON.TransformNode;

  // 2. Place it in the world
  // buildingRoot.position = new BABYLON.Vector3(ARENA_WIDTH / 2, 0.1, ARENA_WIDTH / 2); // X (right/left), Y (up/down), Z (forward/backward)
  buildingRoot.position = new BABYLON.Vector3(0, 0.1, 0); // X (right/left), Y (up/down), Z (forward/backward)

  // buildingRoot.rotation = new BABYLON.Vector3(0, Math.PI / 4, 0);
  // buildingRoot.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);

  // Enable collisions on every sub-mesh of the building
  const buildingMeshes = buildingRoot.getChildMeshes();
  buildingMeshes.forEach((mesh) => {
    mesh.checkCollisions = true;
  });

  // --- Main Game Loop (Integrated with Babylon Render Loop) ---
  engine.runRenderLoop(() => {
    const now = performance.now();

    // Drives prediction, interpolation, and the reconciler
    const steps = predict.tick(now);

    // for (let i = 0; i < steps; i++) {

    //   const rawForward = axis(["s", "arrowdown"], ["w", "arrowup"]);
    //   const rawRight = axis(["a", "arrowleft"], ["d", "arrowright"]);

    //   const yaw = camera.rotation.y;
    //   const sin = Math.sin(yaw);
    //   const cos = Math.cos(yaw);

    //   const moveX = rawForward * sin + rawRight * cos;
    //   const moveY = rawForward * cos - rawRight * sin;

    //   const length = Math.hypot(moveX, moveY);
    //   if (length > 1) {
    //     input.data.moveX = moveX / length;
    //     input.data.moveY = moveY / length;
    //   } else {
    //     input.data.moveX = moveX;
    //     input.data.moveY = moveY;
    //   }

    //   input.send();

    //   // input.data.moveX = axis(["a", "arrowleft"], ["d", "arrowright"]);
    //   // input.data.moveY = axis(["s", "arrowdown"], ["w", "arrowup"]);
    //   // input.send();
    // }

    // // Sync network positions to 3D player meshes
    // for (const [sessionId, player] of room.state.players) {
    //   const mesh = playerMeshes.get(sessionId);
    //   if (!mesh) { continue; }

    //   const posX = predict.value(player, "x");
    //   const posZ = predict.value(player, "y");

    //   // If it's the local player, let the mesh handle collisions, then sync the camera
    //   if (sessionId === room.sessionId) {
    //     // 1. Calculate the movement delta from network prediction
    //     const targetPosition = new BABYLON.Vector3(posX, mesh.position.y, posZ);
    //     const displacement = targetPosition.subtract(mesh.position);

    //     // 2. AbstractMesh has moveWithCollisions — slides against building walls
    //     mesh.moveWithCollisions(displacement);

    //     // 3. Lock the camera to the collision-safe mesh position (eye level)
    //     camera.position.x = mesh.position.x;
    //     camera.position.z = mesh.position.z;
    //     camera.position.y = mesh.position.y + 0.75;
    //   } else {
    //     // Remote players update normally from network values
    //     mesh.position.x = posX;
    //     mesh.position.z = posZ;
    //     mesh.position.y = 1.75 / 2;
    //   }
    // }

    // In your engine.runRenderLoop:
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
        // const sin = Math.sin(yaw);
        // const cos = Math.cos(yaw);

        // const moveX = rawForward * sin + rawRight * cos;
        // const moveZ = rawForward * cos - rawRight * sin;

        const moveX =
          (rawForward * Math.sin(yaw) + rawRight * Math.cos(yaw)) * 0.1; // adjust speed as needed
        const moveZ =
          (rawForward * Math.cos(yaw) - rawRight * Math.sin(yaw)) * 0.1;

        // 2. Apply Babylon's native mesh collision sliding
        const displacement = new BABYLON.Vector3(moveX, 0, moveZ);
        mesh.moveWithCollisions(displacement);

        // 3. Lock camera to the collision-safe mesh position
        camera.position.x = mesh.position.x;
        camera.position.z = mesh.position.z;
        camera.position.y = mesh.position.y + EYE_HEIGHT;

        // 4. Send your *actual* collision-checked position to the server
        room.send("updatePosition", {
          x: mesh.position.x,
          y: mesh.position.z,
          yaw: camera.rotation.y,
          pitch: camera.rotation.x,
        });
      } else {
        // Remote players update normally from server state interpolation
        const posX = predict.value(player, "x");
        const posZ = predict.value(player, "y");
        mesh.position.x = posX;
        mesh.position.z = posZ;
        mesh.position.y = 0;
        mesh.rotation.y = player.yaw + MODEL_YAW_OFFSET;

        // The head follows the penguin at eye level and turns like their camera
        const head = playerHeads.get(sessionId);
        if (head) {
          head.position.set(posX, EYE_HEIGHT, posZ);
          head.rotation.set(player.pitch, player.yaw, 0);
        }
      }
    }
    scene.render();
  });
}

main().catch((e) => {
  console.error(e);
  statusEl.textContent = e.message;
});
