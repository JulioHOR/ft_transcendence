import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';

const scene = new THREE.Scene();
const useCanvas = document.getElementById("threejs_canvas");  
const camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 1000 );

const objtst = new THREE.Object3D();

const canvas = document.getElementById('canvas');

const renderer = new THREE.WebGLRenderer(
    { alpha: true, canvas: useCanvas } 
);
renderer.setSize( window.innerWidth, window.innerHeight );

// document.body.appendChild(renderer.domElement);


// renderer.setSize( window.innerWidth, window.innerHeight );
// renderer.setClearColor(0x000000, 0);
document.body.appendChild( renderer.domElement );

// to create a cube on a 3D scene:

let render_cube = true;

if (render_cube) {

    const color = 0xFFFFFF;
    const intensity = 2;
    const light = new THREE.AmbientLight(color, intensity);
    scene.add(light);

    // // Create a universal unlit material
    // const unlitOverride = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // // Set it on the scene. Everything inside the scene will now render with this material.
    // scene.overrideMaterial = unlitOverride;
    // scene.scale(10000, 1000);

    // https://discourse.threejs.org/t/how-to-scale-glb-model/65981

    const loader = new GLTFLoader();

    loader.load( 'models/linux-char.glb', function ( gltf ) {
    scene.scale.multiplyScalar( 100 );
    scene.add( gltf.scene );
    objtst.add(gltf.Object3D);

    }, undefined, function ( error ) {

    console.error( error );

    } );

    // const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    // const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    // const cube = new THREE.Mesh( geometry, material );
    // scene.add( cube );
    const controls = new FirstPersonControls(camera, renderer.domElement);
    controls.movementSpeed = 150;
    controls.lookSpeed = 0.1;

    const clock = new THREE.Clock();   

    // camera.position.z = 5;
  
        // renderer.render( scene, camera );

    function animate( time ) {
        // cube.rotation.x = time / 2000;
        // cube.rotation.y = time / 1000;
        const delta = clock.getDelta();
        controls.update(delta); 
        renderer.render( scene, camera );
    }

    renderer.setAnimationLoop( animate );
} else {
    
    // render arrow
    const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
    camera.position.set( 0, 0, 100 );
    camera.lookAt( 0, 0, 0 );

    const scene = new THREE.Scene();
    
    //create a blue LineBasicMaterial
    const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );

    const points = [];
    points.push( new THREE.Vector3( - 10, 0, 0 ) );
    points.push( new THREE.Vector3( 0, 10, 0 ) );
    points.push( new THREE.Vector3( 10, 0, 0 ) );

    const geometry = new THREE.BufferGeometry().setFromPoints( points );

    const line = new THREE.Line( geometry, material );

    scene.add( line );
    renderer.render( scene, camera );
}


