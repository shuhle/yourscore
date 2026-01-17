/**
 * Development Server
 * Simple HTTP server for local development
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  let filePath = join(SRC_DIR, req.url === '/' ? 'index.html' : req.url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(SRC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  if (!existsSync(filePath)) {
    // Try with .html extension for clean URLs
    if (!extname(filePath) && existsSync(filePath + '.html')) {
      filePath += '.html';
    } else {
      // SPA fallback: serve index.html for non-file routes
      filePath = join(SRC_DIR, 'index.html');
    }
  }

  // Check if it's a directory
  if (statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  // Get MIME type
  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`YourScore dev server running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${SRC_DIR}`);
  console.log('Press Ctrl+C to stop');
});
