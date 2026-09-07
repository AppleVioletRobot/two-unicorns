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
      camera.position.x -= Math.sin(camera.rotation.y) * distance;
      camera.position.z -= Math.cos(camera.rotation.y) * distance;
    }

    camera.position.x = Math.max(
      -roomBounds.width / 2 + margin,
      Math.min(roomBounds.width / 2 - margin, camera.position.x)
    );
    camera.position.z = Math.max(
      -roomBounds.depth / 2 + margin,
      Math.min(roomBounds.depth / 2 - margin, camera.position.z)
    );
  }

  return { update };
}
