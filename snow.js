import { seededRandom } from './geometry.js';

const random = seededRandom(18419);
const fullTurn = Math.PI * 2;

function makeSprite(crystal) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 48;
  const context = canvas.getContext('2d');
  const center = 24;
  const glow = context.createRadialGradient(center, center, 0, center, center, center);
  glow.addColorStop(0, '#f9fdff');
  glow.addColorStop(0.23, crystal ? '#d7edffd0' : '#e3f2fff0');
  glow.addColorStop(0.46, '#c1e2ff40');
  glow.addColorStop(1, '#a4d3ff00');
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (crystal) {
    context.translate(center, center);
    context.strokeStyle = '#ecf8ff';
    context.lineWidth = 2.35;
    context.lineCap = 'round';
    context.beginPath();
    for (let arm = 0; arm < 6; arm++) {
      context.rotate(fullTurn / 6);
      context.moveTo(0, 0);
      context.lineTo(0, -16);
      context.moveTo(-4, -12.5);
      context.lineTo(0, -8.5);
      context.lineTo(4, -12.5);
    }
    context.stroke();
  }

  return canvas;
}

const dot = makeSprite(false);
const crystal = makeSprite(true);

function makeFlakes(count, near) {
  return Array.from({ length: count }, (_, i) => {
    const detailed = near && i % 5 === 0;
    const size = detailed ? 10 + random() * 6 : near ? 5 + random() * 4 : 3 + random() * 3.5;
    return {
      x: random(), y: random(), size, sprite: detailed ? crystal : dot,
      speed: near ? 27 + random() * 24 : 12 + random() * 10,
      wind: 4 + random() * (near ? 10 : 6),
      sway: 6 + random() * (near ? 19 : 9),
      opacity: near ? 0.52 + random() * 0.37 : 0.29 + random() * 0.36,
      phase: random() * fullTurn
    };
  });
}

const distant = makeFlakes(132, false);
const nearby = makeFlakes(52, true);

export function drawSnow(context, { width, height }, time, near = false) {
  const flakes = near ? nearby : distant;
  const count = Math.min(flakes.length, near ? 23 + Math.round(width / 48) : 51 + Math.round(width / 15));
  const margin = 20;
  const spanX = width + margin * 2;
  const spanY = height + margin * 2;
  for (let i = 0; i < count; i++) {
    const flake = flakes[i];
    const sway = Math.sin(time * 0.85 + flake.phase) * flake.sway;
    const x = ((flake.x * spanX + time * flake.wind + sway) % spanX + spanX) % spanX - margin;
    const y = (flake.y * spanY + time * flake.speed) % spanY - margin;
    context.globalAlpha = flake.opacity * (0.88 + 0.12 * Math.sin(time * 1.2 + flake.phase));
    context.drawImage(flake.sprite, x - flake.size / 2, y - flake.size / 2, flake.size, flake.size);
  }
  context.globalAlpha = 1;
}
