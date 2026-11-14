import { createHash } from 'node:crypto';

export function computeRequirementsFingerprint(reqContent) {
  return createHash('sha256').update(String(reqContent || '').trim()).digest('hex');
}

export function detectRequirementsDiff(oldParsedItems = [], newParsedItems = []) {
  const added = [];
  const modified = [];
  const removed = [];

  const oldMap = new Map(oldParsedItems.map((item) => [item.id || item.title, item]));
  const newMap = new Map(newParsedItems.map((item) => [item.id || item.title, item]));

  for (const [key, newItem] of newMap.entries()) {
    if (!oldMap.has(key)) {
      added.push(newItem);
    } else {
      const oldItem = oldMap.get(key);
      const isChanged =
        oldItem.description !== newItem.description ||
        oldItem.title !== newItem.title ||
        JSON.stringify(oldItem.acceptanceCriteria) !== JSON.stringify(newItem.acceptanceCriteria);
      if (isChanged) {
        modified.push({
          id: newItem.id,
          title: newItem.title,
          oldDescription: oldItem.description,
          newDescription: newItem.description,
          oldAc: oldItem.acceptanceCriteria,
          newAc: newItem.acceptanceCriteria
        });
      }
    }
  }

  for (const [key, oldItem] of oldMap.entries()) {
    if (!newMap.has(key)) {
      removed.push(oldItem);
    }
  }

  return { added, modified, removed, hasChanges: added.length > 0 || modified.length > 0 || removed.length > 0 };
}

// Flags test cases whose referenced requirement was modified or removed
export function flagImpactedTestCases(testCases = [], diff) {
  const modifiedReqIds = new Set([
    ...diff.modified.map((m) => m.id),
    ...diff.modified.map((m) => m.title),
    ...diff.removed.map((r) => r.id),
    ...diff.removed.map((r) => r.title)
  ]);

  const flagged = [];

  for (const tc of testCases) {
    const refs = Array.isArray(tc.req_refs) ? tc.req_refs : JSON.parse(tc.req_refs || '[]');
    const isImpacted = refs.some((ref) => modifiedReqIds.has(ref));

    if (isImpacted && tc.review_status !== 'Needs Review') {
      flagged.push({
        ...tc,
        review_status: 'Needs Review',
        review_reason: `Parent requirement modified or removed in recent specification update.`
      });
    }
  }

  return flagged;
}
