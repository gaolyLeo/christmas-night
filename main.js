import { createSculpture, GLYPHS, PALETTE, STAR_HEIGHT } from './geometry.js';
import { drawSnow } from './snow.js';

const scene = document.querySelector('#scene');
const drawing = scene.getContext('2d');
const growthMeter = document.querySelector('#growth');
const dragHint = document.querySelector('#drag-hint');
const reset = document.querySelector('#reset');
const restart = document.querySelector('#restart');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const sculpture = createSculpture();
const floor = document.createElement('canvas');
const atlas = document.createElement('canvas');
const sculptureLayer = document.createElement('canvas');
const sculptureDrawing = sculptureLayer.getContext('2d');
const palettes = Object.keys(PALETTE);
const paletteRows = Object.fromEntries(palettes.map((color, i) => [color, i]));
const shades = 12;
const shadesPerRow = GLYPHS.length * shades;
const fullTurn = Math.PI * 2;
const initialAngle = -0.12;
const cameraDistance = 10.4;
const cameraHeight = 2.10;
const pitchCos = Math.cos(0.245);
const pitchSin = Math.sin(0.245);
const growthStages = {
  tree: [0.025, 0.56],
  star: [0.49, 0.65],
  lights: [0.60, 0.84],
  gifts: [0.74, 0.91],
  deer: [0.86, 1]
};
let angle = initialAngle;
let drag;
let returnToStart;
let firstFrame;
let animationFrame;
let view;
let lastSculptureAngle;
let lastGrowth;
let growth = 0;

function resize() {
  const { width, height } = scene.getBoundingClientRect();
  if (width < 1 || height < 1) return;
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  const scale = Math.min(width / 4.72, height / 6.12);
  const cellWidth = Math.max(2.8, Math.min(6.5, scale * 0.050));
  const cellHeight = cellWidth * 1.16;
  const columns = Math.ceil(width / cellWidth);
  const rows = Math.ceil(height / cellHeight);
  view = {
    width, height, scale, cellWidth, cellHeight, columns, rows,
    cx: width / 2, cy: height * 0.485,
    tileWidth: Math.ceil(cellWidth * pixelRatio),
    tileHeight: Math.ceil(cellHeight * pixelRatio),
    depth: new Float32Array(columns * rows),
    stamps: new Uint16Array(columns * rows),
    occupied: new Int32Array(columns * rows)
  };
  scene.width = floor.width = sculptureLayer.width = Math.round(width * pixelRatio);
  scene.height = floor.height = sculptureLayer.height = Math.round(height * pixelRatio);
  drawing.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  sculptureDrawing.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  lastGrowth = undefined;
  prepareAtlas();
  prepareFloor(pixelRatio);
  requestDraw();
}

function prepareAtlas() {
  const { tileWidth, tileHeight } = view;
  atlas.width = tileWidth * shadesPerRow;
  atlas.height = tileHeight * palettes.length;
  const context = atlas.getContext('2d');
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `600 ${tileHeight * 0.98}px ui-monospace, Menlo, Consolas, monospace`;
  for (let row = 0; row < palettes.length; row++) {
    const [dark, bright] = PALETTE[palettes[row]];
    const y = (row + 0.51) * tileHeight;
    for (let shade = 0; shade < shades; shade++) {
      const t = shade / (shades - 1);
      const rgb = dark.map((value, i) => Math.round(value + (bright[i] - value) * t));
      context.fillStyle = `rgb(${rgb.join(',')})`;
      for (let i = 0; i < GLYPHS.length; i++) {
        const x = (shade * GLYPHS.length + i + 0.5) * tileWidth;
        context.fillText(GLYPHS[i], x, y, tileWidth * 0.92);
      }
    }
  }
}

function project(x, y, z) {
  const elevation = y - cameraHeight;
  const depth = z * pitchCos + elevation * pitchSin;
  const scale = view.scale * cameraDistance / (cameraDistance - depth);
  return [view.cx + x * scale, view.cy - (elevation * pitchCos - z * pitchSin) * scale];
}

