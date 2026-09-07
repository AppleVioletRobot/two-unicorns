import * as THREE from 'three';
import './style.css';
import { ROOM, PLANES, STOPS } from './planes.js';

const mount = document.querySelector('#scene');
const positionLabel = document.querySelector('#positionLabel');
const backButton = document.querySelector('#backButton');
const forwardButton = document.querySelector('#forwardButton');
const turnButton = document.querySelector('#turnButton');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8d8d8);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, ROOM.eyeHeight, STOPS[0].z);
camera.lookAt(0, ROOM.eyeHeight, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2));

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM.width, 24),
  new THREE.MeshStandardMaterial({ color: 0xf3f3f3, side: THREE.DoubleSide })
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, -1);
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
  ctx.font = 'bold 92px Arial';
  ctx.fillText(text, canvas.width / 2, 120);
  ctx.font = '42px Arial';
  ctx.fillText('walk through the hole', canvas.width / 2, 210);
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addPanel(x, y, z, w, h, material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

function addPlane(def) {
  const sideWidth = (def.width - def.apertureWidth) / 2;
  const topHeight = def.height - def.apertureHeight;
  const yMid = def.height / 2;
  const apertureBottom = 0;
  const material = new THREE.MeshBasicMaterial({ map: makeLabelTexture(def.label), side: THREE.DoubleSide });

  addPanel(-(def.apertureWidth / 2 + sideWidth / 2), yMid, def.z, sideWidth, def.height, material);
  addPanel( (def.apertureWidth / 2 + sideWidth / 2), yMid, def.z, sideWidth, def.height, material);
  addPanel(0, apertureBottom + def.apertureHeight + topHeight / 2, def.z, def.apertureWidth, topHeight, material);

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
wallCtx.fillRect(0,0,1024,512);
wallCtx.fillStyle = '#111';
wallCtx.textAlign = 'center';
wallCtx.textBaseline = 'middle';
wallCtx.font = 'bold 70px Arial';
wallCtx.fillText('TURN AROUND', 512, 220);
wallCtx.font = '36px Arial';
wallCtx.fillText('Now look back through what you crossed.', 512, 310);
turnaroundWall.material.map = new THREE.CanvasTexture(wallCanvas);
turnaroundWall.material.needsUpdate = true;

let stopIndex = 0;
let facing = -1; // -1 looks deeper into the tunnel, +1 looks back toward entrance
let moving = false;

function updateUI() {
  positionLabel.textContent = `${STOPS[stopIndex].label} · ${facing === -1 ? 'facing in' : 'facing out'}`;
  backButton.disabled = moving || stopIndex === 0;
  forwardButton.disabled = moving || stopIndex === STOPS.length - 1;
  turnButton.disabled = moving;
}

function targetQuaternion() {
  const target = new THREE.Vector3(0, ROOM.eyeHeight, camera.position.z + facing * 5);
  const m = new THREE.Matrix4().lookAt(camera.position, target, camera.up);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

function animateTo(nextIndex) {
  if (moving || nextIndex < 0 || nextIndex >= STOPS.length) return;
  moving = true;
  updateUI();
  const startZ = camera.position.z;
  const endZ = STOPS[nextIndex].z;
  const start = performance.now();
  const duration = 700;

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.z = THREE.MathUtils.lerp(startZ, endZ, eased);
    if (t < 1) requestAnimationFrame(step);
    else {
      stopIndex = nextIndex;
      moving = false;
      updateUI();
    }
  }
  requestAnimationFrame(step);
}

function turnAround() {
  if (moving) return;
  moving = true;
  updateUI();
  const from = camera.quaternion.clone();
  facing *= -1;
  const to = targetQuaternion();
  const start = performance.now();
  const duration = 600;

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    camera.quaternion.slerpQuaternions(from, to, 1 - Math.pow(1 - t, 3));
    if (t < 1) requestAnimationFrame(step);
    else {
      moving = false;
      updateUI();
    }
  }
  requestAnimationFrame(step);
}

backButton.addEventListener('click', () => animateTo(stopIndex - 1));
forwardButton.addEventListener('click', () => animateTo(stopIndex + 1));
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
