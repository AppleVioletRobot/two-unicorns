import * as THREE from 'three';
import './styles.css';
import { buildRoom } from './room.js';
import { createControls } from './controls.js';

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomiseGalleryImages(contentConfig) {
  const galleries = [
    ...(contentConfig.planeGalleries ?? []),
    ...(contentConfig.wallGalleries ?? [])
  ];
  const allImages = galleries.flatMap((gallery) => gallery.images ?? []);
  if (!allImages.length) return;

  const shuffledImages = shuffled(allImages);
  let cursor = 0;
  for (const gallery of galleries) {
    const count = (gallery.images ?? []).length;
    gallery.images = shuffledImages.slice(cursor, cursor + count);
    cursor += count;
  }
}

async function start() {
  const overlay = document.querySelector('#overlay');
  const enterButton = document.querySelector('#enter-button');
  enterButton.disabled = true;
  enterButton.textContent = 'Loading room…';

  const [roomConfig, skinConfig, contentConfig] = await Promise.all([
    loadJson('./config/room.json'),
    loadJson('./config/skin.json'),
    loadJson('./config/content.json')
  ]);

  randomiseGalleryImages(contentConfig);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    roomConfig.camera.fov,
    window.innerWidth / window.innerHeight,
    roomConfig.camera.near,
    roomConfig.camera.far
  );
  camera.position.set(...roomConfig.player.start);
  if (roomConfig.player.lookAt) camera.lookAt(...roomConfig.player.lookAt);

  const renderer = new THREE.WebGLRenderer({ antialias: roomConfig.renderer.antialias });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, roomConfig.renderer.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.querySelector('#app').prepend(renderer.domElement);

  const roomBounds = await buildRoom(scene, roomConfig, skinConfig, contentConfig);
  const { update } = createControls(camera, roomBounds, roomConfig.player);

  enterButton.textContent = 'Enter Room';
  enterButton.disabled = false;
  enterButton.addEventListener('click', () => overlay.classList.add('hidden'));

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    update(Math.min(clock.getDelta(), roomConfig.renderer.maxDelta));
    renderer.render(scene, camera);
  });
}

start().catch((error) => {
  console.error(error);
  document.querySelector('.overlay-card').innerHTML = `<h1>Two Unicorns could not start</h1><p>${error?.message ?? String(error)}</p>`;
});
