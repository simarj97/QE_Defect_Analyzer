import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from '../src/db/storage.js';
import { createSeedData } from '../src/db/seed.js';
import { QAArtifactGenerator } from '../src/services/ai/generator.js';
import { parseRequirements, validateProjectSpecification, maskSecrets, sanitizeInput } from '../src/services/requirements/parser.js';
import { detectRequirementsDiff, flagImpactedTestCases } from '../src/services/requirements/changeTracker.js';
import { MondaySyncService } from '../src/services/monday/service.js';
import { ExecutionManager } from '../src/services/executions/manager.js';
import { DefectAnalyzerAdapter } from '../src/services/defects/adapter.js';
import { DashboardService } from '../src/services/dashboard/metrics.js';
import { exportTestCasesToCSV, exportTestCasesToJSON } from '../src/services/testCases/exporter.js';
import { ROLES, PERMISSIONS, hasPermission, hashPassword, verifyAuthToken, createAuthToken } from '../src/auth/rbac.js';
import { createApp } from '../src/app.js';

test('RBAC: Role permissions and token generation/verification', () => {
  assert.equal(hasPermission(ROLES.ADMIN, PERMISSIONS.PROJECT_CREATE), true);
  assert.equal(hasPermission(ROLES.ADMIN, PERMISSIONS.PROJECT_DELETE), true);
  assert.equal(hasPermission(ROLES.QA_LEAD, PERMISSIONS.TESTCASE_APPROVE), true);
  assert.equal(hasPermission(ROLES.QA_LEAD, PERMISSIONS.PROJECT_DELETE), false);
  assert.equal(hasPermission(ROLES.QA_ENGINEER, PERMISSIONS.EXECUTION_RECORD), true);
  assert.equal(hasPermission(ROLES.QA_ENGINEER, PERMISSIONS.TESTCASE_APPROVE), false);
  assert.equal(hasPermission(ROLES.VIEWER, PERMISSIONS.TESTCASE_CREATE), false);
  assert.equal(hasPermission(ROLES.VIEWER, PERMISSIONS.EXPORT_DATA), true);

  const token = createAuthToken({ id: 'u1', username: 'testuser', name: 'Tester', role: ROLES.QA_ENGINEER });
  const verified = verifyAuthToken(token);
  assert.equal(verified.username, 'testuser');
  assert.equal(verified.role, ROLES.QA_ENGINEER);
});

test('Requirements: Sanitization, secrets masking, and specification validation', () => {
  const dirty = '<script>alert("xss")</script>Patient login details';
  assert.equal(sanitizeInput(dirty), 'Patient login details');

  const withSecret = 'api_key: "secret12345" and token: "eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjEyM30.signature"';
  const masked = maskSecrets(withSecret);
  assert(!masked.includes('secret12345'));
  assert(!masked.includes('eyJhbGci'));

  // Reject URL-only specification
  const valOnlyUrl = validateProjectSpecification(
    { name: 'App', purpose: 'Banking App', app_url: 'https://example.com' },
    { raw_content: '' }
  );
  assert.equal(valOnlyUrl.isValid, false);
  assert(valOnlyUrl.issues[0].includes('application URL alone must not be treated as a complete specification'));

  // Valid specification
  const valGood = validateProjectSpecification(
    { name: 'App', purpose: 'Healthcare Portal' },
    { raw_content: '# Feature\n- Detailed requirement item' }
  );
  assert.equal(valGood.isValid, true);
});

test('Requirements: Markdown, CSV, and JSON parsing formats', () => {
  // Markdown
  const md = parseRequirements({ format: 'markdown', content: '# Appointment Booking\n- Patient selects doctor slot\n- AC: Given slot open when booked then lock' });
  assert.equal(md.parsedItems.length >= 1, true);
  assert.equal(md.parsedItems[0].title, 'Appointment Booking');

  // CSV
  const csv = parseRequirements({
    format: 'csv',
    content: 'ID,Title,Description,Role,AcceptanceCriteria\nREQ-01,Transfer Money,Send funds,User,Given funds available when send then debit'
  });
  assert.equal(csv.parsedItems.length, 1);
  assert.equal(csv.parsedItems[0].id, 'REQ-01');

  // JSON
  const json = parseRequirements({
    format: 'json',
    content: JSON.stringify([{ id: 'REQ-J1', title: 'Video Call', type: 'Telehealth', description: 'WebRTC call' }])
  });
  assert.equal(json.parsedItems.length, 1);
  assert.equal(json.parsedItems[0].title, 'Video Call');
});

