import { CharacterControls } from './characterControls';
import Stats from './lib/stats.module.js';
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Sky} from "three/examples/jsm/objects/Sky";

// STATS
// @ts-ignore
let stats = new Stats();
document.body.appendChild(stats.dom);

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 14
camera.position.z = 25
camera.position.x = 0

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true
orbitControls.minDistance = 8
orbitControls.maxDistance = 15
orbitControls.enablePan = false
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05
orbitControls.mouseButtons = { LEFT: THREE.MOUSE.LEFT, MIDDLE: THREE.MOUSE.MIDDLE, RIGHT: THREE.MOUSE.LEFT }
orbitControls.update();

// LIGHTS
light()

// FLOOR
generateFloor()

// MODEL WITH ANIMATIONS
var characterControls: CharacterControls
let objects: THREE.Object3D[] = []
new GLTFLoader().load('assets/models/Robot.glb', function (gltf) {
  const model = gltf.scene
  model.traverse(function(obj) {
    obj.frustumCulled = false
    // @ts-ignore
    if (obj.isMesh) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  });
  model.position.y = 1
  scene.add(model)

  const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
  const mixer = new THREE.AnimationMixer(model);
  const animationsMap: Map<string, THREE.AnimationAction> = new Map()
  gltfAnimations.forEach((a: THREE.AnimationClip) => {
      animationsMap.set(a.name, mixer.clipAction(a))
  })

  characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, camera,  'Idle', objects)
});

// CONTROL KEYS
const keysPressed = {  }
document.addEventListener('keydown', (event) => {
    if (event.key == 'Enter') {
      characterControls.unlock()
      return;
    } else if (event.key == 'Escape') {
      characterControls.lock()
    }
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle()
    } else {
        (keysPressed as any)[event.key.toLowerCase()] = true
    }
}, false);
document.addEventListener('keyup', (event) => {
    (keysPressed as any)[event.key.toLowerCase()] = false
}, false);

const clock = new THREE.Clock();
// ANIMATE
function animate() {
    let mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
        characterControls.update(mixerUpdateDelta, keysPressed);
    }
    orbitControls.update()
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
    stats.update();
}
document.body.appendChild(renderer.domElement);
animate();

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

function generateFloor() {
  new GLTFLoader().load('assets/models/level.glb', function (gltf) {
    const model = gltf.scene;
    model.traverse(function(obj) {
      obj.frustumCulled = false;
      // @ts-ignore
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
      objects.push(obj)
    });
    scene.add(model);
  });

  const sky = new Sky();
  sky.scale.setScalar( 450000 );
  scene.add( sky );

  const sun = new THREE.Vector3();

  // Set up variables to control the look of the sky
  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 3;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.7;

  const parameters = {
      elevation: 1,
      azimuth: 300
  };

  const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
  const theta = THREE.MathUtils.degToRad(parameters.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);

  skyUniforms[ 'sunPosition' ].value.copy( sun );

  renderer.toneMappingExposure = 0.1;

  scene.add(sky);
}

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))

  let light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(-100, 100, 100);
  light.target.position.set(0, 0, 0);
  light.castShadow = true;
  light.shadow.bias = -0.001;
  light.shadow.mapSize.width = 4096;
  light.shadow.mapSize.height = 4096;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 500.0;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 500.0;
  light.shadow.camera.left = 50;
  light.shadow.camera.right = -50;
  light.shadow.camera.top = 50;
  light.shadow.camera.bottom = -50;
  scene.add(light);
}