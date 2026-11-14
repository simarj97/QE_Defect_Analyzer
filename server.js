import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { Store } from './store.js';
import { analyze } from './analyzer.js';
import { MondayClient } from './monday.js';
import { createSync } from './sync.js';
import { createApp } from './src/app.js';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4000);
const password = process.env.APP_PASSWORD || '';

if (!['127.0.0.1', 'localhost'].includes(host) && password.length < 16) {
  throw Error('Set APP_PASSWORD to at least 16 characters before binding to a network interface.');
}

let columnMap;
try {
  columnMap = JSON.parse(process.env.MONDAY_COLUMN_MAP || '{}');
} catch {
  throw Error('MONDAY_COLUMN_MAP must be valid JSON.');
}

const monday = new MondayClient({
  token: process.env.MONDAY_API_TOKEN,
  boardId: process.env.MONDAY_BOARD_ID,
  version: process.env.MONDAY_API_VERSION || '2026-10',
  columnMap
});

const connected = !!(monday.token && monday.boardId);
const interval = Math.max(30, Number(process.env.SYNC_INTERVAL_SECONDS) || 60);

const store = new Store(resolve(process.env.DATA_FILE || 'data/defects.json'));
await store.init([]);
if (connected) {
  // monday.com is the source of truth: discard cached records on startup and reload them fresh.
  await store.update((s) => {
    s.defects = s.defects
      .filter((d) => d.source === 'monday' && d.publishedHash)
      .map(({ id, source, mondayId, publishedHash, publishedAt, updateId }) => ({
        id,
        source,
        mondayId,
        removedFromBoard: true,
        publishedHash,
        publishedAt,
        updateId
      }));
    s.sync = { lastSuccess: null, lastError: null };
  });
}
await store.update((s) => {
  s.defects = s.defects.filter((d) => d.source !== 'sample' && d.title !== 'ABC' && d.id !== 'SC-007');
  for (const d of s.defects) {
    if (d.analysis?.duplicates) {
      d.analysis.duplicates = d.analysis.duplicates.filter((dup) => dup.id !== 'DEMO-101' && dup.id !== 'DEMO-102' && dup.id !== 'SC-007');
    }
  }
});
const sync = createSync(store, monday);

// Initialize multi-project platform application
const { app: expressApp } = await createApp({
  dbPath: process.env.DB_FILE || './data/defectlens_db.json'
});

// HTML resolution: serve Vite React SPA if built, else fallback
const distHtmlPath = fileURLToPath(new URL('./public/dist/index.html', import.meta.url));
const legacyHtmlPath = fileURLToPath(new URL('./public/index.html', import.meta.url));

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

async function body(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 10 * 1024 * 1024) {
      throw Error('Request too large.');
    }
  }
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw Error('Invalid JSON.');
  }
}

const same = (a, b) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

