import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

function geometryForItem(item) {
  if (item.type === 'box') return new THREE.BoxGeometry(...item.size);
  if (item.type === 'plane') return new THREE.PlaneGeometry(...item.size);
  throw new Error(`Unknown geometry type: ${item.type}`);
}

async function loadMaterial(materialConfig, options = {}) {
  let map = null;
  if (materialConfig.texture) {
    map = await textureLoader.loadAsync(materialConfig.texture);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    if (materialConfig.textureRepeat) map.repeat.set(...materialConfig.textureRepeat);
    if (materialConfig.textureRotation) { map.center.set(0.5, 0.5); map.rotation = materialConfig.textureRotation; }
    map.colorSpace = THREE.SRGBColorSpace;
  }
  return new THREE.MeshStandardMaterial({ color: materialConfig.baseColor, map, side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide, emissive: materialConfig.emissiveColor ?? '#000000', emissiveIntensity: materialConfig.emissiveIntensity ?? 0, roughness: materialConfig.roughness ?? 1, metalness: materialConfig.metalness ?? 0 });
}

async function addConfiguredItem(scene, item, materials) {
  if (item.enabled === false) return;
  const materialConfig = materials[item.material];
  if (!materialConfig) throw new Error(`Unknown material: ${item.material}`);
  const material = await loadMaterial(materialConfig, { doubleSided: item.doubleSided });
  const mesh = new THREE.Mesh(geometryForItem(item), material);
  mesh.name = item.id; mesh.position.set(...item.position); mesh.rotation.set(...item.rotation); scene.add(mesh);
}

function addTextSign(scene, sign) {
  if (sign.enabled === false) return;
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const transparent = sign.transparent === true;
  if (!transparent) { ctx.fillStyle = sign.backgroundColor ?? '#16834a'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.fillStyle = sign.textColor ?? '#ffffff';
  ctx.textAlign = sign.textAlign ?? 'center'; ctx.textBaseline = 'middle';
  const weight = sign.fontWeight ?? 700;
  ctx.font = `${weight} ${sign.fontSize ?? 190}px ${sign.fontFamily ?? 'Arial, Helvetica, sans-serif'}`;
  const padding = sign.padding ?? 70;
  const x = ctx.textAlign === 'left' ? padding : ctx.textAlign === 'right' ? canvas.width - padding : canvas.width / 2;
  ctx.fillText(sign.text ?? '', x, canvas.height / 2 + (sign.textYOffset ?? 5));
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent, side: THREE.DoubleSide, depthWrite: !transparent });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...sign.size), material);
  mesh.name = sign.id; mesh.position.set(...sign.position); mesh.rotation.set(...(sign.rotation ?? [0, 0, 0])); scene.add(mesh);
}

function apertureCentreX(def, roomWidth) { const sideMargin = 0.55; if (def.aperturePosition === 'left') return -roomWidth / 2 + sideMargin + def.apertureWidth / 2; if (def.aperturePosition === 'right') return roomWidth / 2 - sideMargin - def.apertureWidth / 2; return 0; }
async function makeMaterial(materials, id) { const config = materials[id]; if (!config) throw new Error(`Unknown material: ${id}`); return loadMaterial(config); }

async function addTraversalPlane(scene, def, roomConfig, materials, colliders) {
  const width = roomConfig.dimensions.width, height = roomConfig.dimensions.height, thickness = def.thickness ?? 0.24;
  const x = apertureCentreX(def, width), leftEdge = -width / 2, rightEdge = width / 2;
  const apertureLeft = x - def.apertureWidth / 2, apertureRight = x + def.apertureWidth / 2;
  const leftWidth = apertureLeft - leftEdge, rightWidth = rightEdge - apertureRight, topHeight = height - def.apertureHeight;
  const faceMaterial = await makeMaterial(materials, def.faceMaterial ?? def.material), edgeMaterial = await makeMaterial(materials, def.edgeMaterial ?? def.faceMaterial ?? def.material);
  const boxMaterials = [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, faceMaterial, faceMaterial];
  function block(id, blockX, blockY, blockWidth, blockHeight, collides = true) {
    if (blockWidth <= 0 || blockHeight <= 0) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(blockWidth, blockHeight, thickness), boxMaterials); mesh.name = `${def.id}-${id}`; mesh.position.set(blockX, blockY, def.z); scene.add(mesh);
    if (collides) colliders.push({ id: `${def.id}-${id}`, minX: blockX - blockWidth / 2, maxX: blockX + blockWidth / 2, minZ: def.z - thickness / 2, maxZ: def.z + thickness / 2 });
  }
  block('left', leftEdge + leftWidth / 2, height / 2, leftWidth, height); block('right', apertureRight + rightWidth / 2, height / 2, rightWidth, height); block('top', x, def.apertureHeight + topHeight / 2, def.apertureWidth, topHeight, false);
}

