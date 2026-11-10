// Rebuild the local, attributed Poly Haven derivatives from downloaded 2K JPGs.
// Usage: node scripts/prepare-mars-surfaces.mjs <source directory>
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const sharpDirectory = (await readdir("node_modules/.pnpm")).find(name => name.startsWith("sharp@"));
const sharp = require(path.resolve("node_modules/.pnpm", sharpDirectory, "node_modules/sharp"));
const source = process.argv[2];
if (!source) throw new Error("Provide the directory containing the Poly Haven 2K source maps.");
const output = "public/art/mars-surface";
await mkdir(output, { recursive: true });
for (const [id, name] of [["sandy_gravel_02", "sandy-gravel"], ["dry_ground_rocks", "dry-rocky-soil"], ["dark_rock", "fractured-rock"]]) {
  await sharp(path.join(source, `${id}-Diffuse.jpg`)).webp({ quality: 88 }).toFile(`${output}/${name}-color.webp`);
  // 1K relief retains millimetre-scale grain without three extra 2K GPU textures.
  const height = await sharp(path.join(source, `${id}-Displacement.jpg`)).resize(1024,1024).removeAlpha().greyscale().raw().toBuffer();
  const rough = await sharp(path.join(source, `${id}-Rough.jpg`)).resize(1024,1024).removeAlpha().greyscale().raw().toBuffer();
  const packed = Buffer.alloc(height.length * 3);
  for (let i = 0; i < height.length; i++) { packed[i * 3] = height[i]; packed[i * 3 + 1] = rough[i]; packed[i * 3 + 2] = 255; }
  await sharp(packed, { raw: { width: 1024, height: 1024, channels: 3 } }).png({ compressionLevel: 9 }).toFile(`${output}/${name}-relief.png`);
}
// Keep verified source URLs/hashes alongside the distributable derivatives.
await writeFile(`${output}/sources.json`, await readFile(path.join(source, "manifest.json")));