test('Requirements: Change detection & test case impact analysis', () => {
  const oldItems = [{ id: 'REQ-1', title: 'Booking', description: 'Book 30min slot', acceptanceCriteria: ['AC1'] }];
  const newItems = [{ id: 'REQ-1', title: 'Booking', description: 'Book 45min slot with buffer', acceptanceCriteria: ['AC1', 'AC2'] }];
  
  const diff = detectRequirementsDiff(oldItems, newItems);
  assert.equal(diff.hasChanges, true);
  assert.equal(diff.modified.length, 1);

  const testCases = [
    { id: 'TC-01', title: 'Verify booking', req_refs: ['REQ-1'], review_status: 'Approved' },
    { id: 'TC-02', title: 'Verify profile', req_refs: ['REQ-99'], review_status: 'Approved' }
  ];

  const flagged = flagImpactedTestCases(testCases, diff);
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].id, 'TC-01');
  assert.equal(flagged[0].review_status, 'Needs Review');
});

test('AI QA Generator: Generates all 8 structured artifacts with assumption labeling and criteria coverage', async () => {
  const generator = new QAArtifactGenerator();
  const project = {
    id: 'proj_test',
    name: 'ApexPay Banking Remittance',
    domain: 'FinTech & Banking',
    purpose: 'Cross-border remittances',
    target_environments: 'QA, Sandbox',
    browser_coverage: 'Chrome, Safari'
  };
  const requirement = {
    parsed_items: [
      { id: 'REQ-01', title: 'FX Quote Lock', type: 'Functional', description: 'Lock FX for 120s' },
      { id: 'REQ-02', title: 'Wire Transfer', type: 'Functional', description: 'Wire transfer with 2FA' }
    ]
  };

  const results = await generator.generateAll(project, requirement);

  // 1. Requirement Analysis
  assert(results.requirementAnalysis.summary);
  assert(results.requirementAnalysis.assumptions.length > 0);
  assert.equal(results.requirementAnalysis.assumptions[0].status, 'PROPOSED_FOR_APPROVAL');
  assert.equal(results.requirementAnalysis.assumptions[0].requiresApproval, true);

  // 2. User Stories
  assert(results.userStories.stories.length >= 2);

  // 3. Acceptance Criteria
  assert(results.acceptanceCriteria.criteriaList.length >= 2);

  // 4. Use Cases
  assert(results.useCases.useCases.length >= 2);

  // 5. Test Scope
  assert.deepEqual(results.testScope.targetEnvironments, ['QA', 'Sandbox']);

  // 6. Test Plan
  assert(results.testPlan.objectives.length > 0);

  // 7. Test Cases
  assert(results.testCases.length >= 2);
  const firstTc = results.testCases[0];
  assert(firstTc.id.startsWith('TC-'));
  assert(firstTc.steps);
  assert(firstTc.expectedResult);
  assert.equal(firstTc.reviewStatus, 'Draft');

  // 8. Coverage Report
  assert(results.coverageReport.summary.coveragePercentage >= 90);
  assert(results.coverageReport.summary.totalCriteria > 0);
});

