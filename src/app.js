import express from 'express';
import cors from 'cors';
import { Database } from './db/storage.js';
import { createSeedData } from './db/seed.js';
import { QAArtifactGenerator } from './services/ai/generator.js';
import { parseRequirements, validateProjectSpecification, maskSecrets } from './services/requirements/parser.js';
import { detectRequirementsDiff, flagImpactedTestCases } from './services/requirements/changeTracker.js';
import { MondaySyncService } from './services/monday/service.js';
import { ExecutionManager } from './services/executions/manager.js';
import { DefectAnalyzerAdapter } from './services/defects/adapter.js';
import { DashboardService } from './services/dashboard/metrics.js';
import { exportTestCasesToCSV, exportTestCasesToJSON, exportExecutionsToCSV, exportDefectsToCSV } from './services/testCases/exporter.js';
import { ROLES, PERMISSIONS, hasPermission, hashPassword, createAuthToken, verifyAuthToken, INITIAL_USERS } from './auth/rbac.js';

export async function createApp({ dbPath = './data/defectlens_db.json' } = {}) {
  const app = express();
  const db = new Database(dbPath);

  // Initialize DB with lazy seed data if new file
  await db.init(createSeedData);

  const aiGenerator = new QAArtifactGenerator();
  const mondayService = new MondaySyncService(db);
  const defectAnalyzer = new DefectAnalyzerAdapter();
  const executionManager = new ExecutionManager(db, defectAnalyzer);
  const dashboardService = new DashboardService(db);

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Auth Middleware
  const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const user = verifyAuthToken(token);
      if (user) {
        req.user = user;
        return next();
      }
    }
    // Default fallback to Admin role for seamless developer workflow
    req.user = { id: 'user_admin', username: 'admin', name: 'System Administrator', role: ROLES.ADMIN };
    next();
  };

  app.use('/api', authMiddleware);

  // --- Auth Endpoints ---
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.getUser(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = createAuthToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: req.user });
  });

  // --- Projects Endpoints ---
  app.get('/api/projects', async (req, res) => {
    const projects = await db.getProjects();
    res.json(projects);
  });

  app.post('/api/projects', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.PROJECT_CREATE)) {
      return res.status(403).json({ error: 'Insufficient permissions to create project.' });
    }
    const { name, domain, purpose, background, in_scope, out_of_scope, user_roles, business_rules, target_environments, browser_coverage, app_url, api_docs_url } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Application name is required.' });
    }
    if (!purpose || !purpose.trim()) {
      return res.status(400).json({ error: 'Application purpose is required.' });
    }

    const projectId = `proj_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString().slice(-4)}`;
    const newProject = await db.saveProject({
      id: projectId,
      name: name.trim(),
      domain: domain ? domain.trim() : 'General Software',
      purpose: purpose.trim(),
      background: background ? background.trim() : '',
      in_scope: in_scope || '',
      out_of_scope: out_of_scope || '',
      user_roles: user_roles || 'User, Admin',
      business_rules: business_rules || '',
      target_environments: target_environments || 'QA, Staging, Production',
      browser_coverage: browser_coverage || 'Chrome, Firefox, Safari, Edge',
      app_url: app_url || '',
      api_docs_url: api_docs_url || ''
    });

    res.status(201).json(newProject);
  });

  app.get('/api/projects/:id', async (req, res) => {
    const project = await db.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  });

  app.put('/api/projects/:id', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.PROJECT_CREATE)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const existing = await db.getProjectById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const updated = await db.saveProject({ ...existing, ...req.body, id: req.params.id });
    res.json(updated);
  });

  app.delete('/api/projects/:id', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.PROJECT_DELETE)) {
      return res.status(403).json({ error: 'Admin role required to delete project.' });
    }
    await db.deleteProject(req.params.id);
    res.json({ success: true, message: 'Project and all associated records deleted.' });
  });

  // --- Requirements Endpoints ---
  app.get('/api/projects/:id/requirements', async (req, res) => {
    const reqs = await db.getRequirements(req.params.id);
    res.json(reqs);
  });

  app.post('/api/projects/:id/requirements', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.REQUIREMENT_EDIT)) {
      return res.status(403).json({ error: 'Insufficient permissions to update requirements.' });
    }

    const { format = 'markdown', rawContent, title } = req.body;
    const project = await db.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Validate specification (reject URL-only specifications)
    const validation = validateProjectSpecification(project, { raw_content: rawContent });
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.issues.join(' ') });
    }

    const parsed = parseRequirements({ format, content: rawContent });
    const existingActive = await db.getActiveRequirement(req.params.id);

    const newVersion = existingActive ? (existingActive.version || 1) + 1 : 1;
    const reqId = `req_${req.params.id}_v${newVersion}`;

    // Change Detection & Test Case Impact Analysis
    let diff = { added: [], modified: [], removed: [], hasChanges: false };
    let flaggedCases = [];

    if (existingActive) {
      diff = detectRequirementsDiff(existingActive.parsed_items, parsed.parsedItems);
      if (diff.hasChanges) {
        const testCases = await db.getTestCases(req.params.id);
        flaggedCases = flagImpactedTestCases(testCases, diff);
        for (const tc of flaggedCases) {
          await db.saveTestCase(tc);
        }
      }
    }

    const requirementRecord = await db.saveRequirement({
      id: reqId,
      project_id: req.params.id,
      version: newVersion,
      title: title || `Requirements v${newVersion}`,
      format,
      raw_content: parsed.rawContent,
      parsed_items: parsed.parsedItems,
      is_active: 1,
      created_by: req.user.name || 'QA Lead'
    });

    res.status(201).json({
      requirement: requirementRecord,
      diff,
      flaggedTestCasesCount: flaggedCases.length,
      flaggedTestCases: flaggedCases.map((f) => ({ id: f.id, title: f.title, status: f.review_status }))
    });
  });

  // --- AI QA Generation Endpoints ---
  app.post('/api/projects/:id/ai/generate', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.AI_GENERATE)) {
      return res.status(403).json({ error: 'Insufficient permissions for AI generation.' });
    }

    const project = await db.getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    let requirement = await db.getActiveRequirement(req.params.id);

    // If new rawContent is provided in the generate request, save and parse it first
    if (req.body.rawContent && req.body.rawContent.trim()) {
      const parsed = parseRequirements({ format: req.body.format || 'markdown', content: req.body.rawContent });
      const newVersion = requirement ? (requirement.version || 1) + 1 : 1;
      const reqId = `req_${req.params.id}_v${newVersion}`;
      requirement = await db.saveRequirement({
        id: reqId,
        project_id: req.params.id,
        version: newVersion,
        title: req.body.title || `Requirements v${newVersion}`,
        format: req.body.format || 'markdown',
        raw_content: parsed.rawContent,
        parsed_items: parsed.parsedItems,
        is_active: 1,
        created_by: req.user.name || 'QA Lead'
      });
    }

    if (!requirement) {
      return res.status(400).json({ error: 'Provide and save requirements before running AI analysis and generation.' });
    }

    try {
      const generated = await aiGenerator.generateAll(project, requirement);

      // Save QA Artifacts
      const artifactsToSave = [
        { type: 'requirement_analysis', title: 'Requirement Gap & Ambiguity Analysis', content: JSON.stringify(generated.requirementAnalysis, null, 2) },
        { type: 'user_stories', title: 'User Stories & Business Value', content: JSON.stringify(generated.userStories, null, 2) },
        { type: 'acceptance_criteria', title: 'Acceptance Criteria Scenarios', content: JSON.stringify(generated.acceptanceCriteria, null, 2) },
        { type: 'use_cases', title: 'Use Cases & Flow Models', content: JSON.stringify(generated.useCases, null, 2) },
        { type: 'test_scope', title: 'Test Scope & Browser Coverage', content: JSON.stringify(generated.testScope, null, 2) },
        { type: 'test_plan', title: 'Master Test Plan & Quality Gate', content: JSON.stringify(generated.testPlan, null, 2) },
        { type: 'coverage_report', title: 'Acceptance Criteria Coverage Matrix', content: JSON.stringify(generated.coverageReport, null, 2) }
      ];

      for (const art of artifactsToSave) {
        await db.saveArtifact({
          id: `art_${project.id}_${art.type}`,
          project_id: project.id,
          requirement_version: requirement.version,
          type: art.type,
          title: art.title,
          content: art.content,
          status: 'draft',
          updated_by: req.user.name || 'AI Generator'
        });
      }

      // Save generated test cases
      const savedTestCases = await db.saveBatchTestCases(project.id, generated.testCases);

      res.json({
        success: true,
        generatedCount: savedTestCases.length,
        testCases: savedTestCases,
        coverage: generated.coverageReport.summary,
        artifacts: artifactsToSave.map((a) => a.type)
      });
    } catch (err) {
      console.error('AI Generation Error:', err);
      res.status(500).json({ error: `AI generation failed: ${err.message}` });
    }
  });

  // --- QA Artifacts Endpoints ---
  app.get('/api/projects/:id/artifacts', async (req, res) => {
    const artifacts = await db.getArtifacts(req.params.id);
    res.json(artifacts);
  });

  app.put('/api/projects/:id/artifacts/:type', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.TESTCASE_EDIT)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { content, status, title } = req.body;
    const existing = await db.getArtifact(req.params.id, req.params.type);
    const updated = await db.saveArtifact({
      id: existing ? existing.id : `art_${req.params.id}_${req.params.type}`,
      project_id: req.params.id,
      type: req.params.type,
      title: title || (existing ? existing.title : req.params.type),
      content: typeof content === 'object' ? JSON.stringify(content, null, 2) : content,
      status: status || (existing ? existing.status : 'draft'),
      updated_by: req.user.name || 'QA Editor'
    });
    res.json(updated);
  });

  // --- Test Cases Endpoints ---
  app.get('/api/projects/:id/test-cases', async (req, res) => {
    const { status, type, priority, feature } = req.query;
    let list = await db.getTestCases(req.params.id);

    if (status) list = list.filter((tc) => tc.review_status.toLowerCase() === status.toLowerCase());
    if (type) list = list.filter((tc) => tc.test_type.toLowerCase() === type.toLowerCase());
    if (priority) list = list.filter((tc) => tc.priority.toLowerCase() === priority.toLowerCase());
    if (feature) list = list.filter((tc) => tc.feature.toLowerCase().includes(feature.toLowerCase()));

    res.json(list);
  });

  app.post('/api/projects/:id/test-cases', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.TESTCASE_CREATE)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const tcData = req.body;
    const created = await db.saveTestCase({
      ...tcData,
      project_id: req.params.id,
      id: tcData.id || `TC-${req.params.id.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
    });
    res.status(201).json(created);
  });

  app.put('/api/projects/:id/test-cases/:tcId', async (req, res) => {
    const existing = await db.getTestCaseById(req.params.tcId);
    if (!existing) return res.status(404).json({ error: 'Test case not found' });

    // Check approval permission
    if (req.body.review_status === 'Approved' && !hasPermission(req.user.role, PERMISSIONS.TESTCASE_APPROVE)) {
      return res.status(403).json({ error: 'Only QA Lead or Admin can approve test cases.' });
    }

    const updated = await db.saveTestCase({
      ...existing,
      ...req.body,
      id: req.params.tcId,
      project_id: req.params.id
    });
    res.json(updated);
  });

  app.post('/api/projects/:id/test-cases/batch-approve', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.TESTCASE_APPROVE)) {
      return res.status(403).json({ error: 'Only QA Lead or Admin can approve test cases.' });
    }
    const { testCaseIds } = req.body;
    const all = await db.getTestCases(req.params.id);
    const approved = [];

    for (const tc of all) {
      if (!testCaseIds || testCaseIds.includes(tc.id)) {
        tc.review_status = 'Approved';
        await db.saveTestCase(tc);
        approved.push(tc.id);
      }
    }

    res.json({ approvedCount: approved.length, approvedIds: approved });
  });

  app.delete('/api/projects/:id/test-cases/:tcId', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.TESTCASE_DELETE)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    await db.deleteTestCase(req.params.tcId);
    res.json({ success: true });
  });

  // --- Export Endpoints ---
  app.get('/api/projects/:id/export/test-cases', async (req, res) => {
    const { format = 'csv' } = req.query;
    const testCases = await db.getTestCases(req.params.id);
    const project = await db.getProjectById(req.params.id);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/\s+/g, '_')}_test_cases.json"`);
      return res.send(exportTestCasesToJSON(testCases, project));
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/\s+/g, '_')}_test_cases.csv"`);
      return res.send(exportTestCasesToCSV(testCases));
    }
  });

  app.get('/api/projects/:id/export/executions', async (req, res) => {
    const executions = await db.getExecutions(req.params.id);
    const project = await db.getProjectById(req.params.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/\s+/g, '_')}_executions.csv"`);
    res.send(exportExecutionsToCSV(executions));
  });

  app.get('/api/projects/:id/export/defects', async (req, res) => {
    const defects = await db.getDefects(req.params.id);
    const project = await db.getProjectById(req.params.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/\s+/g, '_')}_defects.csv"`);
    res.send(exportDefectsToCSV(defects));
  });

  // --- Executions Endpoints ---
  app.get('/api/projects/:id/executions', async (req, res) => {
    const executions = await db.getExecutions(req.params.id);
    res.json(executions);
  });

  app.post('/api/projects/:id/executions', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.EXECUTION_RECORD)) {
      return res.status(403).json({ error: 'Insufficient permissions to record executions.' });
    }
    const tcId = req.body.testCaseId || req.body.test_case_id;
    const execStatus = req.body.executionStatus || req.body.execution_status || 'Passed';
    const actual = req.body.actualResult || req.body.actual_result || '';
    const env = req.body.environment || 'QA Integration';
    const build = req.body.buildVersion || req.body.build_version || 'v1.0.0';
    const evid = req.body.evidence || '';
    const dur = req.body.durationMs !== undefined ? req.body.durationMs : (req.body.duration_ms !== undefined ? req.body.duration_ms : 0);
    const execType = req.body.executionType || req.body.execution_type || 'manual';
    const execBy = req.body.executedBy || req.body.executed_by || req.user.name || 'QA Engineer';
    const rId = req.body.runId || req.body.run_id || `run_${Date.now()}`;

    if (!tcId) {
      return res.status(400).json({ error: 'testCaseId is required.' });
    }

    try {
      const result = await executionManager.recordExecution({
        projectId: req.params.id,
        testCaseId: tcId,
        runId: rId,
        executionStatus: execStatus,
        actualResult: actual,
        environment: env,
        buildVersion: build,
        evidence: evid,
        executionType: execType,
        executedBy: execBy,
        durationMs: dur
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Automation Runner Webhook API Contract (Playwright / Cypress) ---
  app.post('/api/v1/automation/runs', async (req, res) => {
    const { projectId, suiteName, environment, buildVersion, executedBy, results } = req.body;
    if (!projectId || !Array.isArray(results)) {
      return res.status(400).json({ error: 'projectId and results array are required.' });
    }
    try {
      const summary = await executionManager.processAutomationRun({
        projectId,
        suiteName,
        environment,
        buildVersion,
        executedBy: executedBy || 'Automated CI Runner',
        results
      });
      res.status(200).json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Defects Endpoints ---
  app.get('/api/projects/:id/defects', async (req, res) => {
    const defects = await db.getDefects(req.params.id);
    res.json(defects);
  });

  app.post('/api/projects/:id/defects', async (req, res) => {
    const defectData = req.body;
    const allDefects = await db.getDefects(req.params.id);
    const analysis = defectAnalyzer.analyze(defectData, allDefects);

    const saved = await db.saveDefect({
      ...defectData,
      project_id: req.params.id,
      analysis,
      hypotheses: analysis.hypotheses
    });
    res.status(201).json(saved);
  });

  app.put('/api/projects/:id/defects/:defectId', async (req, res) => {
    const existing = await db.getDefectById(req.params.defectId);
    if (!existing) return res.status(404).json({ error: 'Defect not found' });

    const allDefects = await db.getDefects(req.params.id);
    const merged = { ...existing, ...req.body, id: req.params.defectId, project_id: req.params.id };
    const analysis = defectAnalyzer.analyze(merged, allDefects);
    merged.analysis = analysis;
    merged.hypotheses = analysis.hypotheses;

    const saved = await db.saveDefect(merged);
    res.json(saved);
  });

  // --- Monday CRM Endpoints ---
  app.get('/api/projects/:id/monday/config', async (req, res) => {
    const config = await db.getMondayConfig(req.params.id);
    if (!config) {
      return res.json({ project_id: req.params.id, is_enabled: 0, board_id: '', version: '2026-10' });
    }
    // Mask sensitive token in client response
    const masked = {
      ...config,
      token: config.token ? `••••••••${config.token.slice(-4)}` : ''
    };
    res.json(masked);
  });

  app.post('/api/projects/:id/monday/config', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.MONDAY_CONFIG)) {
      return res.status(403).json({ error: 'Admin or QA Lead permission required.' });
    }
    const { token, board_id, column_map, is_enabled, version } = req.body;
    const existing = await db.getMondayConfig(req.params.id);

    const actualToken = token && !token.includes('••••') ? token : (existing?.token || '');
    const saved = await db.saveMondayConfig({
      project_id: req.params.id,
      token: actualToken,
      board_id: board_id || existing?.board_id || '',
      version: version || '2026-10',
      column_map: typeof column_map === 'string' ? column_map : JSON.stringify(column_map || {}),
      is_enabled: is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1
    });

    res.json({
      ...saved,
      token: saved.token ? `••••••••${saved.token.slice(-4)}` : ''
    });
  });

  app.post('/api/projects/:id/monday/sync', async (req, res) => {
    if (!hasPermission(req.user.role, PERMISSIONS.MONDAY_SYNC)) {
      return res.status(403).json({ error: 'Admin or QA Lead permission required to sync with Monday CRM.' });
    }
    const result = await mondayService.syncApprovedTestCases(req.params.id);
    res.json(result);
  });

  // --- Dashboard Endpoints ---
  app.get('/api/projects/:id/dashboard', async (req, res) => {
    try {
      const metrics = await dashboardService.getProjectDashboard(req.params.id);
      res.json(metrics);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  app.get('/api/dashboard/cross-project', async (req, res) => {
    try {
      const summary = await dashboardService.getCrossProjectDashboard();
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return { app, db, aiGenerator, mondayService, executionManager, defectAnalyzer, dashboardService };
}
