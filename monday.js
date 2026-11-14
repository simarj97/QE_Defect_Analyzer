export class MondayClient {
  constructor({ token, boardId, version = '2026-10', columnMap = {}, fetcher = fetch }) {
    Object.assign(this, { token, boardId, version, columnMap, fetcher });
  }

  async request(query, variables) {
    if (!this.token || !/^\d+$/.test(this.boardId || '')) {
      throw Error('Configure MONDAY_API_TOKEN and numeric MONDAY_BOARD_ID in .env.');
    }

    // Only retry reads: blindly retrying a timed-out mutation can create duplicate updates.
    const tries = query.trim().startsWith('mutation') ? 1 : 3;

    for (let n = 0; n < tries; n++) {
      let r;
      try {
        r = await this.fetcher('https://api.monday.com/v2', {
          method: 'POST',
          headers: {
            Authorization: this.token,
            'Content-Type': 'application/json',
            'API-Version': this.version
          },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(20000)
        });
      } catch {
        if (n + 1 < tries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (n + 1)));
          continue;
        }
        throw Error('monday.com network timeout or connection failure.');
      }

      if ((r.status === 429 || r.status >= 500) && n + 1 < tries) {
        const retry = Number(r.headers.get('retry-after'));
        const delay = Math.min(30000, Number.isFinite(retry) && retry > 0 ? retry * 1000 : 1000 * 2 ** n);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      let j;
      try {
        j = await r.json();
      } catch {
        throw Error('monday.com returned an invalid response.');
      }

      if (!r.ok || j.errors?.length) {
        throw Error(
          'monday.com rejected the request. Check API version, token, board access, column mapping and rate limits.'
        );
      }

      return j.data;
    }
  }

  async items() {
    const fields = 'id name updated_at column_values { id text column { title } }';
    const data = await this.request(
      `query($ids:[ID!]!){boards(ids:$ids){items_page(limit:100){cursor items{${fields}}}}}`,
      { ids: [this.boardId] }
    );

    if (!data?.boards?.length) {
      throw Error('Board not found or access denied.');
    }

    let page = data.boards[0].items_page;
    const items = [...page.items];
    const seen = new Set();

    while (page.cursor) {
      if (seen.has(page.cursor)) {
        throw Error('Repeated pagination cursor; sync aborted.');
      }
      seen.add(page.cursor);

      const next = await this.request(
        `query($cursor:String!){next_items_page(limit:100,cursor:$cursor){cursor items{${fields}}}}`,
        { cursor: page.cursor }
      );
      page = next.next_items_page;
      items.push(...page.items);
    }

    return items.map((i) => mapItem(i, this.columnMap));
  }

  async publish(itemId, analysis) {
    const body =
      'DefectLens rule-based findings — human review required\n' + JSON.stringify(analysis, null, 2);
    const escaped = body.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    return this.request(
      'mutation($id:ID!,$body:String!){create_update(item_id:$id,body:$body){id}}',
      { id: itemId, body: escaped }
    );
  }
}

const titles = {
  description: ['description', 'scenario description', 'defect description', 'notes', 'defect id', 'defect'],
  scenarioId: ['scenario id', 'scenario', 'sc id', 'scenario_id', 'scneario - id', 'scenario - id', 'scneario id', 'scneario'],
  defectId: ['defect id', 'defect title', 'defect', 'scenario title'],
  testCaseTitle: ['test case title', 'scenario title', 'test title'],
  testCase: ['test case id', 'test case', 'testcase', 'tc'],
  priority: ['priority', 'priority ⚠️', 'priority ⚠️️', 'severity', 'risk'],
  risk: ['priority', 'risk', 'severity'],
  preconditions: ['preconditions', 'precondition', 'pre-conditions'],
  steps: ['steps summary', 'steps to reproduce', 'steps'],
  expected: ['expected result', 'expected', 'expected results'],
  actual: ['actual result', 'actual', 'actual results'],
  environment: ['environment', 'environment / build', 'build'],
  component: ['component', 'ac refs', 'ac ref', 'ac'],
  severity: ['priority', 'severity', 'risk'],
  status: ['status', 'defect status', 'state'],
  assignee: ['person', 'assignee', 'owner', 'people'],
  date: ['date', 'due date', 'created date']
};

export function normalizePriority(str) {
  const s = String(str || '').toLowerCase();
  if (s.includes('crit')) return 'Critical';
  if (s.includes('high')) return 'High';
  if (s.includes('med')) return 'Medium';
  if (s.includes('low')) return 'Low';
  return 'Medium';
}

export function mapItem(i, map = {}) {
  const d = {
    id: 'MON-' + i.id,
    mondayId: i.id,
    source: 'monday',
    title: i.name,
    testCase: i.name,
    sourceUpdatedAt: i.updated_at,
    rawColumns: i.column_values || []
  };

  const normalizeColTitle = (t) => String(t || '').trim().toLowerCase().replace(/[\s\-_]+/g, ' ');

  for (const [field, names] of Object.entries(titles)) {
    const col = d.rawColumns.find((c) => {
      if (map[field] && c.id === map[field]) return true;
      const cTitle = normalizeColTitle(c.column?.title);
      return names.some((n) => normalizeColTitle(n) === cTitle);
    });
    d[field] = col?.text || '';
  }

  // Raw columns are only needed for the mapping above; don't persist them.
  delete d.rawColumns;

  if (!d.testCase && i.name) d.testCase = i.name;
  if (!d.title) d.title = d.testCaseTitle || d.defectId || i.name;
  if (!d.scenarioTitle) d.scenarioTitle = d.defectId || d.testCaseTitle || d.title;

  const rawRisk = d.priority || d.risk || d.severity;
  d.risk = normalizePriority(rawRisk);
  d.severity = d.risk;
  d.priority = d.risk;

  if (!d.category) {
    d.category = 'positive';
  }

  return d;
}
