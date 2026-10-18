// Generates placeholder Sentinel-1-style before/after SAR tiles for the hero fields.
// Replace public/sat/*.png with real Copernicus Browser exports when available (same names).
// Run: npx tsx scripts/gen-sat.ts
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SIZE = 512;
const BOX = { x: 176, y: 176, w: 160, h: 160 };
const FIELDS: Record<string, number> = { h1: 90, h2: 35, h3: 5, h4: 85, h5: 80, h6: 75, h7: 85, h8: 70, h9: 80, h10: 10 };

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise in 0..1 so flood edges look organic. */
function valueNoise(rand: () => number, cell: number) {
  const n = Math.ceil(SIZE / cell) + 2;
  const grid = Array.from({ length: n * n }, rand);
  const at = (gx: number, gy: number) => grid[gy * n + gx];
  return (x: number, y: number) => {
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    const fx = (x % cell) / cell, fy = (y % cell) / cell;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = at(gx, gy) * (1 - sx) + at(gx + 1, gy) * sx;
    const bot = at(gx, gy + 1) * (1 - sx) + at(gx + 1, gy + 1) * sx;
    return top * (1 - sy) + bot * sy;
  };
}

function render(seed: number, floodedPct: number | null) {
  const rand = rng(seed);
  const texture = valueNoise(rng(seed + 1), 24); // field parcels, shared by before/after
  const flood = valueNoise(rng(seed + 2), 64);
  const px = Buffer.alloc(SIZE * SIZE);

  // Pick the flood threshold so roughly floodedPct of the box is under water.
  let threshold = -1;
  if (floodedPct !== null) {
    const samples: number[] = [];
    for (let y = BOX.y; y < BOX.y + BOX.h; y += 2) for (let x = BOX.x; x < BOX.x + BOX.w; x += 2) samples.push(flood(x, y));
    samples.sort((a, b) => a - b);
    threshold = samples[Math.min(samples.length - 1, Math.floor((floodedPct / 100) * samples.length))];
    if (floodedPct === 0) threshold = -1;
  }
  const river = (x: number) => 60 + 30 * Math.sin(x / 70);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const speckle = (rand() - 0.5) * 70;
      let v = 95 + texture(x, y) * 70 + speckle; // vegetation: mid-grey, textured
      if (Math.abs(y - river(x)) < 9) v = 18 + rand() * 18; // permanent river
      if (threshold >= 0 && flood(x, y) <= threshold) v = 12 + rand() * 22; // open water: very dark
      px[y * SIZE + x] = Math.max(0, Math.min(255, v));
    }
  }
  return px;
}

function overlay(label: string) {
  return Buffer.from(`<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" fill="none" stroke="#facc15" stroke-width="3"/>
  <rect x="0" y="${SIZE - 28}" width="${SIZE}" height="28" fill="rgba(0,0,0,0.6)"/>
  <text x="10" y="${SIZE - 9}" font-family="monospace" font-size="14" fill="#fff">${label}</text>
  <text x="${SIZE - 10}" y="20" text-anchor="end" font-family="monospace" font-size="12" fill="#f87171">DEMO PLACEHOLDER</text>
</svg>`);
}

async function main() {
  const out = path.join(process.cwd(), "public", "sat");
  await mkdir(out, { recursive: true });
  let seed = 1000;
  for (const [id, pct] of Object.entries(FIELDS)) {
    seed += 17;
    for (const phase of ["before", "after"] as const) {
      const raw = render(seed, phase === "after" ? pct : null);
      const file = path.join(out, `fld-${id}-${phase}.png`);
      await sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 1 } })
        .composite([{ input: overlay(`Sentinel-1 VV · fld-${id} · ${phase.toUpperCase()}`) }])
        .png()
        .toFile(file);
      console.log("wrote", path.relative(process.cwd(), file));
    }
  }
}

main();
