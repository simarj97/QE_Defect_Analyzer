import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { Store } from '../store.js';
import { analyze } from '../analyzer.js';
import { MondayClient, mapItem } from '../monday.js';
import { createSync } from '../sync.js';

const defect = {
  id: '1',
  title: 'Bill payment fails after confirmation',
  description: 'Payment blocked',
  steps: 'Submit bill',
  expected: 'Success',
  actual: 'Failure',
  environment: 'QA',
  severity: 'High'
};

test('evidence completeness and duplicate threshold', () => {
  const a = analyze(defect, [defect, { id: '2', title: 'Bill payment error after confirmation' }]);
  assert.equal(a.completeness, 100);
  assert.equal(a.duplicates[0].id, '2');

  const b = analyze({ ...defect, steps: '', environment: '' }, []);
  assert.equal(b.completeness, 60);
  assert.deepEqual(b.missing, ['steps', 'environment']);
  assert.equal(analyze({ ...defect, severity: 'Critical' }, []).suggestedSeverity, 'Critical');
});

test('column IDs override titles; text assignee retained', () => {
  const d = mapItem(
    {
      id: '42',
      name: 'Bug',
      column_values: [
        { id: 'abc', text: 'Step one', column: { title: 'Other title' } },
        { id: 'owner', text: 'Sam', column: { title: 'Assignee' } }
      ]
    },
    { steps: 'abc' }
  );
  assert.equal(d.steps, 'Step one');
  assert.equal(d.assignee, 'Sam');
});

test('paginated reads return all records', async () => {
  let calls = 0;
  const client = new MondayClient({
    token: 'fake',
    boardId: '42',
    fetcher: async () => {
      calls++;
      return Response.json({
        data:
          calls === 1
            ? {
                boards: [
                  {
                    items_page: {
                      cursor: 'next',
                      items: [{ id: '1', name: 'First', column_values: [] }]
                    }
                  }
                ]
              }
            : {
                next_items_page: {
                  cursor: null,
                  items: [{ id: '2', name: 'Second', column_values: [] }]
                }
              }
      });
    }
  });

  assert.equal((await client.items()).length, 2);
  assert.equal(calls, 2);
});

test('GraphQL errors fail without exposing API error data', async () => {
  const client = new MondayClient({
    token: 'fake',
    boardId: '42',
    fetcher: async () => Response.json({ errors: [{ message: 'private details' }] })
  });

  await assert.rejects(
    () => client.items(),
    (e) => !e.message.includes('private details')
  );
});

test('store serializes writes, recovers after failed mutation and persists', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'defectlens-'));
  try {
    const s = new Store(join(dir, 'db.json'));
    await s.init([]);
    await Promise.all(Array.from({ length: 10 }, (_, n) => s.update((v) => v.defects.push({ id: String(n) }))));
    assert.equal(s.read().defects.length, 10);

    await assert.rejects(() =>
      s.update((v) => {
        v.defects = [];
        throw Error('fail');
      })
    );
    assert.equal(s.read().defects.length, 10);

    const s2 = new Store(s.file);
    await s2.init();
    assert.equal(s2.read().defects.length, 10);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('sync coalesces requests, updates existing items, marks removals and preserves publish metadata', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'defectlens-'));
  try {
    const s = new Store(join(dir, 'db.json'));
    await s.init([]);
    let count = 0;
    let items = [
      { ...defect, source: 'monday', mondayId: '1' },
      { id: '2', title: 'Peer', source: 'monday', mondayId: '2' }
    ];

    const sync = createSync(s, {
      items: async () => {
        count++;
        await new Promise((r) => setTimeout(r, 10));
        return structuredClone(items);
      }
    });

    await Promise.all([sync(), sync()]);
    assert.equal(count, 1);

    await s.update((v) => (v.defects[0].publishedHash = 'abc'));
    items = [{ ...items[0], title: 'Updated title' }];
    await sync();

    let result = s.read();
    assert.equal(result.defects.length, 2);
    assert.equal(result.defects[0].title, 'Updated title');
    assert.equal(result.defects[0].publishedHash, 'abc');
    assert.equal(result.defects[1].removedFromBoard, true);
    assert(result.defects[0].analysis);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('browser script parses', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
});

test('monday completeness ignores fields the board never fills; observations flag gaps', () => {
  const a = { id: 'MON-1', source: 'monday', title: 'A', steps: 'x', expected: 'y', severity: 'High', status: 'Done' };
  const b = { id: 'MON-2', source: 'monday', title: 'B', steps: '', expected: 'y', severity: 'Low' };
  const r = analyze(b, [a, b]);
  assert.deepEqual(r.missing, ['steps']);
  assert.equal(r.completeness, 50);
  assert(r.observations.includes('No assignee.'));
  assert(analyze({ ...a, steps: '' }, [{ ...a, steps: '' }]).observations.some((o) => o.includes('no steps')));
});

