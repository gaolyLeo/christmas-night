const TAU = Math.PI * 2;

export const STAR_HEIGHT = 4.45;
export const GLYPHS = ['·', '+', '*', '×', 'o', '0', '✦', '▪', ':'];

export const PALETTE = {
  spruce: [[16, 57, 54], [142, 234, 175]],
  frost: [[31, 82, 74], [200, 253, 223]],
  bark: [[30, 25, 33], [151, 104, 73]],
  gold: [[120, 72, 29], [255, 230, 150]],
  ruby: [[73, 23, 49], [255, 116, 127]],
  cyan: [[18, 72, 89], [117, 237, 227]],
  lilac: [[52, 37, 100], [206, 169, 255]],
  cranberry: [[112, 9, 41], [255, 78, 113]],
  amber: [[142, 74, 11], [255, 210, 62]],
  turquoise: [[7, 93, 98], [47, 244, 220]],
  orchid: [[80, 30, 129], [219, 130, 255]],
  ivory: [[77, 111, 122], [248, 249, 224]]
};

const OUTLINE = [
  [0.64, 0.66], [0.71, 1.45], [0.82, 1.72], [0.95, 1.58], [1.42, 1.13],
  [1.49, 1.03], [1.59, 1.41], [1.72, 1.32], [2.13, 0.86],
  [2.20, 0.76], [2.30, 1.11], [2.42, 1.01], [2.81, 0.59],
  [2.87, 0.53], [2.99, 0.78], [3.11, 0.68], [3.42, 0.35],
  [3.48, 0.30], [3.57, 0.46], [3.68, 0.37], [4.21, 0.025]
];

export function seededRandom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function radiusAt(y, angle) {
  const upper = OUTLINE.findIndex(([height]) => height >= y);
  if (upper <= 0) return OUTLINE[upper === 0 ? 0 : OUTLINE.length - 1][1];
  const [start, innerRadius] = OUTLINE[upper - 1];
  const [end, outerRadius] = OUTLINE[upper];
  const radius = innerRadius + (outerRadius - innerRadius) * (y - start) / (end - start);
  const boughs = 1 + 0.09 * Math.sin(5 * angle + 3 * y) + 0.045 * Math.cos(11 * angle - 5 * y);
  return radius * boughs;
}

function inPolygon(x, y, vertices) {
  let inside = false;
  for (let i = 0, previous = vertices.length - 1; i < vertices.length; previous = i++) {
    const [ax, ay] = vertices[i];
    const [bx, by] = vertices[previous];
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside;
  }
  return inside;
}