function gallerySlotsForPlane(def, roomWidth, gallery) {
  const apertureX = apertureCentreX(def, roomWidth), apertureLeft = apertureX - def.apertureWidth / 2, apertureRight = apertureX + def.apertureWidth / 2;
  const segments = [[-roomWidth / 2, apertureLeft], [apertureRight, roomWidth / 2]], itemWidth = gallery.itemWidth ?? 0.56, gap = gallery.gap ?? 0.12, slots = [];
  for (const [start, end] of segments) { const width = end - start, count = Math.max(0, Math.floor((width + gap) / (itemWidth + gap))); if (!count) continue; const used = count * itemWidth + (count - 1) * gap, first = start + (width - used) / 2 + itemWidth / 2; for (let index = 0; index < count; index += 1) slots.push(first + index * (itemWidth + gap)); }
  return slots;
}

async function texturedGalleryMesh(image, itemWidth, itemHeight) { const texture = await textureLoader.loadAsync(image); texture.colorSpace = THREE.SRGBColorSpace; const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.001, side: THREE.FrontSide }); return new THREE.Mesh(new THREE.PlaneGeometry(itemWidth, itemHeight), material); }

async function addPlaneGallery(scene, gallery, roomConfig) {
  if (gallery.enabled === false) return;
  const planeById = new Map((roomConfig.planes ?? []).map((plane) => [plane.id, plane])), planeIds = gallery.planes ?? [...planeById.keys()], images = gallery.images ?? [], itemWidth = gallery.itemWidth ?? 0.56;
  const [aspectWidth, aspectHeight] = gallery.aspectRatio ?? [472, 536], itemHeight = gallery.itemHeight ?? itemWidth * (aspectHeight / aspectWidth), centreY = gallery.centreY ?? 1.65, normalOffset = gallery.normalOffset ?? 0.012, sides = gallery.sides ?? ['front', 'back']; let imageIndex = 0;
  for (const planeId of planeIds) { const def = planeById.get(planeId); if (!def) continue; const xSlots = gallerySlotsForPlane(def, roomConfig.dimensions.width, gallery), halfThickness = (def.thickness ?? 0.24) / 2; for (const side of sides) for (const x of xSlots) { if (imageIndex >= images.length) return; const mesh = await texturedGalleryMesh(images[imageIndex], itemWidth, itemHeight); mesh.name = `${gallery.id ?? 'plane-gallery'}-${imageIndex + 1}`; mesh.position.set(x, centreY, def.z + (side === 'front' ? halfThickness + normalOffset : -halfThickness - normalOffset)); mesh.rotation.y = side === 'front' ? 0 : Math.PI; scene.add(mesh); imageIndex += 1; } }
}

function wallSegmentsAvoidingPlanes(wall, roomConfig, gallery) {
  const wallWidth = wall.size[0], halfWidth = wallWidth / 2, rotation = new THREE.Euler(...wall.rotation), right = new THREE.Vector3(1, 0, 0).applyEuler(rotation);
  if (Math.abs(right.z) < 0.9) return [[-halfWidth, halfWidth]];
  const clearance = gallery.planeClearance ?? 0.12, wallCentre = new THREE.Vector3(...wall.position), cuts = [];
  for (const plane of roomConfig.planes ?? []) { const localOffset = (plane.z - wallCentre.z) / right.z; if (localOffset <= -halfWidth || localOffset >= halfWidth) continue; const halfCut = (plane.thickness ?? 0.24) / 2 + clearance; cuts.push([localOffset - halfCut, localOffset + halfCut]); }
  cuts.sort((a, b) => a[0] - b[0]); const segments = []; let cursor = -halfWidth; for (const [cutStart, cutEnd] of cuts) { if (cutStart > cursor) segments.push([cursor, Math.min(cutStart, halfWidth)]); cursor = Math.max(cursor, cutEnd); } if (cursor < halfWidth) segments.push([cursor, halfWidth]); return segments.filter(([start, end]) => end > start);
}

