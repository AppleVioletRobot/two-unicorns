import * as THREE from 'three';
import './style.css';
import { ROOM, PLANES } from './planes.js';

const mount = document.querySelector('#scene');
const positionLabel = document.querySelector('#positionLabel');
const backButton = document.querySelector('#backButton');
const forwardButton = document.querySelector('#forwardButton');
const turnButton = document.querySelector('#turnButton');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8d8d8);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, ROOM.eyeHeight, ROOM.startZ);
camera.lookAt(0, ROOM.eyeHeight, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2));

const floorLength = ROOM.startZ - ROOM.endZ + 4;
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM.width, floorLength),
  new THREE.MeshStandardMaterial({ color: 0xf3f3f3, side: THREE.DoubleSide })
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, (ROOM.startZ + ROOM.endZ) / 2);
scene.add(floor);

function makeLabelTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#efefef';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 76px Arial';
  ctx.fillText(text, canvas.width / 2, 120);
  ctx.font = '38px Arial';
  ctx.fillText('find your way through', canvas.width / 2, 210);
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addPanel(x, y, z, w, h, material) {
  if (w <= 0 || h <= 0) return;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

function apertureCenterX(def) {
  const edgeInset = 0.45;
  if (def.aperturePosition === 'left') {
    return -def.width / 2 + edgeInset + def.apertureWidth / 2;
  }
  if (def.aperturePosition === 'right') {
    return def.width / 2 - edgeInset - def.apertureWidth / 2;
  }
  return 0;
}

function addPlane(def) {
  const apertureX = apertureCenterX(def);
  const planeLeft = -def.width / 2;
  const planeRight = def.width / 2;
  const apertureLeft = apertureX - def.apertureWidth / 2;
  const apertureRight = apertureX + def.apertureWidth / 2;
  const leftWidth = apertureLeft - planeLeft;
  const rightWidth = planeRight - apertureRight;
  const topHeight = def.height - def.apertureHeight;
  const yMid = def.height / 2;
  const material = new THREE.MeshBasicMaterial({ map: makeLabelTexture(def.label), side: THREE.DoubleSide });

  addPanel(planeLeft + leftWidth / 2, yMid, def.z, leftWidth, def.height, material);
  addPanel(apertureRight + rightWidth / 2, yMid, def.z, rightWidth, def.height, material);
  addPanel(apertureX, def.apertureHeight + topHeight / 2, def.z, def.apertureWidth, topHeight, material);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(def.width, def.height)),
    new THREE.LineBasicMaterial({ color: 0x333333 })
  );
  outline.position.set(0, yMid, def.z - 0.01);
  scene.add(outline);
}

PLANES.forEach(addPlane);

const turnaroundWall = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM.width, ROOM.height),
  new THREE.MeshBasicMaterial({ color: 0xbdbdbd, side: THREE.DoubleSide })
);
turnaroundWall.position.set(0, ROOM.height / 2, ROOM.endZ);
scene.add(turnaroundWall);

const wallCanvas = document.createElement('canvas');
wallCanvas.width = 1024;
wallCanvas.height = 512;
const wallCtx = wallCanvas.getContext('2d');
wallCtx.fillStyle = '#bdbdbd';
wallCtx.fillRect(0, 0, 1024, 512);
wallCtx.fillStyle = '#111';
wallCtx.textAlign = 'center';
wallCtx.textBaseline = 'middle';
wallCtx.font = 'bold 70px Arial';
wallCtx.fillText('TURN AROUND', 512, 220);
wallCtx.font = '36px Arial';
wallCtx.fillText('Now look back through what you crossed.', 512, 310);
turnaroundWall.material.map = new THREE.CanvasTexture(wallCanvas);
turnaroundWall.material.needsUpdate = true;

let facing = -1;

function updateUI() {
  const metresIn = ROOM.startZ - camera.position.z;
  positionLabel.textContent = `${metresIn.toFixed(1)} m from start · ${facing === -1 ? 'facing in' : 'facing out'}`;
  backButton.disabled = camera.position.z >= ROOM.startZ - 0.01;
  forwardButton.disabled = camera.position.z <= ROOM.endZ + 1.5;
}

function move(delta) {
  const nextZ = THREE.MathUtils.clamp(
    camera.position.z + delta,
    ROOM.endZ + 1.5,
    ROOM.startZ
  );
  camera.position.z = nextZ;
  updateUI();
}

function turnAround() {
  facing *= -1;
  camera.rotation.y += Math.PI;
  updateUI();
}

// Movement is deliberately incremental and instantaneous: no giant leaps and no motion-sickness tweening.
backButton.addEventListener('click', () => move(ROOM.stepSize));
forwardButton.addEventListener('click', () => move(-ROOM.stepSize));
turnButton.addEventListener('click', turnAround);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateUI();

function render() {
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();