function prepareFloor(pixelRatio) {
  const context = floor.getContext('2d');
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const [x, y] = project(0, 0, 0);
  context.save();
  context.translate(x, y);
  context.scale(1, 0.28);
  const glow = context.createRadialGradient(0, 0, 0, 0, 0, view.scale * 2.24);
  glow.addColorStop(0, '#121616aa');
  glow.addColorStop(0.7, '#6555342b');
  glow.addColorStop(1, '#65553400');
  context.fillStyle = glow;
  context.fillRect(-view.scale * 2.24, -view.scale * 2.24, view.scale * 4.48, view.scale * 4.48);
  context.restore();

  function ring(radius, count, skip, opacity) {
    for (let i = 0; i < count; i++) {
      if (skip && i % skip === 0) continue;
      const a = i / count * fullTurn;
      const [px, py] = project(radius * Math.cos(a), 0, radius * Math.sin(a));
      const alpha = opacity * (0.64 + 0.36 * Math.sin(a));
      context.fillStyle = `rgba(223,188,126,${alpha})`;
      const size = Math.max(0.85, view.cellWidth * (i % 6 === 0 ? 0.40 : 0.25));
      context.fillRect(px - size / 2, py - size / 2, size, size);
    }
  }

  ring(2.13, 174, 11, 0.62);
  ring(2.29, 172, 5, 0.42);
  ring(1.79, 134, 3, 0.24);
  ring(0.80, 65, 4, 0.21);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * fullTurn;
    const position = (r) => project(r * Math.cos(a), 0, r * Math.sin(a));
    context.beginPath();
    context.moveTo(...position(i % 6 === 0 ? 1.85 : 2.02));
    context.lineTo(...position(2.30));
    context.lineWidth = i % 6 === 0 ? 1.2 : 0.8;
    context.strokeStyle = i % 6 === 0 ? '#f1ce82a0' : '#edca7a44';
    context.stroke();
  }
}

function progress(value, start, end) {
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}

function smooth(value) {
  return value * value * (3 - 2 * value);
}

function drawStarGlow(bloom, time) {
  if (!bloom) return;
  const [x, y] = project(0, STAR_HEIGHT, 0);
  const radius = view.scale * 0.39;
  const glow = drawing.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, `rgba(255,220,130,${(0.33 + 0.04 * Math.sin(time * 1.5)) * bloom})`);
  glow.addColorStop(0.32, `rgba(244,187,95,${0.13 * bloom})`);
  glow.addColorStop(1, 'rgba(244,187,95,0)');
  drawing.fillStyle = glow;
  drawing.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawGrowthEffect(treeProgress, time) {
  if (growth < 0.18) {
    const resting = growth === 0;
    const pulse = progress(growth, 0, 0.18);
    const radius = resting ? 0.18 + Math.sin(time * 2.6) * 0.018 : 0.18 + pulse * 2.14;
    const strength = resting ? 0.62 : (1 - pulse) * 0.86;
    const [x, y] = project(0, 0, 0);
    const [edgeX] = project(radius, 0, 0);
    const [, edgeY] = project(0, 0, radius);
    const lightRadius = view.scale * (0.39 + pulse * 0.48);
    const glow = drawing.createRadialGradient(x, y, 0, x, y, lightRadius);
    glow.addColorStop(0, `rgba(255,216,124,${strength * 0.65})`);
    glow.addColorStop(1, 'rgba(245,178,87,0)');
    drawing.fillStyle = glow;
    drawing.fillRect(x - lightRadius, y - lightRadius, lightRadius * 2, lightRadius * 2);
    drawing.beginPath();
    drawing.ellipse(x, y, edgeX - x, edgeY - y, 0, 0, fullTurn);
    drawing.strokeStyle = `rgba(246,216,156,${strength})`;
    drawing.lineWidth = 1.15;
    drawing.stroke();
  }

  if (treeProgress <= 0.075 || treeProgress >= 1) return;
  const front = treeProgress * 4.24;
  const opacity = Math.sin(Math.PI * treeProgress) * 0.91;
  const radius = 1.62 * (1 - treeProgress) + 0.18;
  for (let i = 0; i < 81; i++) {
    const a = i * 2.39996 + treeProgress * 14;
    const drift = (i % 11) / 10;
    const orbit = radius * (0.89 + drift * 0.35);
    const elevation = front + ((i % 7) - 2) * 0.075;
    const [x, y] = project(orbit * Math.cos(a), elevation, orbit * Math.sin(a));
    const alpha = opacity * (0.52 + 0.48 * Math.sin(a)) * (1 - drift * 0.54);
    const size = i % 6 === 0 ? 2.1 : 1.1;
    drawing.fillStyle = `rgba(245,230,168,${alpha})`;
    drawing.fillRect(x - size / 2, y - size / 2, size, size);
  }
}

