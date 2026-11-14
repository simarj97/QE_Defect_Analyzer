import { DefectAnalyzerAdapter } from '../defects/adapter.js';

export class ExecutionManager {
  constructor(db, defectAnalyzer = new DefectAnalyzerAdapter()) {
    this.db = db;
    this.analyzer = defectAnalyzer;
  }

  async recordExecution({
    projectId,
    testCaseId,
    runId = `run_${Date.now()}`,
    executionStatus, // 'Passed' | 'Failed' | 'Blocked' | 'Skipped'
    actualResult,
    environment = 'QA Integration',
    buildVersion = 'v1.0.0',
    evidence = '',
    executionType = 'manual',
    executedBy = 'QA Engineer',
    durationMs = 0
  }) {
    const testCase = await this.db.getTestCaseById(testCaseId);
    if (!testCase) {
      throw new Error(`Test Case ${testCaseId} not found.`);
    }

    let defect = null;

    // If execution failed, prepare a reviewable defect draft!
    if (executionStatus === 'Failed') {
      const allDefects = await this.db.getDefects(projectId);
      const defectId = `DEF-${testCase.id.replace(/^TC-/, '')}-${Date.now().toString().slice(-4)}`;
      const defectTitle = `[Execution Failure] ${testCase.title} on ${environment}`;

      const rawDefect = {
        id: defectId,
        project_id: projectId,
        test_case_id: testCase.id,
        title: defectTitle,
        description: `Automated/Manual execution failed on ${environment} (Build: ${buildVersion}).\nPreconditions: ${testCase.preconditions}`,
        steps: typeof testCase.steps === 'string' ? testCase.steps : Array.isArray(testCase.steps) ? testCase.steps.map((s) => typeof s === 'string' ? s : `${s.stepNumber}. ${s.action}`).join('\n') : (testCase.steps || ''),
        expected: testCase.expected_result || testCase.expected || 'Expected test case to pass',
        actual: actualResult || 'Test execution failed assertion or timed out.',
        environment,
        build_version: buildVersion,
        severity: testCase.priority || 'High',
        status: 'Draft',
        monday_item_id: testCase.monday_item_id || null,
        monday_link: testCase.monday_link || null
      };

      const analysis = this.analyzer.analyze(rawDefect, allDefects);
      rawDefect.analysis = analysis;
      rawDefect.hypotheses = analysis.hypotheses;

      defect = await this.db.saveDefect(rawDefect);
    }

    const executionRecord = await this.db.saveExecution({
      project_id: projectId,
      test_case_id: testCaseId,
      run_id: runId,
      execution_status: executionStatus,
      actual_result: actualResult,
      environment,
      build_version: buildVersion,
      evidence,
      execution_type: executionType,
      executed_by: executedBy,
      duration_ms: durationMs,
      defect_id: defect ? defect.id : null,
      executed_at: new Date().toISOString()
    });

    return {
      execution: executionRecord,
      createdDefect: defect
    };
  }

  /**
   * Integration contract for automation runners (e.g. Playwright / Cypress / JUnit JSON)
   * Automation runners send structured test results along with suite metadata.
   */
  async processAutomationRun({
    projectId,
    suiteName = 'Playwright E2E Suite',
    environment = 'Automated CI / Staging',
    buildVersion = 'ci-build-main',
    executedBy = 'Playwright Runner',
    results = [] // Array of { testCaseId, status: 'Passed'|'Failed'|'Blocked'|'Skipped', actualResult, durationMs, errorStack, screenshotUrl, locatorUsed }
  }) {
    const project = await this.db.getProjectById(projectId);
    if (!project) throw new Error(`Project ${projectId} not found.`);

    const runId = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const processed = [];
    const createdDefects = [];

    for (const item of results) {
      try {
        const evidence = [
          item.errorStack ? `Error Stack:\n${item.errorStack}` : '',
          item.locatorUsed ? `Target Locator: ${item.locatorUsed}` : '',
          item.screenshotUrl ? `Screenshot Evidence: ${item.screenshotUrl}` : ''
        ].filter(Boolean).join('\n\n');

        const { execution, createdDefect } = await this.recordExecution({
          projectId,
          testCaseId: item.testCaseId,
          runId,
          executionStatus: item.status || (item.passed ? 'Passed' : 'Failed'),
          actualResult: item.actualResult || (item.passed ? 'Executed all steps successfully' : (item.errorMessage || 'Assertion failed in runner')),
          environment,
          buildVersion,
          evidence,
          executionType: 'playwright',
          executedBy,
          durationMs: item.durationMs || 0
        });

        processed.push(execution);
        if (createdDefect) createdDefects.push(createdDefect);
      } catch (err) {
        console.error(`Error recording automation result for ${item.testCaseId}:`, err.message);
      }
    }

    return {
      runId,
      suiteName,
      totalExecuted: results.length,
      passed: processed.filter((p) => p.execution_status === 'Passed').length,
      failed: processed.filter((p) => p.execution_status === 'Failed').length,
      blocked: processed.filter((p) => p.execution_status === 'Blocked').length,
      skipped: processed.filter((p) => p.execution_status === 'Skipped').length,
      createdDefects,
      executions: processed
    };
  }
}
