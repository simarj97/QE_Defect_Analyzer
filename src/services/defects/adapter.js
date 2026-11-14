import { analyze as runCoreAnalyzer } from '../../../analyzer.js';

export class DefectAnalyzerAdapter {
  /**
   * Adapter for the core defect analyzer.
   * Takes a defect object and collection of all defects, normalizes fields,
   * invokes analyzer.js, and appends clearly labeled root cause hypotheses.
   */
  analyze(defect, allDefects = []) {
    // Normalize format expected by analyzer.js
    const normalized = {
      id: defect.id || 'DEF-TEMP',
      title: defect.title || 'Untitled Defect',
      description: defect.description || '',
      steps: defect.steps || '',
      expected: defect.expected || '',
      actual: defect.actual || '',
      environment: defect.environment || '',
      severity: defect.severity || 'Medium',
      source: defect.source || 'local',
      status: defect.status || 'Draft',
      assignee: defect.assignee || ''
    };

    const coreAnalysis = runCoreAnalyzer(normalized, allDefects.map((d) => ({
      id: d.id,
      title: d.title,
      steps: d.steps,
      expected: d.expected,
      actual: d.actual,
      environment: d.environment,
      severity: d.severity,
      source: d.source || 'local',
      status: d.status,
      removedFromBoard: d.removedFromBoard || false
    })));

    // Generate clearly labeled root cause hypotheses based on actual vs expected evidence
    const hypotheses = this._generateHypotheses(defect);

    return {
      ...coreAnalysis,
      hypotheses,
      analyzedAt: new Date().toISOString()
    };
  }

  _generateHypotheses(defect) {
    const text = `${defect.title} ${defect.actual || ''} ${defect.description || ''} ${defect.steps || ''}`.toLowerCase();
    const hypotheses = [];

    if (/timeout|timed out|abort|504|gateway/i.test(text)) {
      hypotheses.push({
        id: 'HYP-01',
        label: 'HYPOTHESIS [Network/Gateway Timeout]',
        confidence: 'High',
        explanation: 'Upstream microservice or database connection pool reached maximum timeout threshold under request latency.',
        recommendedCheck: 'Inspect reverse proxy timeouts, gateway logs, and database connection pool metrics.'
      });
    }

    if (/401|403|unauthorized|forbidden|jwt|token|permission|csrf/i.test(text)) {
      hypotheses.push({
        id: 'HYP-02',
        label: 'HYPOTHESIS [Auth & Token Expiration]',
        confidence: 'High',
        explanation: 'Authentication session token expired or RBAC role lacks required permissions for the endpoint.',
        recommendedCheck: 'Verify Bearer token validity, expiry claims, and role authorization mapping.'
      });
    }

    if (/500|internal server|nullpointer|undefined|cannot read property|typeerror/i.test(text)) {
      hypotheses.push({
        id: 'HYP-03',
        label: 'HYPOTHESIS [Unhandled Null/Type Exception in Backend]',
        confidence: 'High',
        explanation: 'Backend handler received an unexpected null or missing payload field causing an unhandled server exception.',
        recommendedCheck: 'Check backend server stack traces and add defensive optional chaining / payload validation.'
      });
    }

    if (/duplicate|conflict|409|unique constraint/i.test(text)) {
      hypotheses.push({
        id: 'HYP-04',
        label: 'HYPOTHESIS [Idempotency & Race Condition]',
        confidence: 'Medium',
        explanation: 'Concurrent duplicate submissions or missing idempotency key caused database unique constraint violation.',
        recommendedCheck: 'Inspect frontend submission debouncing and backend idempotency header handling.'
      });
    }

    if (/render|dom|selector|click|element not visible|locator/i.test(text)) {
      hypotheses.push({
        id: 'HYP-05',
        label: 'HYPOTHESIS [UI Race Condition or Stale DOM Element]',
        confidence: 'Medium',
        explanation: 'Automation locator attempted interaction before dynamic component finished rendering or API response resolved.',
        recommendedCheck: 'Use Playwright waitForSelector or explicit state assertions instead of fixed sleep timeouts.'
      });
    }

    if (hypotheses.length === 0) {
      hypotheses.push({
        id: 'HYP-GEN',
        label: 'HYPOTHESIS [Functional Logic Discrepancy]',
        confidence: 'Medium',
        explanation: 'Actual behavior diverged from specified acceptance criteria. Possible business logic branch defect.',
        recommendedCheck: 'Reproduce manually using the exact step sequence and capture network HAR logs.'
      });
    }

    return hypotheses;
  }
}