test('sync records field-level change log, skips baseline load, detects edits to all visible fields', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'defectlens-'));
  try {
    const s = new Store(join(dir, 'db.json'));
    await s.init([]);
    let items = [{ id: 'MON-1', source: 'monday', title: 'T', testCase: 'TC-1', status: 'Open', preconditions: 'p' }];
    const sync = createSync(s, { items: async () => structuredClone(items) });

    await sync();
    assert.equal(s.read().changeLog.length, 0);

    items = [{ ...items[0], status: 'Done', preconditions: 'q' }, { id: 'MON-2', source: 'monday', title: 'N', testCase: 'TC-2' }];
    await sync();
    const log = s.read().changeLog;
    assert(log.some((e) => e.type === 'Updated' && e.field === 'status' && e.from === 'Open' && e.to === 'Done'));
    assert(log.some((e) => e.field === 'preconditions' && e.to === 'q'));
    assert(log.some((e) => e.type === 'Added' && e.item === 'TC-2'));

    items = [items[0]];
    await sync();
    assert(s.read().changeLog.some((e) => e.type === 'Removed' && e.item === 'TC-2'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('xlsx builder produces a zip with all sheets', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const code = script.slice(script.indexOf('const CRC_TABLE'), script.indexOf("$('exportButton').onclick"));
  const build = new Function(code + ';return buildXlsx;')();
  const blob = build([
    { name: 'One', header: ['A', 'B'], widths: [10, 10], rows: [['x & <y>', { v: 'High', s: 3 }], [1, 2]] },
    { name: 'Two', header: ['C'], widths: [10], rows: [] }
  ]);
  const text = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  assert(text.startsWith('PK'));
  for (const name of ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/styles.xml', 'xl/workbook.xml']) {
    assert(text.includes(name), name);
  }
  assert(text.includes('x &amp; &lt;y&gt;'));
});
test('change log detects edits made while the app was stopped (snapshots persist)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'defectlens-'));
  try {
    const s = new Store(join(dir, 'db.json'));
    await s.init([]);
    let items = [{ id: 'MON-1', source: 'monday', title: 'T', testCase: 'TC-1', status: 'Open' }];
    await createSync(s, { items: async () => structuredClone(items) })();

    // Simulate restart: records are wiped, snapshots and log are kept.
    await s.update((v) => {
      v.defects = [];
    });
    items = [{ ...items[0], status: 'Done' }];
    await createSync(s, { items: async () => structuredClone(items) })();
    assert(s.read().changeLog.some((e) => e.field === 'status' && e.from === 'Open' && e.to === 'Done'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('duplicates ignore stop words and use steps/expected; monday items do not persist raw columns', () => {
  const x = { id: '1', title: 'The user can login with the password', steps: 'open page enter password', expected: 'dashboard shown' };
  const y = { id: '2', title: 'Login password with the user', steps: 'open page enter password', expected: 'dashboard shown' };
  const z = { id: '3', title: 'Unrelated export feature', steps: 'click export', expected: 'file saved' };
  const r = analyze(x, [x, y, z]);
  assert.equal(r.duplicates[0].id, '2');
  assert(!r.duplicates.some((d) => d.id === '3'));

  const m = mapItem({ id: '9', name: 'N', column_values: [{ id: 'a', text: 'v', column: { title: 'Status' } }] });
  assert.equal(m.status, 'v');
  assert.equal('rawColumns' in m, false);
});



test('HTTP flow: sample mode, create, analyze, reject cross-origin, persist across restart', async () => {
  const { spawn } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'defectlens-http-'));
  const port = 35000 + Math.floor(Math.random() * 20000);
  let child;

  async function start() {
    child = spawn(process.execPath, ['server.js'], {
      cwd: new URL('../', import.meta.url),
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(port),
        APP_PASSWORD: '',
        MONDAY_API_TOKEN: '',
        MONDAY_BOARD_ID: '',
        DATA_FILE: join(dir, 'db.json')
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('Server startup timed out')), 5000);
      child.stdout.once('data', () => {
        clearTimeout(timeout);
        resolve();
      });
      child.once('exit', (code) => {
        clearTimeout(timeout);
        reject(Error('Server exited ' + code));
      });
    });
  }

  async function stop() {
    if (child && child.exitCode === null) {
      child.kill();
      await new Promise((r) => child.once('exit', r));
    }
  }

  try {
    await start();
    const base = 'http://127.0.0.1:' + port;
    const headers = { 'Content-Type': 'application/json', Origin: base };

    let state = await (await fetch(base + '/api/state')).json();
    assert.equal(state.defects.length, 0);
    assert.equal(state.connection.configured, false);
    assert.equal((await fetch(base)).status, 200);

    const created = await fetch(base + '/api/defects', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'New login failure', severity: 'High' })
    });
    assert.equal(created.status, 201);
    const d = await created.json();

    assert.equal(
      (
        await fetch(base + '/api/analyze', {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: d.id })
        })
      ).status,
      200
    );

    const blocked = await fetch(base + '/api/analyze', {
      method: 'POST',
      headers: { ...headers, Origin: 'https://other.example' },
      body: '{}'
    });
    assert.equal(blocked.status, 403);

    assert.equal(
      (
        await fetch(base + '/api/sync', {
          method: 'POST',
          headers,
          body: '{}'
        })
      ).status,
      503
    );

    await stop();
    await start();
    state = await (await fetch(base + '/api/state')).json();
    assert(state.defects.find((x) => x.id === d.id).analysis);
  } finally {
    await stop();
    await rm(dir, { recursive: true, force: true });
  }
});
