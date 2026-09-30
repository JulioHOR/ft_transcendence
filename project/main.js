import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
// collision bvh
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// collision bvh
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true; 

// main init
const scene = new THREE.Scene();
const useCanvas = document.getElementById("threejs_canvas");  
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 25, 0);
const renderer = new THREE.WebGLRenderer({ alpha: true, canvas: useCanvas });
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
	const width = window.innerWidth;
	const height = window.innerHeight;
	
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	
	renderer.setSize(width, height);
});
document.body.appendChild(renderer.domElement);

// light
const light = new THREE.AmbientLight(0xFFFFFF, 2);
scene.add(light);

// load meshes
let char = null;
const loader = new GLTFLoader();
loader.load('models/linux-char.glb', (gltf) => {
	char = gltf.scene;
	char.scale.multiplyScalar(0.1);
	scene.add(char);
});

const environmentMeshes = []; // will be used for collision detection
loader.load('models/build1.glb', (gltf) => {
	const building = gltf.scene;
	building.position.set(0,1,0);
	building.traverse((child) => {
		if (child.isMesh) {
			child.geometry.computeBoundsTree();
			environmentMeshes.push(child);
		}
	});
	scene.add(building);
});

// player collision
const playerRadius = 0.35; 
const playerHeight = 1.75;
const capsuleHeight = 1.85;

// collision variables
const tempVector = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();
const tempBox = new THREE.Box3();
const tempMat = new THREE.Matrix4();
const tempSegment = new THREE.Line3();

let isGrounded = false;
function resolvePlayerCollisions() {
	if (environmentMeshes.length === 0) return;

	isGrounded = false;
	// player bottom capsule
	tempSegment.start.copy(camera.position);
	tempSegment.start.y -= (playerHeight - playerRadius); 
	// player top capsule
	tempSegment.end.copy(camera.position);
	tempSegment.end.y += (capsuleHeight - playerHeight - playerRadius);
	// bounding capsule
	tempBox.makeEmpty();
	tempBox.expandByPoint(tempSegment.start);
	tempBox.expandByPoint(tempSegment.end);
	tempBox.min.subScalar(playerRadius);
	tempBox.max.addScalar(playerRadius);

	for (let i = 0; i < environmentMeshes.length; i++) {
		const mesh = environmentMeshes[i];
		tempMat.copy(mesh.matrixWorld).invert();

		mesh.geometry.boundsTree.shapecast({
			intersectsBounds: (box) => {
				const localBox = box.clone().applyMatrix4(mesh.matrixWorld);
				return localBox.intersectsBox(tempBox);
			},
			intersectsTriangle: (tri) => {
				tri.a.applyMatrix4(mesh.matrixWorld);
				tri.b.applyMatrix4(mesh.matrixWorld);
				tri.c.applyMatrix4(mesh.matrixWorld);

				const triPoint = tempVector;
				const capsulePoint = tempVector2;
				const distance = tri.closestPointToSegment(tempSegment, triPoint, capsulePoint);

				if (distance < playerRadius) {
					const depth = playerRadius - distance;
					const contactNormal = capsulePoint.sub(triPoint).normalize();

					if (contactNormal.y > 0.5) {
						isGrounded = true;
					}

					tempSegment.start.addScaledVector(contactNormal, depth);
					tempSegment.end.addScaledVector(contactNormal, depth);
				}
			}
		});
	}

	camera.position.copy(tempSegment.start);
	camera.position.y += (playerHeight - playerRadius);
}

// ground floor placeholder
const floorGeo = new THREE.PlaneGeometry(1000, 1000);
const floorMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// controller variables
const controls = new PointerLockControls(camera, renderer.domElement);
const moveSpeed = 150.0;    
const gravity = 30.0;   
const jumpStrength = 15.0;  

// physics
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let canJump = false;

// DOM elements manipulation variables
let health = 100;
let score = 0;
const healthElement = document.getElementById('health-val');
const scoreElement = document.getElementById('score-val');
const boostButton = document.getElementById('action-btn');

// trigger a ui change
boostButton.addEventListener('click', () => {
score += 10;
scoreElement.innerText = score;
char.scale.multiplyScalar(1.2); 
});

// active keyboard inputs
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };

// click Canvas to lock mouse
renderer.domElement.addEventListener('click', () => {
	controls.lock(); 
});

// input listeners
window.addEventListener('keydown', (e) => {
	const key = e.key.toLowerCase();
	if (key === 'w') keys.w = true;
	if (key === 'a') keys.a = true;
	if (key === 's') keys.s = true;
	if (key === 'd') keys.d = true;
	if (e.code === 'Space') keys.space = true;
	if (e.key === 'Shift') keys.shift = true;
});

window.addEventListener('keyup', (e) => {
	const key = e.key.toLowerCase();
	if (key === 'w') keys.w = false;
	if (key === 'a') keys.a = false;
	if (key === 's') keys.s = false;
	if (key === 'd') keys.d = false;
	if (e.code === 'Space') keys.space = false;
	if (e.key === 'Shift') keys.shift = false; 
});

const clock = new THREE.Clock();   

// game loop
function animate() {
	const delta = clock.getDelta();

	// example how we can change UI elements from the game loop
	if (health > 0 && Math.random() < 0.01) {
		health -= 1;
		healthElement.innerText = health;
	}

	//checking if model is true, meaning loaded
	if (char) {
		char.rotation.y += 0.01;
	}

	if (controls.isLocked) {
		// inertia physics
		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;

		// gravity apply
		velocity.y -= gravity * delta;

		direction.z = Number(keys.w) - Number(keys.s);
		direction.x = Number(keys.d) - Number(keys.a);
		direction.normalize(); 

		const currentSpeed = (keys.shift && isGrounded) ? moveSpeed * 1.6 : moveSpeed;

		if (keys.w || keys.s) velocity.z -= direction.z * currentSpeed * delta;
		if (keys.a || keys.d) velocity.x -= direction.x * currentSpeed * delta;

		// jump
		if (keys.space && isGrounded) {
			velocity.y = jumpStrength; 
			isGrounded = false;
		}

		// apply movements
		controls.moveRight(-velocity.x * delta);
		controls.moveForward(-velocity.z * delta);
		camera.position.y += velocity.y * delta;

		// collision handling
		resolvePlayerCollisions();

		// stop falling at floor
		if (isGrounded && velocity.y < 0) {
			velocity.y = 0;
		}

		// under level ground safeguard
		const absoluteVoidFloor = -20.0;
		if (camera.position.y < absoluteVoidFloor) {
			velocity.y = 0;
			camera.position.y = 5.0;
		}

		// put char in front of camera
		if (char) {
			char.position.copy(camera.position);
			const viewOffset = new THREE.Vector3(0.1, -0.15, -0.2).applyQuaternion(camera.quaternion);
			char.position.add(viewOffset);
		}
	}
	renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
