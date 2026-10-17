import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// One id per build, shared by the app and its service worker (see src/lib/update.js).
const BUILD = Date.now().toString(36);

// Writes /sw.js at build time with a fresh version and the list of built files,
// so the app opens instantly (and offline) once it is on the home screen.
function serviceWorker() {
  return {
    name: 'biblos-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((file) => {
        if (file === 'index.html' || file.endsWith('.map')) return false;
        // Only precache the Latin font files; other alphabets load on demand.
        if (/\.(woff2?|ttf)$/.test(file)) return file.endsWith('.woff2') && /-latin-\d/.test(file);
        return true;
      });
      const precache = [
        '/',
        '/manifest.webmanifest',
        '/favicon.svg',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/apple-touch-icon.png',
        ...built.map((file) => `/${file}`),
      ];
      const source = readFileSync(new URL('./src/sw-template.js', import.meta.url), 'utf8')
        .replace('__VERSION__', BUILD)
        .replace('__PRECACHE__', JSON.stringify(precache));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// Runs api/yv.js during `npm run dev`, the same way Vercel runs it once deployed.
function devApi() {
  return {
    name: 'biblos-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/yv', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/yv.js');
        req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };
        res.send = (body) => res.end(body);
        await handler(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker(), devApi()],
  define: { __BUILD__: JSON.stringify(BUILD) },
});
