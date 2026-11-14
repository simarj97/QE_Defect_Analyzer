import {
  Project,
  Requirement,
  QAArtifact,
  TestCase,
  TestExecution,
  Defect,
  MondayConfig,
  ProjectDashboardData,
  CrossProjectSummary,
  User
} from './types';

const API_BASE = '/api';

function getHeaders(token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const activeToken = token || localStorage.getItem('defectlens_token');
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  return headers;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('defectlens_token', data.token);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return res.json();
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async createProject(project: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(project)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create project');
    }
    return res.json();
  },

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(project)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update project');
    }
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete project');
    }
  },

  // Requirements
  async getRequirements(projectId: string): Promise<Requirement[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/requirements`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch requirements');
    return res.json();
  },

  async saveRequirements(projectId: string, rawContent: string, format: string, title?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/requirements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rawContent, format, title })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save requirements');
    }
    return res.json();
  },

  // AI QA Generation
  async generateQADocs(projectId: string, payload?: { rawContent?: string; format?: string; title?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/ai/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'AI generation failed');
    }
    return res.json();
  },

  // QA Artifacts
  async getArtifacts(projectId: string): Promise<QAArtifact[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/artifacts`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch QA artifacts');
    return res.json();
  },

  async updateArtifact(projectId: string, type: string, content: any, status?: string): Promise<QAArtifact> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/artifacts/${type}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ content, status })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update artifact');
    }
    return res.json();
  },

  // Test Cases
  async getTestCases(projectId: string, filters: Record<string, string> = {}): Promise<TestCase[]> {
    const params = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE}/projects/${projectId}/test-cases?${params}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch test cases');
    return res.json();
  },

  async createTestCase(projectId: string, testCase: Partial<TestCase>): Promise<TestCase> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/test-cases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(testCase)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create test case');
    }
    return res.json();
  },

  async updateTestCase(projectId: string, tcId: string, testCase: Partial<TestCase>): Promise<TestCase> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/test-cases/${tcId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(testCase)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update test case');
    }
    return res.json();
  },

  async batchApproveTestCases(projectId: string, testCaseIds?: string[]): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/test-cases/batch-approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ testCaseIds })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve test cases');
    }
    return res.json();
  },

  async deleteTestCase(projectId: string, tcId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/test-cases/${tcId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete test case');
    }
  },

  // Executions
  async getExecutions(projectId: string): Promise<TestExecution[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/executions`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch executions');
    return res.json();
  },

  async recordExecution(projectId: string, executionData: Partial<TestExecution>): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/executions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(executionData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record execution');
    }
    return res.json();
  },

  // Automation Webhook API
  async submitAutomationRun(payload: {
    projectId: string;
    suiteName: string;
    environment: string;
    buildVersion: string;
    results: any[];
  }): Promise<any> {
    const res = await fetch('/api/v1/automation/runs', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit automation run');
    }
    return res.json();
  },

  // Defects
  async getDefects(projectId: string): Promise<Defect[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/defects`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch defects');
    return res.json();
  },

  async saveDefect(projectId: string, defect: Partial<Defect>): Promise<Defect> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/defects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(defect)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save defect');
    }
    return res.json();
  },

  async updateDefect(projectId: string, defectId: string, defect: Partial<Defect>): Promise<Defect> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/defects/${defectId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(defect)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update defect');
    }
    return res.json();
  },

  // Monday CRM
  async getMondayConfig(projectId: string): Promise<MondayConfig> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/monday/config`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch Monday config');
    return res.json();
  },

  async updateMondayConfig(projectId: string, config: Partial<MondayConfig>): Promise<MondayConfig> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/monday/config`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(config)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save Monday config');
    }
    return res.json();
  },

  async syncMonday(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/monday/sync`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Monday sync failed');
    }
    return res.json();
  },

  // Dashboard
  async getProjectDashboard(projectId: string): Promise<ProjectDashboardData> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/dashboard`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch project dashboard');
    return res.json();
  },

  async getCrossProjectDashboard(): Promise<CrossProjectSummary> {
    const res = await fetch(`${API_BASE}/dashboard/cross-project`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch cross-project dashboard');
    return res.json();
  }
};
