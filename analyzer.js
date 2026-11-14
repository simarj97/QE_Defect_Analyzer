const DEFAULT_REQUIRED = ['description', 'steps', 'expected', 'actual', 'environment'];

// Optional .env overrides: ANALYZER_REQUIRED_FIELDS="steps,expected" and ANALYZER_BLOCKER_REGEX="cannot log|payment.*fail".
const REQUIRED_FIELDS = process.env.ANALYZER_REQUIRED_FIELDS
  ? process.env.ANALYZER_REQUIRED_FIELDS.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_REQUIRED;

let BLOCKER;
try {
  BLOCKER = new RegExp(process.env.ANALYZER_BLOCKER_REGEX || 'cannot log|login.*(fail|never)|payment.*(fail|blocked)', 'i');
} catch {
  throw Error('ANALYZER_BLOCKER_REGEX must be a valid regular expression.');
}

const STOP = new Set(['the', 'and', 'for', 'with', 'not', 'are', 'was', 'when', 'after', 'from', 'that', 'this', 'user', 'can', 'should']);

const tokens = (s) =>
  new Set((String(s || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((w) => !STOP.has(w)));

const jaccard = (a, b) => {
  const inter = [...a].filter((w) => b.has(w)).length;
  return (100 * inter) / Math.max(1, new Set([...a, ...b]).size);
};

export function analyze(defect, all) {
  // For monday.com items, only require fields that at least one record on the board actually fills in.
  // Otherwise fields with no matching board column would make every item look incomplete.
  const required =
    defect.source === 'monday'
      ? REQUIRED_FIELDS.filter((k) => all.some((d) => d.source === 'monday' && !d.removedFromBoard && String(d[k] || '').trim()))
      : REQUIRED_FIELDS;
  const missing = required.filter((k) => !String(defect[k] || '').trim());
  const a = tokens(defect.title);
  const content = (d) => tokens((d.steps || '') + ' ' + (d.expected || ''));
  const ac = content(defect);

  // Title similarity, blended with steps/expected similarity when both records have that text.
  const duplicates = all
    .filter((d) => d.id !== defect.id && !d.removedFromBoard)
    .map((d) => {
      const bc = content(d);
      const title = jaccard(a, tokens(d.title));
      const similarity = ac.size && bc.size ? 0.7 * title + 0.3 * jaccard(ac, bc) : title;
      return { id: d.id, title: d.title, similarity: Math.round(similarity) };
    })
    .filter((d) => d.similarity >= 25)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  const blocker = BLOCKER.test(defect.title + ' ' + defect.description);

  const observations = [];
  const sev = String(defect.severity || defect.priority || '').toLowerCase();
  if (!String(defect.assignee || '').trim()) observations.push('No assignee.');
  if (sev === 'critical' || sev === 'high') {
    if (!String(defect.steps || '').trim()) observations.push('High-impact item has no steps.');
    if (!String(defect.expected || '').trim()) observations.push('High-impact item has no expected result.');
  }
  if (String(defect.status || '').toLowerCase() === 'done' && missing.length) {
    observations.push('Marked Done but evidence is incomplete: ' + missing.join(', ') + '.');
  }
  if (duplicates[0]?.similarity >= 60) observations.push('Very similar to ' + duplicates[0].id + '.');

  return {
    engine: 'rules-v2',
    completeness: required.length
      ? Math.round((100 * (required.length - missing.length)) / required.length)
      : 100,
    missing,
    duplicates,
    suggestedSeverity: defect.severity === 'Critical' ? 'Critical' : blocker ? 'High' : defect.severity || 'Medium',
    severityReason: blocker
      ? 'Title or description suggests a blocked login or payment flow; verify impact.'
      : 'Retained the reported severity; no blocking-flow rule matched.',
    observations,
    rootCause: 'Not established. Investigate logs and reproduction evidence.',
    reviewRequired: true,
    analyzedAt: new Date().toISOString()
  };
}
