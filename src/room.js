import * as THREE from 'three';

function geometryForItem(item) {
  if (item.type === 'box') return new THREE.BoxGeometry(...item.size);
  if (item.type === 'plane') return new THREE.PlaneGeometry(...item.size);
  throw new Error(`Unknown geometry type: ${item.type}`);
}

async function addConfiguredItem(scene, item, materials) {
  if (item.enabled === false) return;
  const materialConfig = materials[item.material];
  if (!materialConfig) throw new Error(`Unknown material: ${item.material}`);
  const material = new THREE.MeshStandardMaterial({
    color: materialConfig.baseColor,
    side: item.doubleSided ? THREE.DoubleSide : THREE.FrontSide
  });
  const mesh = new THREE.Mesh(geometryForItem(item), material);
  mesh.name = item.id;
  mesh.position.set(...item.position);
  mesh.rotation.set(...item.rotation);
  scene.add(mesh);
}

function apertureCentreX(def, roomWidth) {
  const sideMargin = 0.55;
  if (def.aperturePosition === 'left') return -roomWidth / 2 + sideMargin + def.apertureWidth / 2;
  if (def.aperturePosition === 'right') return roomWidth / 2 - sideMargin - def.apertureWidth / 2;
  return 0;
}

function addTraversalPlane(scene, def, roomConfig, materials, colliders) {
  const width = roomConfig.dimensions.width;
  const height = roomConfig.dimensions.height;
  const thickness = def.thickness ?? 0.14;
  const x = apertureCentreX(def, width);
  const leftEdge = -width / 2;
  const rightEdge = width / 2;
  const apertureLeft = x - def.apertureWidth / 2;
  const apertureRight = x + def.apertureWidth / 2;
  const leftWidth = apertureLeft - leftEdge;
  const rightWidth = rightEdge - apertureRight;
  const topHeight = height - def.apertureHeight;
  const materialConfig = materials[def.material];
  const material = new THREE.MeshStandardMaterial({ color: materialConfig.baseColor });

  function block(id, blockX, blockY, blockWidth, blockHeight) {
    if (blockWidth <= 0 || blockHeight <= 0) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(blockWidth, blockHeight, thickness), material);
    mesh.name = `${def.id}-${id}`;
    mesh.position.set(blockX, blockY, def.z);
    scene.add(mesh);
    colliders.push({
      id: `${def.id}-${id}`,
      minX: blockX - blockWidth / 2,
      maxX: blockX + blockWidth / 2,
      minZ: def.z - thickness / 2,
      maxZ: def.z + thickness / 2
    });
  }

  block('left', leftEdge + leftWidth / 2, height / 2, leftWidth, height);
  block('right', apertureRight + rightWidth / 2, height / 2, rightWidth, height);
  block('top', x, def.apertureHeight + topHeight / 2, def.apertureWidth, topHeight);
}

function addLight(scene, lightConfig) {
  let light;
  if (lightConfig.type === 'ambient') light = new THREE.AmbientLight(lightConfig.color, lightConfig.intensity);
  else if (lightConfig.type === 'directional') {
    light = new THREE.DirectionalLight(lightConfig.color, lightConfig.intensity);
    light.position.set(...lightConfig.position);
  } else throw new Error(`Unknown light type: ${lightConfig.type}`);
  scene.add(light);
}

export async function buildRoom(scene, roomConfig, skinConfig, contentConfig) {
  const { width, depth, height } = roomConfig.dimensions;
  const materials = skinConfig.materials;
  const architecture = roomConfig.architecture ?? [];
  const planeColliders = [];
  scene.background = new THREE.Color(skinConfig.background);
  for (const item of architecture) await addConfiguredItem(scene, item, materials);
  for (const plane of roomConfig.planes ?? []) addTraversalPlane(scene, plane, roomConfig, materials, planeColliders);
  skinConfig.lighting.forEach((light) => addLight(scene, light));
  for (const object of contentConfig.objects ?? []) await addConfiguredItem(scene, object, materials);
  return { width, depth, height, planeColliders };
}
