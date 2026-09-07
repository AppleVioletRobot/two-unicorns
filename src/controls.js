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

  function blockedByPlane(fromX, fromZ, toX, toZ) {
    for (const plane of roomBounds.planeColliders ?? []) {
      const crossed = (fromZ - plane.z) * (toZ - plane.z) <= 0 && Math.abs(toZ - fromZ) > 0.0001;
      if (!crossed) continue;
      const t = (plane.z - fromZ) / (toZ - fromZ);
      if (t < 0 || t > 1) continue;
      const crossingX = fromX + (toX - fromX) * t;
      if (crossingX < plane.apertureLeft + margin || crossingX > plane.apertureRight - margin) return true;
    }
    return false;
  }

  function update(delta) {
    let forward = 0;
    let turn = 0;

    if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) turn += 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) turn -= 1;

    camera.rotation.y += turn * turnSpeed * delta;

    if (forward !== 0) {
      const distance = forward * speed * delta;
      const nextX = camera.position.x - Math.sin(camera.rotation.y) * distance;
      const nextZ = camera.position.z - Math.cos(camera.rotation.y) * distance;
      const boundedX = Math.max(-roomBounds.width / 2 + margin, Math.min(roomBounds.width / 2 - margin, nextX));
      const boundedZ = Math.max(-roomBounds.depth / 2 + margin, Math.min(roomBounds.depth / 2 - margin, nextZ));
      if (!blockedByPlane(camera.position.x, camera.position.z, boundedX, boundedZ)) {
        camera.position.x = boundedX;
        camera.position.z = boundedZ;
      }
    }
  }

  return { update };
}
