import * as BABYLON from "@babylonjs/core";

// rotate to babylons forward axis
export const MODEL_YAW_OFFSET = Math.PI;
// character.glb: Mixamo rig, origin at the feet, standing ~1.8 tall.
export const CHARACTER_RADIUS = 0.3;
export const CHARACTER_HEIGHT = 1.8;
// Camera height above the feet, roughly where the character's eyes are.
export const EYE_HEIGHT = 1.65;
// The idle animation baked into character.glb, played in a loop on every instance.
export const IDLE_ANIMATION_NAME = "Armature|mixamo.com|Layer0";
export const WALK_MOVING_EPSILON = 0.001;
// adjust the gun origin positioning
export const GUN_GRIP = new BABYLON.Vector3(-4.33, 0.04, 0.38);
export const GUN_SCALE = 0.25; // self gun scale
export const HELD_GUN_SCALE = 0.85; // other players' guns scale
export const GUN_YAW_OFFSET = Math.PI / 2; // origin offset to handle yaw movement
// self gun placement relative to the camera
export const VIEWMODEL_OFFSET = new BABYLON.Vector3(0.07, -0.1, -0.007);
// other players' guns sit relative to their eyes
export const HELD_GUN_OFFSET = new BABYLON.Vector3(0.12, -0.2, 0.15);

// movement, in units per second (and per second squared for gravity)
export const PLAYER_SPEED = 2;
export const RUN_SPEED = 10;
export const GRAVITY = 20;
export const JUMP_SPEED = 7;

