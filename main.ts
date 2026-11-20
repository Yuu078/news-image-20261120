// The World in One Day — entry program for make.fun news-image-20261120.
//
// The poster is drawn ahead of time (poster.html, rendered by
// render_poster.py) and committed to this repository as entry.png.
// This program's whole job is to deliver those exact bytes to the
// output directory the grader names, unchanged, every run.

import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_BYTES = 1_048_576;

function outDir(): string {
  // The grader sets MAKEFUN_OUTPUT_DIR; /output is the documented home.
  return process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = join(here, "entry.png");
  const bytes = readFileSync(source);

  const isPng = PNG_SIGNATURE.every((b, i) => bytes[i] === b);
  if (!isPng) throw new Error("entry.png does not start with a PNG signature");
  if (bytes.length > MAX_BYTES) {
    throw new Error("entry.png exceeds the 1 MiB cap");
  }

  const target = join(outDir(), "entry.png");
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log(`wrote ${target} (${bytes.length} bytes)`);
}

main();
