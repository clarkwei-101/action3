/**
 * Custom Next.js server with WebSocket support for Action3 browser streaming.
 *
 * Usage:
 *   node server.js          # production
 *   node server.js dev      # development
 *
 * Start this instead of `next dev` or `next start`.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.argv.includes('dev');
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname });
const handle = app.getRequestHandler();

// Browser WebSocket setup — imported via dynamic require since the file uses ESM-style imports
let setupBrowserWebSocket;
try {
  // Try ESM import
  import('./src/server/services/browser.ws.ts').then((mod) => {
    setupBrowserWebSocket = mod.setupBrowserWebSocket;
  }).catch(() => {
    console.warn('[WS] Could not load browser.ws.ts module');
  });
} catch {
  console.warn('[WS] WebSocket module not available');
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Attach WebSocket server on /api/ws/browser
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    console.log('[WS] Browser connection opened');
    ws.on('close', () => console.log('[WS] Browser connection closed'));
    ws.on('error', (err) => console.error('[WS] Browser error:', err.message));

    // TODO: wire up browser.ws.ts setupBrowserWebSocket here
    // The module system requires transpilation; for production,
    // use the compiled .js file under .next/server/
    ws.on('message', (msg) => {
      console.log('[WS] Received:', msg.toString().substring(0, 100));
      ws.send(JSON.stringify({ type: 'error', message: 'WebSocket routing not yet configured — use the tRPC /api/cloud endpoint for browser commands' }));
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');
    if (pathname === '/api/ws/browser') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, () => {
    console.log(`\n> Action3 Server ready on http://${hostname}:${port}`);
    console.log(`  WebSocket: ws://${hostname}:${port}/api/ws/browser`);
    console.log(`  Mode: ${dev ? 'development' : 'production'}\n`);
  });
});
