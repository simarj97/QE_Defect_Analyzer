export class DashboardService {
  constructor(db) {
    this.db = db;
  }

  async getProjectDashboard(projectId) {
    const project = await this.db.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const testCases = await this.db.getTestCases(projectId);
    const executions = await this.db.getExecutions(projectId);
    const defects = await this.db.getDefects(projectId);
    const artifacts = await this.db.getArtifacts(projectId);
    const mondayConfig = await this.db.getMondayConfig(projectId);

    // 1. Generated vs Approved Tests
    const totalGenerated = testCases.length;
    const approvedTests = testCases.filter((tc) => tc.review_status === 'Approved').length;
    const draftTests = testCases.filter((tc) => tc.review_status === 'Draft').length;
    const needsReviewTests = testCases.filter((tc) => tc.review_status === 'Needs Review');
    const rejectedTests = testCases.filter((tc) => tc.review_status === 'Rejected').length;

    // 2. Acceptance Criteria Coverage
    const coverageArtifact = artifacts.find((a) => a.type === 'coverage_report');
    let coverageData = { totalCriteria: 0, coveredCriteria: 0, uncoveredCriteria: 0, coveragePercentage: 0, uncoveredItems: [] };
    if (coverageArtifact) {
      try {
        const parsed = typeof coverageArtifact.content === 'string' ? JSON.parse(coverageArtifact.content) : coverageArtifact.content;
        coverageData = {
          totalCriteria: parsed.summary?.totalCriteria || 0,
          coveredCriteria: parsed.summary?.coveredCriteria || 0,
          uncoveredCriteria: parsed.summary?.uncoveredCriteria || 0,
          coveragePercentage: parsed.summary?.coveragePercentage || 0,
          uncoveredItems: parsed.uncoveredItems || []
        };
      } catch {
        // fallback
      }
    }

    // 3. Execution Results
    const totalExecutions = executions.length;
    const passed = executions.filter((e) => e.execution_status === 'Passed').length;
    const failed = executions.filter((e) => e.execution_status === 'Failed').length;
    const blocked = executions.filter((e) => e.execution_status === 'Blocked').length;
    const skipped = executions.filter((e) => e.execution_status === 'Skipped').length;
    const passRate = totalExecutions > 0 ? Math.round((passed / totalExecutions) * 100) : 0;

    // 4. Open Defects by Severity and Status
    const openDefects = defects.filter((d) => d.status !== 'Closed' && d.status !== 'Resolved');
    const defectsBySeverity = {
      Critical: defects.filter((d) => d.severity === 'Critical').length,
      High: defects.filter((d) => d.severity === 'High').length,
      Medium: defects.filter((d) => d.severity === 'Medium').length,
      Low: defects.filter((d) => d.severity === 'Low').length
    };
    const defectsByStatus = {
      Draft: defects.filter((d) => d.status === 'Draft').length,
      Open: defects.filter((d) => d.status === 'Open').length,
      InReview: defects.filter((d) => d.status === 'In Review').length,
      Resolved: defects.filter((d) => d.status === 'Resolved').length,
      Closed: defects.filter((d) => d.status === 'Closed').length
    };

    // 5. Blocked Tests
    const blockedExecutions = executions.filter((e) => e.execution_status === 'Blocked');
    const blockedSummary = blockedExecutions.map((b) => ({
      executionId: b.id,
      testCaseId: b.test_case_id,
      environment: b.environment,
      actualResult: b.actual_result,
      executedAt: b.executed_at
    }));

    // 6. Monday CRM Sync Status & Failures
    const mondaySyncFailures = testCases.filter((tc) => tc.monday_sync_status === 'failed');
    const mondaySyncedCount = testCases.filter((tc) => tc.monday_sync_status === 'synced').length;

    return {
      project: { id: project.id, name: project.name, domain: project.domain },
      testStatusMetrics: {
        totalGenerated,
        approvedTests,
        draftTests,
        needsReviewCount: needsReviewTests.length,
        rejectedTests,
        approvalRate: totalGenerated > 0 ? Math.round((approvedTests / totalGenerated) * 100) : 0,
        qualityDisclaimer: 'Generated test count indicates draft volume, not test pass confidence. Only approved and executed tests contribute to release readiness.'
      },
      coverageMetrics: coverageData,
      executionMetrics: {
        totalExecutions,
        passed,
        failed,
        blocked,
        skipped,
        passRate
      },
      defectMetrics: {
        totalDefects: defects.length,
        openDefectsCount: openDefects.length,
        bySeverity: defectsBySeverity,
        byStatus: defectsByStatus,
        recentDefects: defects.slice(0, 5)
      },
      blockedMetrics: {
        count: blocked,
        blockedItems: blockedSummary
      },
      mondaySyncMetrics: {
        isConfigured: !!(mondayConfig && mondayConfig.token && mondayConfig.board_id),
        boardId: mondayConfig?.board_id || null,
        lastSyncAt: mondayConfig?.last_sync_at || null,
        lastSyncStatus: mondayConfig?.last_sync_status || 'idle',
        syncedCount: mondaySyncedCount,
        failedCount: mondaySyncFailures.length,
        failedItems: mondaySyncFailures.map((f) => ({ id: f.id, title: f.title, error: f.monday_sync_error }))
      },
      needsReviewQueue: needsReviewTests.map((tc) => ({
        id: tc.id,
        title: tc.title,
        priority: tc.priority,
        feature: tc.feature,
        version: tc.version,
        reason: tc.review_reason || 'Requires QA sign-off after specification revision.'
      }))
    };
  }

  async getCrossProjectDashboard() {
    const projects = await this.db.getProjects();
    const projectSummaries = [];

    let totalTestsAll = 0;
    let totalApprovedAll = 0;
    let totalExecutionsAll = 0;
    let totalPassedAll = 0;
    let totalDefectsAll = 0;
    let totalOpenDefectsAll = 0;
    let totalNeedsReviewAll = 0;

    for (const proj of projects) {
      try {
        const data = await this.getProjectDashboard(proj.id);
        totalTestsAll += data.testStatusMetrics.totalGenerated;
        totalApprovedAll += data.testStatusMetrics.approvedTests;
        totalExecutionsAll += data.executionMetrics.totalExecutions;
        totalPassedAll += data.executionMetrics.passed;
        totalDefectsAll += data.defectMetrics.totalDefects;
        totalOpenDefectsAll += data.defectMetrics.openDefectsCount;
        totalNeedsReviewAll += data.testStatusMetrics.needsReviewCount;

        projectSummaries.push({
          projectId: proj.id,
          name: proj.name,
          domain: proj.domain,
          totalTests: data.testStatusMetrics.totalGenerated,
          approvedTests: data.testStatusMetrics.approvedTests,
          coveragePercentage: data.coverageMetrics.coveragePercentage,
          executionsCount: data.executionMetrics.totalExecutions,
          passRate: data.executionMetrics.passRate,
          openDefects: data.defectMetrics.openDefectsCount,
          needsReviewCount: data.testStatusMetrics.needsReviewCount,
          mondayStatus: data.mondaySyncMetrics.lastSyncStatus
        });
      } catch (err) {
        console.error(`Error aggregating metrics for ${proj.id}:`, err);
      }
    }

    return {
      crossProjectTotals: {
        totalProjects: projects.length,
        totalGeneratedTests: totalTestsAll,
        totalApprovedTests: totalApprovedAll,
        totalExecutions: totalExecutionsAll,
        overallPassRate: totalExecutionsAll > 0 ? Math.round((totalPassedAll / totalExecutionsAll) * 100) : 0,
        totalDefects: totalDefectsAll,
        totalOpenDefects: totalOpenDefectsAll,
        totalNeedsReview: totalNeedsReviewAll
      },
      projects: projectSummaries
    };
  }
}
