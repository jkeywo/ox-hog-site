import { cp, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Copy public files byte-for-byte. This is packaging, not a site build.
export const publicFiles = ['index.html', 'games.neon', 'scripts', 'styles', 'logos', 'images', 'photos'];
const output = resolve('.site');
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error('.site must be empty before packaging; choose a fresh checkout or remove this generated directory.');
for (const path of publicFiles) await cp(path, resolve(output, path), { recursive: true });
console.log(`Copied public site files to ${output}`);