export function createSculpture() {
  const random = seededRandom(46823);
  const points = [];
  let part = 'tree';
  const add = (x, y, z, palette, brightness, glyph, nx = 0, nz = 0, group = 0) => {
    points.push({ x, y, z, palette, brightness, glyph, nx, nz, part, group });
  };

  for (let y = 0.02; y < 0.89; y += 0.043) {
    for (let i = 0; i < 28; i++) {
      const angle = i / 28 * TAU;
      add(0.15 * Math.cos(angle), y, 0.15 * Math.sin(angle), 'bark',
        0.31 + random() * 0.14, 8, Math.cos(angle), Math.sin(angle));
    }
  }

  for (let y = 0.64; y < 4.22; y += 0.034) {
    const count = Math.max(12, Math.ceil(TAU * radiusAt(y, 0) / 0.037));
    const offset = random() * TAU;
    for (let i = 0; i < count; i++) {
      const angle = i / count * TAU + offset;
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);
      const radius = radiusAt(y, angle) * (0.972 + random() * 0.062);
      const mix = random();
      const glyph = mix < 0.19 ? 0 : mix < 0.48 ? 1 : mix < 0.66 ? 3 : mix < 0.92 ? 7 : 5;
      const ridges = Math.sin(9 * angle + 14 * y) * 0.085 + Math.cos(21 * angle - 8 * y) * 0.065;
      add(radius * nx, y, radius * nz, mix > 0.85 ? 'frost' : 'spruce',
        0.48 + random() * 0.23 + ridges, glyph, nx, nz);
    }
  }

  part = 'lights';
  const lightColors = ['gold', 'gold', 'cyan', 'ruby', 'gold', 'lilac', 'cyan', 'gold'];
  for (let i = 0; i <= 540; i++) {
    const t = i / 540;
    const angle = t * TAU * 4.7 + 1.1;
    const y = 0.87 + t * 3.12 + 0.045 * Math.sin(angle * 2);
    const radius = radiusAt(y, angle) + 0.075;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const palette = lightColors[Math.floor(i / 17) % lightColors.length];
    add(x, y, z, palette, i % 5 === 0 ? 0.96 : 0.69, i % 5 === 0 ? 2 : 0);
    if (i % 13 === 0) add(x * 1.012, y + 0.026, z * 1.012, palette, 0.98, 6);
  }

  const ballColors = ['cranberry', 'amber', 'cranberry', 'turquoise', 'orchid'];
  for (let i = 0; i < 24; i++) {
    const angle = i * 2.39996 + 0.8;
    const y = 0.90 + (i % 8) * 0.385 + random() * 0.15;
    const distance = radiusAt(y, angle) + 0.099;
    const size = 0.081 + random() * 0.037;
    const color = ballColors[i % ballColors.length];
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    for (let ring = 0; ring <= 6; ring++) {
      const latitude = Math.PI * ring / 6;
      for (let j = 0; j < 12; j++) {
        const longitude = TAU * j / 12;
        const nx = Math.cos(longitude) * Math.sin(latitude);
        const nz = Math.sin(longitude) * Math.sin(latitude);
        add(x + size * nx, y + size * Math.cos(latitude), z + size * nz,
          color, 0.74 + 0.19 * Math.cos(latitude), 7, nx, nz);
      }
    }
    add(x, y + size, z, 'gold', 0.98, 6);
  }

  part = 'star';
  const vertices = Array.from({ length: 16 }, (_, i) => {
    const angle = Math.PI / 2 + i * TAU / 16;
    const radius = i % 2 ? 0.082 : (i % 4 === 0 ? 0.265 : 0.148);
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  });
  for (let y = -0.26; y <= 0.265; y += 0.023) {
    for (let u = -0.26; u <= 0.265; u += 0.023) {
      if (!inPolygon(u, y, vertices)) continue;
      const center = Math.hypot(u, y) < 0.085;
      add(u, STAR_HEIGHT + y, 0, center ? 'ivory' : 'gold', 0.99, center ? 6 : 7);
      add(0, STAR_HEIGHT + y, u, center ? 'ivory' : 'gold', 0.99, center ? 6 : 7);
    }
  }

  part = 'gifts';
  addGifts(add);
  part = 'deer';
  addReindeer(add);
  return points;
}

