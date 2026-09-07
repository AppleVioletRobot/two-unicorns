export function createControls(camera, roomBounds, playerConfig) {
  const keys = new Set();
  const speed = playerConfig.speed;
  const turnSpeed = playerConfig.turnSpeed;
  const margin = playerConfig.collisionMargin;

  window.addEventListener('keydown', (event) => {
    if ([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'KeyW', 'KeyA', 'KeyS', 'KeyD'
    ].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  });

  window.addEventListener('keyup', (event) => keys.delete(event.code));

  function blockedByPlane(x, z) {
    for (const block of roomBounds.planeColliders ?? []) {
      if (
        x > block.minX - margin &&
        x < block.maxX + margin &&
        z > block.minZ - margin &&
        z < block.maxZ + margin
      ) return true;
    }
    return false;
  }

  function update(delta) {
    let forward = 0;
    let turn = 0;

    if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) turn -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) turn += 1;

    camera.rotation.y += turn * turnSpeed * delta;

    if (forward !== 0) {
      const distance = forward * speed * delta;
      const nextX = camera.position.x - Math.sin(camera.rotation.y) * distance;
      const nextZ = camera.position.z - Math.cos(camera.rotation.y) * distance;
      const boundedX = Math.max(-roomBounds.width / 2 + margin, Math.min(roomBounds.width / 2 - margin, nextX));
      const boundedZ = Math.max(-roomBounds.depth / 2 + margin, Math.min(roomBounds.depth / 2 - margin, nextZ));

      // Resolve each axis independently so the player can slide along a wall
      // toward its aperture instead of becoming pinned against the collider.
      if (!blockedByPlane(boundedX, camera.position.z)) camera.position.x = boundedX;
      if (!blockedByPlane(camera.position.x, boundedZ)) camera.position.z = boundedZ;
    }
  }

  return { update };
}