function drawSculpture(treeProgress, starProgress) {
  if (angle === lastSculptureAngle && growth === lastGrowth) return;
  lastSculptureAngle = angle;
  lastGrowth = growth;

  const { width, depth, stamps, occupied, columns, rows, cellWidth, cellHeight,
    cx, cy, scale, tileWidth, tileHeight } = view;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const lights = smooth(progress(growth, ...growthStages.lights));
  const limits = {
    tree: 4.25 * treeProgress,
    lights: lights > 0 ? 0.85 + 3.4 * lights : 0,
    star: 4.17 + 0.57 * starProgress,
    gifts: Infinity,
    deer: 1.3 * smooth(progress(growth, ...growthStages.deer))
  };
  const gifts = Array.from({ length: 6 }, (_, i) => {
    const [first, last] = growthStages.gifts;
    const start = first + (last - first) * i / 10;
    return smooth(progress(growth, start, start + (last - first) / 2));
  });
  const growthGlow = Math.sin(Math.PI * treeProgress);
  sculptureDrawing.clearRect(0, 0, width, view.height);
  depth.fill(-Infinity);
  let used = 0;

  for (const point of sculpture) {
    const limit = limits[point.part];
    if (point.y > limit) continue;
    const rise = point.part === 'gifts' ? gifts[point.group] : 1;
    if (!rise) continue;
    const x = point.x * cos + point.z * sin;
    const z = point.z * cos - point.x * sin;
    const y = point.y * rise - cameraHeight;
    const distance = z * pitchCos + y * pitchSin;
    const unit = scale * cameraDistance / (cameraDistance - distance);
    const column = Math.floor((cx + x * unit) / cellWidth);
    const row = Math.floor((cy - (y * pitchCos - z * pitchSin) * unit) / cellHeight);
    if (column < 0 || column >= columns || row < 0 || row >= rows) continue;
    const cell = row * columns + column;
    if (distance <= depth[cell]) continue;
    if (depth[cell] === -Infinity) occupied[used++] = cell;
    depth[cell] = distance;

    const nx = point.nx * cos + point.nz * sin;
    const nz = point.nz * cos - point.nx * sin;
    const light = nx * -0.24 + nz * 0.18;
    const leadingEdge = point.part === 'tree' ? Math.max(0, 1 - (limit - point.y) * 3) * growthGlow : 0;
    const brightness = point.brightness + light + leadingEdge * 0.26 - (1 - rise) * 0.34;
    const shade = Math.max(0, Math.min(shades - 1, Math.round(brightness * (shades - 1))));
    stamps[cell] = paletteRows[point.palette] * shadesPerRow + shade * GLYPHS.length + point.glyph;
  }

  for (let i = 0; i < used; i++) {
    const cell = occupied[i];
    const stamp = stamps[cell];
    sculptureDrawing.drawImage(atlas, stamp % shadesPerRow * tileWidth, Math.floor(stamp / shadesPerRow) * tileHeight,
      tileWidth, tileHeight, cell % columns * cellWidth, Math.floor(cell / columns) * cellHeight, cellWidth, cellHeight);
  }
}

