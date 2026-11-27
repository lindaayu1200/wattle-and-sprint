// Package Wattle & Sprint for review.
//
// The script copies the game and screenshots, creates the dossier from the
// packaged files, and validates that same package before reporting success.
// MAKEFUN_OUTPUT_DIR selects the destination; the runner defaults to /output.

/*
 * VISUAL / DESIGN NOTE
 * Three connected biomes carry the run from farmyard to cornfield to kitchen.
 * A shifting sky gives the route time and place, while feather particles add
 * energy to each flap and impact. Synth audio completes the bright arcade feel.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameSource = join(projectRoot, 'game');
const screenshotSource = join(projectRoot, 'screenshots');
const screenshotDestination = join(destination, 'screenshots');

mkdirSync(destination, { recursive: true });
cpSync(gameSource, join(destination, 'game'), { recursive: true });
mkdirSync(screenshotDestination, { recursive: true });
if (existsSync(screenshotSource)) {
  cpSync(screenshotSource, screenshotDestination, { recursive: true });
}

// Keep the dossier limits aligned with the package checks: no more than four
// screenshots, less than 256 KiB per image, and the established game limits.
writeFileSync(
  join(destination, 'dossier.json'),
  buildDossier(destination, {
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
    if (
      bytes.length < 33 ||
      bytes.readUInt32BE(8) !== 13 ||
      bytes.toString('ascii', 12, 16) !== 'IHDR'
    ) {
      throw new Error(`${name} is a truncated or malformed PNG`);
    }

    let offset = 8;
    let hasHeader = false;
    let hasEnd = false;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset);
      const end = offset + 12 + length;
      if (end > bytes.length) throw new Error(`${name} is a truncated PNG`);
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      if (type === 'IHDR') hasHeader = true;
      if (type === 'IEND') {
        hasEnd = true;
        if (end !== bytes.length) throw new Error(`${name} has data after PNG IEND`);
        break;
      }
      offset = end;
    }
    if (!hasHeader || !hasEnd) throw new Error(`${name} is not a whole PNG`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error(`${name} is not a PNG or JPEG`);
  }

  let offset = 2;
  let dimensions;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) throw new Error(`${name} has malformed JPEG markers`);
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9) {
      if (!dimensions || offset !== bytes.length) throw new Error(`${name} is not a whole JPEG`);
      return dimensions;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) throw new Error(`${name} has a truncated JPEG segment`);
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) {
      throw new Error(`${name} has a malformed JPEG segment`);
    }
    if (
      !dimensions &&
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      if (length < 7) throw new Error(`${name} has a malformed JPEG frame`);
      dimensions = {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += length;
    if (marker === 0xda) {
      const endMarker = bytes.indexOf(Buffer.from([0xff, 0xd9]), offset);
      if (!dimensions || endMarker !== bytes.length - 2) {
        throw new Error(`${name} is not a whole JPEG`);
      }
      return dimensions;
    }
  }
  throw new Error(`${name} is not a whole JPEG`);
}

function validateOutput() {
  const errors = [];
  let screenshotCount = 0;
  try {
    const files = readdirSync(screenshotDestination, { withFileTypes: true }).filter((entry) => entry.isFile());
    screenshotCount = files.length;
    if (screenshotCount < 3 || screenshotCount > 4) {
      errors.push(`screenshots has ${screenshotCount} files; expected 3-4`);
    }
    for (const file of files) {
      const image = readFileSync(join(screenshotDestination, file.name));
      if (image.length >= 256 * 1024) {
        errors.push(`${file.name} is ${image.length} bytes; must be under 256 KiB`);
      }
      const { width, height } = imageSize(image, file.name);
      if (Math.max(width, height) > 1280 || Math.min(width, height) < 480) {
        errors.push(`${file.name} is ${width}x${height}; long side <=1280, short side >=480`);
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  try {
    readFileSync(join(destination, 'game', 'index.html'));
  } catch (error) {
    errors.push(`game/index.html missing: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (errors.length) {
    console.error('validateOutput failed:\n  - ' + errors.join('\n  - '));
    process.exit(1);
  }
  console.log(`validateOutput ok: ${screenshotCount} screenshots, game/, dossier.json`);
}

validateOutput();
console.log(`Wattle & Sprint packed into ${destination}`);
