export type UserRole = 'Admin' | 'QA Lead' | 'QA Engineer' | 'Viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  domain: string;
  purpose: string;
  background?: string;
  in_scope?: string;
  out_of_scope?: string;
  user_roles?: string;
  business_rules?: string;
  target_environments?: string;
  browser_coverage?: string;
  app_url?: string;
  api_docs_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Requirement {
  id: string;
  project_id: string;
  version: number;
  title: string;
  format: 'text' | 'markdown' | 'csv' | 'json';
  raw_content: string;
  parsed_items: Array<{
    id: string;
    title: string;
    type: string;
    description: string;
    userRole?: string;
    acceptanceCriteria?: string[];
  }>;
  is_active: number;
  created_by: string;
  created_at: string;
}

export interface QAArtifact {
  id: string;
  project_id: string;
  requirement_version: number;
  type: 'requirement_analysis' | 'user_stories' | 'acceptance_criteria' | 'use_cases' | 'test_scope' | 'test_plan' | 'coverage_report';
  title: string;
  content: string;
  version: number;
  status: 'draft' | 'under_review' | 'approved';
  updated_by: string;
  updated_at: string;
}

export interface TestCaseStep {
  stepNumber: number;
  action: string;
  expectedStepResult: string;
}

export interface TestCase {
  id: string;
  project_id: string;
  feature: string;
  title: string;
  req_refs?: string[] | string;
  story_refs?: string[] | string;
  ac_refs?: string[] | string;
  preconditions?: string;
  test_data?: string;
  steps: TestCaseStep[] | string;
  expected_result: string;
  test_type: 'Positive' | 'Negative' | 'Boundary' | 'Integration' | 'Security';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  review_status: 'Draft' | 'Needs Review' | 'Approved' | 'Rejected';
  version: number;
  version_history?: Array<{
    version: number;
    saved_at: string;
    title: string;
    steps: any;
    expected_result: string;
    priority: string;
    review_status: string;
  }>;
  monday_item_id?: string;
  monday_link?: string;
  monday_sync_status?: 'not_synced' | 'synced' | 'failed';
  monday_sync_error?: string;
  created_at: string;
  updated_at: string;
}

export interface TestExecution {
  id: string;
  project_id: string;
  test_case_id: string;
  run_id: string;
  execution_status: 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
  actual_result?: string;
  environment?: string;
  build_version?: string;
  evidence?: string;
  execution_type: 'manual' | 'playwright' | 'cypress' | 'api_runner';
  executed_by: string;
  duration_ms?: number;
  defect_id?: string;
  executed_at: string;
}

export interface Defect {
  id: string;
  project_id: string;
  test_case_id?: string;
  execution_id?: string;
  title: string;
  description?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  environment?: string;
  build_version?: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Open' | 'In Review' | 'Resolved' | 'Closed';
  analysis?: {
    completeness: number;
    missing: string[];
    duplicates: Array<{ id: string; title: string; similarity: number }>;
    suggestedSeverity: string;
    severityReason: string;
    observations: string[];
    rootCause: string;
  };
  hypotheses?: Array<{
    id: string;
    label: string;
    confidence: string;
    explanation: string;
    recommendedCheck: string;
  }>;
  monday_item_id?: string;
  monday_link?: string;
  created_at: string;
  updated_at: string;
}

export interface MondayConfig {
  project_id: string;
  token?: string;
  board_id?: string;
  version?: string;
  column_map?: string;
  status_map?: string;
  is_enabled?: number;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_error?: string;
}

export interface ProjectDashboardData {
  project: { id: string; name: string; domain: string };
  testStatusMetrics: {
    totalGenerated: number;
    approvedTests: number;
    draftTests: number;
    needsReviewCount: number;
    rejectedTests: number;
    approvalRate: number;
    qualityDisclaimer: string;
  };
  coverageMetrics: {
    totalCriteria: number;
    coveredCriteria: number;
    uncoveredCriteria: number;
    coveragePercentage: number;
    uncoveredItems: Array<{ criterionId: string; description: string; category: string; riskNote: string }>;
  };
  executionMetrics: {
    totalExecutions: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    passRate: number;
  };
  defectMetrics: {
    totalDefects: number;
    openDefectsCount: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    recentDefects: Defect[];
  };
  blockedMetrics: {
    count: number;
    blockedItems: Array<{ executionId: string; testCaseId: string; environment: string; actualResult: string; executedAt: string }>;
  };
  mondaySyncMetrics: {
    isConfigured: boolean;
    boardId?: string;
    lastSyncAt?: string;
    lastSyncStatus: string;
    syncedCount: number;
    failedCount: number;
    failedItems: Array<{ id: string; title: string; error: string }>;
  };
  needsReviewQueue: Array<{
    id: string;
    title: string;
    priority: string;
    feature: string;
    version: number;
    reason: string;
  }>;
}

export interface CrossProjectSummary {
  crossProjectTotals: {
    totalProjects: number;
    totalGeneratedTests: number;
    totalApprovedTests: number;
    totalExecutions: number;
    overallPassRate: number;
    totalDefects: number;
    totalOpenDefects: number;
    totalNeedsReview: number;
  };
  projects: Array<{
    projectId: string;
    name: string;
    domain: string;
    totalTests: number;
    approvedTests: number;
    coveragePercentage: number;
    executionsCount: number;
    passRate: number;
    openDefects: number;
    needsReviewCount: number;
    mondayStatus: string;
  }>;
}
