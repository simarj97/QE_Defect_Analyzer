import { analyze } from './analyzer.js';
import { createHash } from 'node:crypto';

const TRACKED = [
  'title',
  'testCase',
  'scenarioId',
  'defectId',
  'testCaseTitle',
  'description',
  'preconditions',
  'steps',
  'expected',
  'actual',
  'environment',
  'component',
  'severity',
  'status',
  'assignee',
  'date'
];

const MAX_LOG = 1000;

export const fingerprint = (d) =>
  createHash('sha256')
    .update(JSON.stringify(TRACKED.map((k) => d[k])))
    .digest('hex');

const label = (d) => d.testCase || d.title || d.id;

export function createSync(store, monday) {
  let running = null;

  return function sync() {
    if (running) return running;

    running = (async () => {
      try {
        const incoming = await monday.items();
        const result = await store.update((state) => {
          let added = 0;
          let changed = 0;
          const seen = new Set(incoming.map((d) => d.id));
          const at = new Date().toISOString();
          const log = (state.changeLog ||= []);
          // Snapshots of tracked fields survive restarts (records are reloaded fresh at startup),
          // so edits made while the app was off are still detected on the first sync.
          const snaps = (state.snapshots ||= {});
          // Very first sync ever only loads data; don't log every item as "added".
          const baseline = Object.keys(snaps).length === 0 && !state.defects.some((x) => x.source === 'monday' && x.title);

          for (const d of incoming) {
            const prev = snaps[d.id];
            if (!prev) {
              if (!baseline) log.push({ at, id: d.id, item: label(d), type: 'Added', field: '', from: '', to: '' });
            } else {
              for (const k of TRACKED) {
                const now = String(d[k] ?? '');
                if (prev[k] !== now) {
                  log.push({ at, id: d.id, item: label(d), type: 'Updated', field: k, from: prev[k], to: now });
                }
              }
            }
            snaps[d.id] = { item: label(d), ...Object.fromEntries(TRACKED.map((k) => [k, String(d[k] ?? '')])) };

            const old = state.defects.find((x) => x.id === d.id);
            if (!old) {
              state.defects.push(d);
              added++;
            } else {
              if (fingerprint(old) !== fingerprint(d) || old.removedFromBoard) {
                changed++;
              }
              Object.assign(old, d);
              old.removedFromBoard = false;
            }
          }

          for (const id of Object.keys(snaps)) {
            if (!seen.has(id)) {
              log.push({ at, id, item: snaps[id].item, type: 'Removed', field: '', from: '', to: '' });
              delete snaps[id];
            }
          }

          for (const d of state.defects) {
            if (d.source === 'monday' && !seen.has(d.id)) {
              d.removedFromBoard = true;
            }
          }

          if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);

          // Recompute duplicates across all active records, including when a new peer arrives.
          for (const d of state.defects) {
            if (!d.removedFromBoard) {
              d.analysis = analyze(d, state.defects);
            }
          }

          state.sync = {
            lastSuccess: new Date().toISOString(),
            lastError: null,
            added,
            changed
          };
          return state.sync;
        });

        return result;
      } catch (e) {
        await store.update((s) => {
          s.sync.lastError = e.message;
        });
        throw e;
      }
    })().finally(() => {
      running = null;
    });

    return running;
  };
}
