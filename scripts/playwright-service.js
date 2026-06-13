/**
 * Playwright Browser Service
 * Standalone Node.js server for browser automation
 * Run: node scripts/playwright-service.js
 *
 * Or connect to existing via PLAYWRIGHT_WS_ENDPOINT env var
 */
import { chromium, firefox, webkit } from 'playwright';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = parseInt(process.env.PLAYWRIGHT_PORT || '9222');
const BROWSER_TYPE = process.env.PLAYWRIGHT_BROWSER_TYPE || 'chromium';

interface BrowserMessage {
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'getHtml' | 'evaluate' | 'close';
  id: string;
  payload?: Record<string, unknown>;
}

interface BrowserSession {
  browser: import('playwright').Browser;
  page: import('playwright').Page;
  ws: WebSocket;
}

const sessions = new Map<string, BrowserSession>();

async function launchBrowser() {
  const browserType = BROWSER_TYPE === 'firefox' ? firefox : BROWSER_TYPE === 'webkit' ? webkit : chromium;
  return browserType.launch({ headless: true });
}

async function handleMessage(session: BrowserSession, msg: BrowserMessage) {
  const { type, id, payload } = msg;
  const send = (data: unknown) => {
    if (session.ws.readyState === WebSocket.OPEN)
      session.ws.send(JSON.stringify({ ...data, id }));
  };

  try {
    switch (type) {
      case 'navigate': {
        const url = payload?.url as string;
        await session.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        send({ type: 'navigated', url, title: await session.page.title() });
        break;
      }
      case 'screenshot': {
        const data = await session.page.screenshot({ encoding: 'base64', type: 'webp' });
        send({ type: 'screenshot', data, title: await session.page.title() });
        break;
      }
      case 'getHtml': {
        const html = await session.page.content();
        send({ type: 'html', html });
        break;
      }
      case 'evaluate': {
        const result = await session.page.evaluate(String(payload?.script ?? ''));
        send({ type: 'evaluated', result });
        break;
      }
      case 'click': {
        await session.page.click(String(payload?.selector ?? ''));
        send({ type: 'clicked', selector: payload?.selector });
        break;
      }
      case 'type': {
        await session.page.fill(String(payload?.selector ?? ''), String(payload?.value ?? ''));
        send({ type: 'typed', selector: payload?.selector });
        break;
      }
      case 'close': {
        await session.page.close();
        send({ type: 'closed' });
        break;
      }
      default:
        send({ type: 'error', error: `Unknown message type: ${type}` });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Playwright] Error handling ${type}:`, message);
    send({ type: 'error', error: message });
  }
}

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', sessions: sessions.size }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const sessionId = url.searchParams.get('session') ?? String(Date.now());
  console.log(`[Playwright] New connection: ${sessionId}`);

  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    sessions.set(sessionId, { browser, page, ws });

    ws.send(JSON.stringify({ type: 'connected', sessionId }));

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString()) as BrowserMessage;
        await handleMessage(sessions.get(sessionId)!, msg);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON message' }));
      }
    });

    ws.on('close', async () => {
      console.log(`[Playwright] Session closed: ${sessionId}`);
      await page.close().catch(() => {});
      await browser.close().catch(() => {});
      sessions.delete(sessionId);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Playwright] Failed to launch browser:`, message);
    ws.send(JSON.stringify({ type: 'error', error: message }));
    ws.close();
  }
});

server.listen(PORT, () => {
  console.log(`[Playwright] Browser service running on ws://localhost:${PORT}`);
  console.log(`[Playwright] Browser type: ${BROWSER_TYPE}`);
});

process.on('SIGTERM', async () => {
  console.log('[Playwright] Shutting down...');
  for (const [id, session] of sessions) {
    await session.browser.close().catch(() => {});
  }
  server.close();
  process.exit(0);
});