function addGifts(add) {
  const gifts = [
    [-1.33, 0.61, 0.43, 0.49, 'orchid', -0.21],
    [-0.58, 1.35, 0.60, 0.47, 'cranberry', 0.24],
    [0.43, 1.53, 0.35, 0.35, 'amber', -0.18],
    [1.22, 0.63, 0.56, 0.61, 'turquoise', 0.31],
    [1.18, -1.23, 0.48, 0.39, 'orchid', 0.3],
    [-0.64, -1.43, 0.51, 0.55, 'cranberry', -0.20]
  ];

  for (const [group, [x, z, width, height, color, angle]] of gifts.entries()) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ribbonColor = color === 'amber' ? 'ivory' : 'gold';
    const place = (u, y, v, ribbon, brightness, nx = 0, nz = 0) => {
      add(x + u * cos + v * sin, y, z + v * cos - u * sin, ribbon ? ribbonColor : color,
        ribbon ? brightness + 0.27 : brightness, ribbon ? 5 : 7,
        nx * cos + nz * sin, nz * cos - nx * sin, group);
    };
    const half = width / 2;
    const steps = Math.ceil(width / 0.029);
    const rows = Math.ceil(height / 0.029);
    for (let j = 0; j <= rows; j++) {
      const y = 0.04 + j / rows * height;
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps - 0.5) * width;
        const ribbon = Math.abs(u) < 0.05;
        const shade = j / rows > 0.84 ? 0.72 : 0.57;
        place(u, y, half, ribbon, shade, 0, 1);
        place(u, y, -half, ribbon, shade, 0, -1);
        place(half, y, u, ribbon, shade, 1, 0);
        place(-half, y, u, ribbon, shade, -1, 0);
      }
    }
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const u = (i / steps - 0.5) * width;
        const v = (j / steps - 0.5) * width;
        place(u, height + 0.04, v, Math.abs(u) < 0.05 || Math.abs(v) < 0.05, 0.83);
      }
    }
    for (let i = 0; i < 40; i++) {
      const t = i / 40 * TAU;
      for (const side of [-1, 1]) {
        const u = side * Math.min(width * 0.23, 0.10) * (1 - Math.cos(t));
        place(u, height + 0.04 + 0.10 * Math.sin(t / 2), 0.032 * Math.sin(t), true, 0.9);
      }
    }
  }
}

function addReindeer(add) {
  const angle = 0.96;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const place = (x, y, z, brightness = 0.83, glyph = 0) => {
    add(1.79 + (x * cos + z * sin) * 0.89, 0.04 + y * 0.89,
      -0.53 + (z * cos - x * sin) * 0.89, 'ivory', brightness, glyph);
  };
  const line = (from, to, brightness = 0.83) => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    const count = Math.ceil(Math.hypot(dx, dy, dz) / 0.020);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      place(from[0] + dx * t, from[1] + dy * t, from[2] + dz * t, brightness, i % 4 === 0 ? 7 : 1);
    }
  };
  for (let i = 0; i < 20; i++) {
    const t = i / 20 * TAU;
    for (let j = 0; j < 12; j++) {
      const p = j / 12 * TAU;
      place(-0.09 + 0.34 * Math.cos(t), 0.51 + 0.15 * Math.sin(t) * Math.cos(p),
        0.105 * Math.sin(t) * Math.sin(p), 0.71 + 0.20 * Math.cos(p), j % 3 === 0 ? 7 : 1);
    }
  }
  line([-0.41, 0.55, 0], [-0.54, 0.71, 0]);
  line([0.13, 0.42, 0], [0.31, 0.84, 0]);
  line([0.21, 0.59, 0.09], [0.34, 0.92, 0.035]);
  line([0.28, 0.89, 0], [0.51, 0.91, 0]);
  line([0.34, 0.81, 0], [0.51, 0.91, 0]);
  place(0.47, 0.92, 0.025, 0.99, 6);
  for (const side of [-1, 1]) {
    const z = side * 0.085;
    line([-0.30, 0.49, z], [-0.35, 0.26, z * 1.4]);
    line([-0.35, 0.26, z * 1.4], [-0.44 + side * 0.09, 0.02, z * 1.4]);
    line([0.12, 0.49, z], [0.15 + side * 0.11, 0.22, z]);
    line([0.15 + side * 0.11, 0.22, z], [0.19 + side * 0.16, 0.02, z]);
    line([0.34, 0.93, z * 0.4], [0.23, 1.13, z * 1.7]);
    line([0.23, 1.13, z * 1.7], [0.13, 1.36, z * 2.2]);
    line([0.24, 1.11, z * 1.7], [0.39, 1.27, z * 2.1]);
    line([0.18, 1.25, z * 2], [0.03, 1.29, z * 2.4]);
    line([0.27, 0.89, z * 0.4], [0.15, 0.99, z * 1.23]);
  }
}
