// Wattle & Sprint: Outrun the Harvest
// A Thanksgiving escape runner, prepared for a clean hand-in.
//
// The game is this directory's game/ folder — plain static files a desktop browser
// loads offline (game/index.html, ES modules, no library and no network request).
// This program copies game/ and screenshots/ beside this file into /output and
// writes /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. Run with: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (gate.json): screenshots 3-4, each under 256 KiB, long side
// <=1280 and short side >=480; game/ under 993 files and 48 MiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

function imageSize(bytes, name) {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.subarray(0, 8).equals(pngSignature)) {
    if (bytes.length < 33 || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') {
      throw new Error(`${name} is a truncated or malformed PNG`);
    }
    let offset = 8;
    let sawIhdr = false, sawIend = false;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      const end = offset + 12 + length;
      if (end > bytes.length) throw new Error(`${name} is a truncated PNG`);
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      if (type === 'IHDR') sawIhdr = true;
      if (type === 'IEND') {
        sawIend = true;
        if (end !== bytes.length) throw new Error(`${name} has data after PNG IEND`);
        break;
      }
      offset = end;
    }
    if (!sawIhdr || !sawIend) throw new Error(`${name} is not a whole PNG`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error(`${name} is not a PNG or JPEG`);
  }
  let offset = 2;
  let dims;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) throw new Error(`${name} has malformed JPEG markers`);
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9) {
      if (!dims) throw new Error(`${name} has no JPEG dimensions`);
      return dims;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    const length = bytes.readUInt16BE(offset);
    if (!dims && marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (length < 7) throw new Error(`${name} has a malformed JPEG frame`);
      dims = { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    if (marker === 0xda) break; // entropy-coded data follows; dims already found
    offset += length;
  }
  if (!dims) throw new Error(`${name} has no JPEG dimensions`);
  return dims;
}

function validateOutput() {
  const errors = [];
  const screenshotsDir = join(out, 'screenshots');
  let n = 0;
  try {
    const entries = readdirSync(screenshotsDir, { withFileTypes: true }).filter(e => e.isFile());
    n = entries.length;
    if (n < 3 || n > 4) errors.push(`screenshots has ${n} files; expected 3-4`);
    for (const entry of entries) {
      const bytes = readFileSync(join(screenshotsDir, entry.name));
      if (bytes.length >= 256 * 1024) errors.push(`${entry.name} is ${bytes.length} bytes; must be under 256 KiB`);
      const { width, height } = imageSize(bytes, entry.name);
      if (Math.max(width, height) > 1280 || Math.min(width, height) < 480) {
        errors.push(`${entry.name} is ${width}x${height}; long side <=1280, short side >=480`);
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  try {
    readFileSync(join(out, 'game', 'index.html'));
  } catch (e) {
    errors.push(`game/index.html missing: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (errors.length) {
    console.error('validateOutput failed:\n  - ' + errors.join('\n  - '));
    process.exit(1);
  }
  console.log(`validateOutput ok: ${n} screenshots, game/, dossier.json`);
}

validateOutput();
console.log(`Wattle & Sprint packed into ${out}`);