function setGrowth(value) {
  const wasComplete = growth === 1;
  growth = value;
  growthMeter.value = growth;
  const complete = growth === 1;
  if (complete === wasComplete) return;
  growthMeter.hidden = complete;
  reset.hidden = restart.hidden = !complete;
  dragHint.textContent = complete ? '左右拖动旋转' : '左右拖动，让树长出来';
}

function draw(timestamp) {
  animationFrame = undefined;
  if (!view) return;
  firstFrame ??= timestamp;
  const treeProgress = smooth(progress(growth, ...growthStages.tree));
  const starProgress = smooth(progress(growth, ...growthStages.star));
  if (returnToStart) {
    const t = Math.min(1, (timestamp - returnToStart.time) / 430);
    angle = returnToStart.from + returnToStart.delta * (1 - Math.pow(1 - t, 3));
    if (t === 1) {
      angle = initialAngle;
      returnToStart = undefined;
    }
  }
  const time = motion.matches ? 0 : (timestamp - firstFrame) / 1000;
  drawing.clearRect(0, 0, view.width, view.height);
  drawSnow(drawing, view, time);
  drawing.drawImage(floor, 0, 0, view.width, view.height);
  if (growth > 0) {
    drawStarGlow(starProgress, time);
    drawSculpture(treeProgress, starProgress);
    drawing.drawImage(sculptureLayer, 0, 0, view.width, view.height);
  }
  drawGrowthEffect(treeProgress, time);
  drawSnow(drawing, view, time, true);
  if (!motion.matches || returnToStart) requestDraw();
}

function requestDraw() {
  animationFrame ??= requestAnimationFrame(draw);
}

function turnBy(pixels) {
  if (pixels === 0) return;
  const turnDistance = Math.min(620, Math.max(320, view.width));
  const radiansPerPixel = fullTurn / turnDistance;
  angle = (angle + pixels * radiansPerPixel) % fullTurn;
  if (growth < 1) {
    const growthDistance = turnDistance * 1.15;
    setGrowth(Math.min(1, growth + Math.abs(pixels) / growthDistance));
  }
  requestDraw();
}

scene.addEventListener('pointerdown', (event) => {
  if (drag || event.button !== 0) return;
  returnToStart = undefined;
  drag = { id: event.pointerId, x: event.clientX };
  scene.setPointerCapture(event.pointerId);
  scene.classList.add('is-dragging');
});

scene.addEventListener('pointermove', (event) => {
  if (event.pointerId !== drag?.id || !view) return;
  turnBy(event.clientX - drag.x);
  drag.x = event.clientX;
});

function endDrag(event) {
  if (event.pointerId !== drag?.id) return;
  drag = undefined;
  scene.classList.remove('is-dragging');
}

scene.addEventListener('pointerup', endDrag);
scene.addEventListener('pointercancel', endDrag);
scene.addEventListener('lostpointercapture', endDrag);

scene.addEventListener('keydown', (event) => {
  if (!view || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
  event.preventDefault();
  returnToStart = undefined;
  turnBy(event.key === 'ArrowLeft' ? -22 : 22);
});

restart.addEventListener('click', (event) => {
  angle = initialAngle;
  returnToStart = undefined;
  setGrowth(0);
  if (event.detail === 0) scene.focus({ preventScroll: true });
  requestDraw();
});

reset.addEventListener('click', () => {
  const difference = initialAngle - angle;
  const delta = Math.atan2(Math.sin(difference), Math.cos(difference));
  if (motion.matches || Math.abs(delta) < 0.01) {
    angle = initialAngle;
    returnToStart = undefined;
  } else {
    returnToStart = { from: angle, delta, time: performance.now() };
  }
  requestDraw();
});

new ResizeObserver(resize).observe(scene);
motion.addEventListener('change', requestDraw);
