import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('.');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.neon': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg' };
createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.startsWith('/ox-hog-site/')) path = path.slice('/ox-hog-site'.length);
    let file = resolve(root, '.' + path);
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    res.setHeader('Content-Type', (types[extname(file)] || 'application/octet-stream') + (['.html','.js','.css','.neon'].includes(extname(file)) ? '; charset=utf-8' : ''));
    res.setHeader('Cache-Control', 'no-store');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Local site: http://127.0.0.1:4173/ (also /ox-hog-site/)'));
