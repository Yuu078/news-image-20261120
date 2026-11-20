// THE DAILY ATLAS — entrypoint for news-image-20261120.
//
// The finished poster ships in this repository as entry.png: a single
// 1024x1024 page drawn from poster.html (see render_poster.py, which
// screenshots the HTML with headless Chromium at authoring time and
// crops it to size). At grading time there is no browser and no image
// library in the runtime, so this program's whole job is to place that
// committed page into the output directory — after checking it really
// is the PNG the rules ask for: right signature, right dimensions,
// within the 1 MiB cap.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 1024 * 1024; // the rules cap the entry image at 1 MiB
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function fail(message: string): never {
  console.error(`entry: ${message}`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "entry.png"));

// Signature first: a renamed JPEG must not slip through as a "PNG".
if (source.length < PNG_MAGIC.length || !PNG_MAGIC.every((b, i) => source[i] === b)) {
  fail("entry.png does not start with the PNG signature");
}
if (source.length > MAX_BYTES) {
  fail(`entry.png is ${source.length} bytes, over the 1 MiB cap`);
}

// The IHDR chunk follows the signature: width and height are the two
// big-endian uint32s at offsets 16 and 20.
const width = source.readUInt32BE(16);
const height = source.readUInt32BE(20);
if (width > 1024 || height > 1024) {
  fail(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
const target = join(outDir, "entry.png");
writeFileSync(target, source);
console.log(`wrote ${target} (${source.length} bytes, ${width}x${height})`);