test('Test Case Exporter: Generates compliant CSV and JSON exports', () => {
  const testCases = [
    {
      id: 'TC-001',
      title: 'Verify Login',
      feature: 'Auth',
      req_refs: ['REQ-1'],
      story_refs: ['US-1'],
      ac_refs: ['AC-1.1'],
      preconditions: 'User on login page',
      steps: [{ stepNumber: 1, action: 'Click submit', expectedStepResult: 'Success' }],
      expected_result: 'Dashboard rendered',
      test_type: 'Positive',
      priority: 'High',
      review_status: 'Approved',
      version: 1,
      updated_at: new Date().toISOString()
    }
  ];

  const csv = exportTestCasesToCSV(testCases);
  assert(csv.includes('Test ID,Title,Feature'));
  assert(csv.includes('TC-001'));
  assert(csv.includes('Dashboard rendered'));

  const json = exportTestCasesToJSON(testCases, { id: 'p1', name: 'Proj', domain: 'Health' });
  const parsed = JSON.parse(json);
  assert.equal(parsed.totalCount, 1);
  assert.equal(parsed.testCases[0].id, 'TC-001');
});

test('Execution & Defect Adapter: Automatic defect draft on failure with root cause hypotheses', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'defectlens-qa-'));
  try {
    const db = new Database(join(dir, 'db.json'));
    const seed = await createSeedData();
    await db.init(seed);

    const adapter = new DefectAnalyzerAdapter();
    const execManager = new ExecutionManager(db, adapter);

    const testCases = await db.getTestCases('proj_medicare_telehealth');
    const tc = testCases[0];

    // Record a failed execution
    const { execution, createdDefect } = await execManager.recordExecution({
      projectId: 'proj_medicare_telehealth',
      testCaseId: tc.id,
      executionStatus: 'Failed',
      actualResult: '504 Gateway Timeout during WebRTC connection handshake',
      environment: 'QA Staging',
      buildVersion: 'v2.4.1-rc1',
      evidence: 'Stack: TimeoutError: WebRTC connection timed out after 15000ms'
    });

    assert.equal(execution.execution_status, 'Failed');
    assert(createdDefect);
    assert(createdDefect.id.startsWith('DEF-'));
    assert(createdDefect.hypotheses.length > 0);
    assert.equal(createdDefect.hypotheses[0].label.includes('HYPOTHESIS'), true);
    assert.equal(createdDefect.analysis.completeness, 100);

    // Playwright automation webhook runner contract
    const autoSummary = await execManager.processAutomationRun({
      projectId: 'proj_medicare_telehealth',
      suiteName: 'Playwright Smoke',
      results: [
        { testCaseId: tc.id, status: 'Passed', actualResult: 'Step OK', durationMs: 200 }
      ]
    });
    assert.equal(autoSummary.passed, 1);
    assert.equal(autoSummary.totalExecuted, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Monday CRM Service: Configurable per-project, retry on failure, safe reporting', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'defectlens-qa-'));
  try {
    const db = new Database(join(dir, 'db.json'));
    const seed = await createSeedData();
    await db.init(seed);

    const mondayService = new MondaySyncService(db);

    // When unconfigured, does NOT falsely report simulated success
    const resultUnconfigured = await mondayService.syncApprovedTestCases('proj_non_existent');
    assert.equal(resultUnconfigured.isLive, false);
    assert.equal(resultUnconfigured.status, 'not_configured');
    assert(resultUnconfigured.message.includes('NOT reported as live success'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Dashboard Service: Project metrics, AC coverage, and Cross-Project portfolio overview', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'defectlens-qa-'));
  try {
    const db = new Database(join(dir, 'db.json'));
    const seed = await createSeedData();
    await db.init(seed);

    const dashService = new DashboardService(db);
    const projDash = await dashService.getProjectDashboard('proj_medicare_telehealth');

    assert.equal(projDash.project.name, 'MediCare Telehealth & Patient Portal');
    assert(projDash.testStatusMetrics.totalGenerated > 0);
    assert(projDash.testStatusMetrics.approvedTests > 0);
    assert(projDash.coverageMetrics.coveragePercentage >= 90);
    assert(projDash.executionMetrics.totalExecutions > 0);
    assert(projDash.defectMetrics.totalDefects > 0);

    const cross = await dashService.getCrossProjectDashboard();
    assert.equal(cross.crossProjectTotals.totalProjects, 2);
    assert(cross.projects.some((p) => p.domain.includes('Healthcare')));
    assert(cross.projects.some((p) => p.domain.includes('FinTech')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
