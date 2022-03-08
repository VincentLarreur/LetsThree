import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import Stats from './lib/stats.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';

let container, stats, mixer, model, camera, scene, renderer, cameraControls, actions, activeAction, previousAction;

let clock = new THREE.Clock();

const controls = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  space: false
};

init();
animate();

function init() {
  container = document.createElement('div');
  document.body.appendChild(container);

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.TextureLoader().load('./assets/background.jpg');
  scene.background.encoding = THREE.sRGBEncoding;

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
  camera.position.set(0, 10, 100);

  scene.add(camera)

  // LIGHTS

  scene.add(new THREE.AmbientLight(0x222222));

  const light = new THREE.DirectionalLight(0xffffff, 2.25);
  light.position.set(200, 450, 500);

  light.castShadow = true;

  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 512;

  light.shadow.camera.near = 100;
  light.shadow.camera.far = 1200;

  light.shadow.camera.left = - 1000;
  light.shadow.camera.right = 1000;
  light.shadow.camera.top = 350;
  light.shadow.camera.bottom = - 350;

  scene.add(light);

  // GROUND
  // const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
  // mesh.rotation.x = - Math.PI / 2;
  // scene.add( mesh );

  const loader = new GLTFLoader();
  loader.load('/assets/models/RobotExpressive.glb', function (gltf) {
    model = gltf.scene;
    scene.add(model);
    createControls(model, gltf.animations);
  }, undefined, function (e) {
    console.error(e);
  });

  // RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  // EVENTS
  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // CONTROLS
  cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 50, 0);
  cameraControls.update();
}

// EVENT HANDLERS

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function onKeyDown(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW': controls.moveForward = true; break;
    case 'ArrowDown':
    case 'KeyS': controls.moveBackward = true; break;
    case 'ArrowLeft':
    case 'KeyA': controls.moveLeft = true; break;
    case 'ArrowRight':
    case 'KeyD': controls.moveRight = true; break;
    case 'Space': controls.jump = true; break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW': controls.moveForward = false; break;
    case 'ArrowDown':
    case 'KeyS': controls.moveBackward = false; break;
    case 'ArrowLeft':
    case 'KeyA': controls.moveLeft = false; break;
    case 'ArrowRight':
    case 'KeyD': controls.moveRight = false; break;
    case 'Space': controls.jump = false; break;
  }
}


function createControls(model, animations) {
  const states = ['Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing'];
  const emotes = ['Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'];
  
  mixer = new THREE.AnimationMixer(model);
  actions = {};
  for (let i = 0; i < animations.length; i++) {
    const clip = animations[i];
    const action = mixer.clipAction(clip);
    actions[clip.name] = action;
    if (emotes.indexOf(clip.name) >= 0 || states.indexOf(clip.name) >= 4) {
      action.clampWhenFinished = true;
      action.loop = THREE.LoopOnce;
    }
  }

  activeAction = actions['Idle'];
  activeAction.play();
}

function fadeToAction(name, duration) {

  previousAction = activeAction;
  activeAction = actions[name];

  if (previousAction !== activeAction) {
    previousAction.fadeOut(duration);
  }

  activeAction
    .reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(duration)
    .play();
}

function animate() {
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  stats.update();
}