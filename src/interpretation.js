import * as THREE from 'three';

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function interpretationTexture(panel) {
  const canvas = document.createElement('canvas');
  canvas.width = panel.canvasWidth ?? 1600;
  const ctx = canvas.getContext('2d');
  const background = panel.backgroundColor ?? '#ffffff';
  const textColor = panel.textColor ?? '#111111';
  const padding = panel.padding ?? 120;
  const contentWidth = canvas.width - padding * 2;
  const fontFamily = panel.fontFamily ?? 'Helvetica Neue, Helvetica, Arial, sans-serif';
  const headingSize = panel.headingSize ?? 88;
  const bodySize = panel.bodySize ?? 38;
  const lineHeight = panel.lineHeight ?? 1.45;

  let requiredHeight = padding;
  let eyebrowLines = [];
  let headingLines = [];
  let bodyLines = [];

  if (panel.eyebrow) {
    const eyebrowSize = panel.eyebrowSize ?? 38;
    ctx.font = `500 ${eyebrowSize}px ${fontFamily}`;
    eyebrowLines = [panel.eyebrow.toUpperCase()];
    requiredHeight += eyebrowSize * 1.8;
  }

  ctx.font = `600 ${headingSize}px ${fontFamily}`;
  headingLines = wrapText(ctx, panel.heading ?? '', contentWidth);
  requiredHeight += headingLines.length * headingSize * 1.05;

  if (panel.body) {
    requiredHeight += 48;
    ctx.font = `400 ${bodySize}px ${fontFamily}`;
    bodyLines = wrapText(ctx, panel.body, contentWidth);
    requiredHeight += bodyLines.length * bodySize * lineHeight;
  }

  requiredHeight += padding;
  canvas.height = panel.autoHeight === false
    ? (panel.canvasHeight ?? 1200)
    : Math.ceil(Math.max(panel.canvasHeight ?? 0, requiredHeight));

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (panel.borderWidth) {
    ctx.strokeStyle = panel.borderColor ?? textColor;
    ctx.lineWidth = panel.borderWidth;
    const inset = panel.borderWidth / 2;
    ctx.strokeRect(inset, inset, canvas.width - panel.borderWidth, canvas.height - panel.borderWidth);
  }

  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';
  let y = padding;

  if (eyebrowLines.length) {
    const eyebrowSize = panel.eyebrowSize ?? 38;
    ctx.font = `500 ${eyebrowSize}px ${fontFamily}`;
    ctx.fillText(eyebrowLines[0], padding, y);
    y += eyebrowSize * 1.8;
  }

  ctx.font = `600 ${headingSize}px ${fontFamily}`;
  for (const line of headingLines) {
    ctx.fillText(line, padding, y);
    y += headingSize * 1.05;
  }

  if (bodyLines.length) {
    y += 48;
    ctx.font = `400 ${bodySize}px ${fontFamily}`;
    for (const line of bodyLines) {
      ctx.fillText(line, padding, y);
      y += bodySize * lineHeight;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, aspectRatio: canvas.height / canvas.width };
}

function addInterpretationPanel(scene, panel) {
  if (panel.enabled === false) return;
  const { texture, aspectRatio } = interpretationTexture(panel);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });
  const width = panel.size[0];
  const height = panel.autoHeight === false ? panel.size[1] : width * aspectRatio;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.name = panel.id;
  mesh.position.set(...panel.position);
  mesh.rotation.set(...(panel.rotation ?? [0, 0, 0]));
  scene.add(mesh);
}

export function addInterpretationPanels(scene, contentConfig) {
  for (const panel of contentConfig.interpretationPanels ?? []) addInterpretationPanel(scene, panel);
}