function gallerySlotsForWall(wall, roomConfig, gallery) { const itemWidth = gallery.itemWidth ?? 1.25, gap = gallery.gap ?? 0.28, slots = []; for (const [start, end] of wallSegmentsAvoidingPlanes(wall, roomConfig, gallery)) { const width = end - start, count = Math.max(0, Math.floor((width + gap) / (itemWidth + gap))); if (!count) continue; const used = count * itemWidth + (count - 1) * gap, first = start + (width - used) / 2 + itemWidth / 2; for (let slot = 0; slot < count; slot += 1) slots.push(first + slot * (itemWidth + gap)); } return slots; }

async function addWallGallery(scene, gallery, roomConfig) {
  if (gallery.enabled === false) return;
  const architecture = roomConfig.architecture ?? [], wallById = new Map(architecture.map((item) => [item.id, item])), wallIds = gallery.walls ?? [], images = gallery.images ?? [], itemWidth = gallery.itemWidth ?? 1.25;
  const [aspectWidth, aspectHeight] = gallery.aspectRatio ?? [472, 536], itemHeight = gallery.itemHeight ?? itemWidth * (aspectHeight / aspectWidth), centreY = gallery.centreY ?? 1.65, normalOffset = gallery.normalOffset ?? 0.014; let imageIndex = 0;
  for (const wallId of wallIds) { const wall = wallById.get(wallId); if (!wall || wall.type !== 'plane') continue; const offsets = gallerySlotsForWall(wall, roomConfig, gallery), rotation = new THREE.Euler(...wall.rotation), right = new THREE.Vector3(1, 0, 0).applyEuler(rotation), normal = new THREE.Vector3(0, 0, 1).applyEuler(rotation), wallCentre = new THREE.Vector3(...wall.position); for (const offset of offsets) { if (imageIndex >= images.length) return; const position = wallCentre.clone().add(right.clone().multiplyScalar(offset)).add(normal.clone().multiplyScalar(normalOffset)); position.y = centreY; const mesh = await texturedGalleryMesh(images[imageIndex], itemWidth, itemHeight); mesh.name = `${gallery.id ?? 'wall-gallery'}-${imageIndex + 1}`; mesh.position.copy(position); mesh.rotation.set(...wall.rotation); scene.add(mesh); imageIndex += 1; } }
}

function addLight(scene, lightConfig) { let light; if (lightConfig.type === 'ambient') light = new THREE.AmbientLight(lightConfig.color, lightConfig.intensity); else if (lightConfig.type === 'directional') { light = new THREE.DirectionalLight(lightConfig.color, lightConfig.intensity); light.position.set(...lightConfig.position); } else throw new Error(`Unknown light type: ${lightConfig.type}`); scene.add(light); }

export async function buildRoom(scene, roomConfig, skinConfig, contentConfig) { const { width, depth, height } = roomConfig.dimensions, materials = skinConfig.materials, architecture = roomConfig.architecture ?? [], planeColliders = []; scene.background = new THREE.Color(skinConfig.background); for (const item of architecture) await addConfiguredItem(scene, item, materials); for (const plane of roomConfig.planes ?? []) await addTraversalPlane(scene, plane, roomConfig, materials, planeColliders); skinConfig.lighting.forEach((light) => addLight(scene, light)); for (const object of contentConfig.objects ?? []) await addConfiguredItem(scene, object, materials); for (const sign of contentConfig.signs ?? []) addTextSign(scene, sign); for (const gallery of contentConfig.planeGalleries ?? []) await addPlaneGallery(scene, gallery, roomConfig); for (const gallery of contentConfig.wallGalleries ?? []) await addWallGallery(scene, gallery, roomConfig); return { width, depth, height, planeColliders }; }