let publishing = false;

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');

  try {
    const expectedHost =
      host === '0.0.0.0' || host === '::'
        ? null
        : new Set([host + ':' + port, 'localhost:' + port, '127.0.0.1:' + port]);

    if (expectedHost && !expectedHost.has(req.headers.host)) {
      json(res, 403, { error: 'Invalid host' });
      return;
    }

    if (password) {
      const encoded = req.headers.authorization?.startsWith('Basic ')
        ? req.headers.authorization.slice(6)
        : '';
      const auth = Buffer.from(encoded, 'base64').toString();
      if (!same(auth, 'admin:' + password)) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="DefectLens"' });
        res.end('Authentication required');
        return;
      }
    }

    const url = new URL(req.url, 'http://localhost');

    // Origin checks for POST requests on legacy defect endpoints
    if (req.method !== 'GET' && !url.pathname.startsWith('/api/v1/automation')) {
      if (
        req.headers.origin &&
        req.headers.origin !== 'http://' + req.headers.host &&
        req.headers.origin !== 'https://' + req.headers.host
      ) {
        json(res, 403, { error: 'Same-origin browser request required.' });
        return;
      }
      if (!req.headers['content-type']?.startsWith('application/json')) {
        json(res, 415, { error: 'Use application/json' });
        return;
      }
    }

    // Serve Static UI Assets
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const targetHtml = existsSync(distHtmlPath) ? distHtmlPath : legacyHtmlPath;
      const html = await readFile(targetHtml);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/assets/')) {
      const assetPath = resolve(fileURLToPath(new URL('./public/dist' + url.pathname, import.meta.url)));
      if (existsSync(assetPath)) {
        const content = await readFile(assetPath);
        const contentType = assetPath.endsWith('.js')
          ? 'application/javascript'
          : assetPath.endsWith('.css')
          ? 'text/css'
          : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' });
        res.end(content);
        return;
      }
    }

    // --- Legacy Endpoints for DefectLens Backwards Compatibility ---
    if (req.method === 'GET' && url.pathname === '/api/state') {
      json(res, 200, {
        ...store.read(),
        connection: { configured: connected, intervalSeconds: interval }
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/sync') {
      if (!connected) {
        json(res, 503, { error: 'Add MONDAY_API_TOKEN and MONDAY_BOARD_ID to .env and restart.' });
        return;
      }
      json(res, 200, await sync());
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/defects' && !url.searchParams.get('projectId')) {
      const b = await body(req);
      if (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 200) {
        json(res, 400, { error: 'Title required (1–200 characters).' });
        return;
      }

      const customId = typeof b.scenarioId === 'string' && b.scenarioId.trim() ? b.scenarioId.trim() : null;
      const d = { id: customId || ('SC-' + randomUUID().slice(0, 4).toUpperCase()), source: 'local' };
      for (const k of [
        'title',
        'scenarioTitle',
        'scenarioId',
        'category',
        'risk',
        'acRefs',
        'testCase',
        'description',
        'steps',
        'expected',
        'actual',
        'environment',
        'component',
        'severity'
      ]) {
        d[k] = typeof b[k] === 'string' ? b[k].trim().slice(0, 10000) : '';
      }
      if (!d.title && d.scenarioTitle) d.title = d.scenarioTitle;
      if (!d.scenarioTitle && d.title) d.scenarioTitle = d.title;
      if (!d.scenarioId) d.scenarioId = d.id;
      if (!d.risk && d.severity) d.risk = d.severity;
      if (!d.severity && d.risk) d.severity = d.risk;
      if (!['Critical', 'High', 'Medium', 'Low'].includes(d.severity)) {
        d.severity = 'Medium';
        d.risk = 'Medium';
      }
      if (!d.category) d.category = 'positive';

      await store.update((s) => {
        s.defects.unshift(d);
        for (const x of s.defects) {
          if (x.analysis) {
            x.analysis = analyze(x, s.defects);
          }
        }
      });
      json(res, 201, d);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/update-risk') {
      const { id, risk, category } = await body(req);
      if (!id || !store.read().defects.some((d) => d.id === id)) {
        json(res, 404, { error: 'Scenario not found' });
        return;
      }

      await store.update((s) => {
        const item = s.defects.find((d) => d.id === id);
        if (item) {
          if (risk && ['Critical', 'High', 'Medium', 'Low'].includes(risk)) {
            item.risk = risk;
            item.severity = risk;
          }
          if (category) {
            item.category = category;
          }
          if (item.analysis) {
            item.analysis = analyze(item, s.defects);
          }
        }
      });
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/analyze') {
      const { id } = await body(req);
      if (id && !store.read().defects.some((d) => d.id === id)) {
        json(res, 404, { error: 'Defect not found' });
        return;
      }

      await store.update((s) => {
        for (const d of s.defects) {
          if (!d.removedFromBoard && (!id || d.id === id)) {
            d.analysis = analyze(d, s.defects);
          }
        }
      });
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/publish') {
      if (publishing) {
        json(res, 409, { error: 'A publish is already in progress. Wait before retrying.' });
        return;
      }
      publishing = true;
      try {
        const { id } = await body(req);
        const d = store.read().defects.find((d) => d.id === id);
        if (!connected || !d?.mondayId || !d.analysis || d.removedFromBoard) {
          json(res, 400, { error: 'Select an analyzed, active monday.com defect.' });
          return;
        }

        const stable = { ...d.analysis };
        delete stable.analyzedAt;
        const hash = createHash('sha256').update(JSON.stringify(stable)).digest('hex');

        if (d.publishedHash === hash) {
          json(res, 200, { ok: true, alreadyPublished: true });
          return;
        }

        const result = await monday.publish(d.mondayId, d.analysis);
        await store.update((s) => {
          const current = s.defects.find((x) => x.id === id);
          current.publishedHash = hash;
          current.publishedAt = new Date().toISOString();
          current.updateId = result.create_update.id;
        });
        json(res, 200, { ok: true });
        return;
      } finally {
        publishing = false;
      }
    }

    // Pass everything else to the Multi-Project Express App
    expressApp(req, res);
  } catch (e) {
    json(res, req.url === '/api/sync' || req.url === '/api/publish' ? 502 : 400, { error: e.message });
  }
});

if (connected) {
  try {
    await sync();
  } catch (e) {
    console.error('Initial sync:', e.message);
  }
}

server.listen(port, host, () => {
  console.log(
    `DefectLens AI QA Studio: http://${host}:${port} (${
      connected ? 'monday.com polling every ' + interval + ' seconds' : 'sample/local mode'
    })`
  );
});

let timer;
if (connected) {
  const tick = () => sync().catch((e) => console.error('Sync:', e.message));
  timer = setInterval(tick, interval * 1000);
  timer.unref();
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    clearInterval(timer);
    server.close(() => process.exit(0));
  });
}
