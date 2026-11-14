import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export class Database {
  constructor(filePath = './data/defectlens_db.json') {
    this.filePath = resolve(filePath);
    this.tail = Promise.resolve();
    this.data = {
      projects: [],
      requirements: [],
      qa_artifacts: [],
      test_cases: [],
      test_executions: [],
      defects: [],
      monday_configs: [],
      users: []
    };
  }

  async init(seedData = null) {
    await mkdir(dirname(this.filePath), { recursive: true });
    try {
      const content = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content);
      this.data = {
        projects: parsed.projects || [],
        requirements: parsed.requirements || [],
        qa_artifacts: parsed.qa_artifacts || [],
        test_cases: parsed.test_cases || [],
        test_executions: parsed.test_executions || [],
        defects: parsed.defects || [],
        monday_configs: parsed.monday_configs || [],
        users: parsed.users || []
      };
    } catch (e) {
      if (typeof seedData === 'function') {
        this.data = await seedData();
      } else if (seedData) {
        this.data = seedData;
      }
      await this.persist();
    }
  }

  async persist() {
    const tmp = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await writeFile(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    try {
      await rename(tmp, this.filePath);
    } catch {
      // Windows file lock fallback: direct write
      await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    }
  }

  read() {
    return structuredClone(this.data);
  }

  async update(fn) {
    const task = this.tail.then(async () => {
      const cloned = this.read();
      const result = await fn(cloned);
      this.data = cloned;
      await this.persist();
      return result;
    });
    this.tail = task.catch((err) => {
      console.error('Database update error:', err);
    });
    return task;
  }

  // --- Projects ---
  async getProjects() {
    return this.read().projects;
  }

  async getProjectById(id) {
    return this.read().projects.find((p) => p.id === id) || null;
  }

  async saveProject(project) {
    return this.update((db) => {
      const idx = db.projects.findIndex((p) => p.id === project.id);
      const now = new Date().toISOString();
      if (idx >= 0) {
        db.projects[idx] = { ...db.projects[idx], ...project, updated_at: now };
        return db.projects[idx];
      }
      const newProj = { ...project, created_at: now, updated_at: now };
      db.projects.push(newProj);
      return newProj;
    });
  }

  async deleteProject(id) {
    return this.update((db) => {
      db.projects = db.projects.filter((p) => p.id !== id);
      db.requirements = db.requirements.filter((r) => r.project_id !== id);
      db.qa_artifacts = db.qa_artifacts.filter((a) => a.project_id !== id);
      db.test_cases = db.test_cases.filter((t) => t.project_id !== id);
      db.test_executions = db.test_executions.filter((e) => e.project_id !== id);
      db.defects = db.defects.filter((d) => d.project_id !== id);
      db.monday_configs = db.monday_configs.filter((m) => m.project_id !== id);
      return true;
    });
  }

  // --- Requirements ---
  async getRequirements(projectId) {
    return this.read().requirements.filter((r) => r.project_id === projectId);
  }

  async getActiveRequirement(projectId) {
    return this.read().requirements.find((r) => r.project_id === projectId && r.is_active) || null;
  }

  async saveRequirement(req) {
    return this.update((db) => {
      if (req.is_active) {
        db.requirements.forEach((r) => {
          if (r.project_id === req.project_id) r.is_active = false;
        });
      }
      const idx = db.requirements.findIndex((r) => r.id === req.id);
      const now = new Date().toISOString();
      if (idx >= 0) {
        db.requirements[idx] = { ...db.requirements[idx], ...req };
        return db.requirements[idx];
      }
      const newReq = { ...req, created_at: now };
      db.requirements.push(newReq);
      return newReq;
    });
  }

  // --- QA Artifacts ---
  async getArtifacts(projectId) {
    return this.read().qa_artifacts.filter((a) => a.project_id === projectId);
  }

  async getArtifact(projectId, type) {
    return this.read().qa_artifacts.find((a) => a.project_id === projectId && a.type === type) || null;
  }

  async saveArtifact(artifact) {
    return this.update((db) => {
      const idx = db.qa_artifacts.findIndex(
        (a) => a.project_id === artifact.project_id && a.type === artifact.type
      );
      const now = new Date().toISOString();
      if (idx >= 0) {
        const current = db.qa_artifacts[idx];
        db.qa_artifacts[idx] = {
          ...current,
          ...artifact,
          version: (current.version || 1) + 1,
          updated_at: now
        };
        return db.qa_artifacts[idx];
      }
      const newArt = { ...artifact, version: 1, updated_at: now };
      db.qa_artifacts.push(newArt);
      return newArt;
    });
  }

  // --- Test Cases ---
  async getTestCases(projectId) {
    return this.read().test_cases.filter((t) => t.project_id === projectId);
  }

  async getTestCaseById(id) {
    return this.read().test_cases.find((t) => t.id === id) || null;
  }

  async saveTestCase(testCase) {
    return this.update((db) => {
      const idx = db.test_cases.findIndex((t) => t.id === testCase.id);
      const now = new Date().toISOString();
      if (idx >= 0) {
        const old = db.test_cases[idx];
        const history = old.version_history || [];
        const snapshot = {
          version: old.version || 1,
          saved_at: old.updated_at,
          title: old.title,
          steps: old.steps,
          expected_result: old.expected_result,
          priority: old.priority,
          review_status: old.review_status
        };
        db.test_cases[idx] = {
          ...old,
          ...testCase,
          version: (old.version || 1) + 1,
          version_history: [snapshot, ...history].slice(0, 20),
          updated_at: now
        };
        return db.test_cases[idx];
      }
      const newTc = {
        ...testCase,
        version: 1,
        version_history: [],
        monday_sync_status: testCase.monday_sync_status || 'not_synced',
        created_at: now,
        updated_at: now
      };
      db.test_cases.push(newTc);
      return newTc;
    });
  }

  async saveBatchTestCases(projectId, testCases, replaceGenerated = true) {
    return this.update((db) => {
      const now = new Date().toISOString();
      const results = [];
      const newTcIds = new Set(testCases.map((t) => t.id));

      if (replaceGenerated) {
        // Remove stale generated test cases that no longer exist in the new requirement set
        // (Keep manually created test cases that do not match the generated prefix)
        const pfx = projectId.slice(0, 3).toUpperCase();
        db.test_cases = db.test_cases.filter((t) => {
          if (t.project_id !== projectId) return true;
          if (t.id.startsWith(`TC-${pfx}-`) && !newTcIds.has(t.id)) return false;
          return true;
        });
      }

      for (const tc of testCases) {
        const idx = db.test_cases.findIndex((t) => t.id === tc.id && t.project_id === projectId);
        if (idx >= 0) {
          const old = db.test_cases[idx];
          const history = old.version_history || [];
          const snapshot = {
            version: old.version || 1,
            saved_at: old.updated_at,
            title: old.title,
            steps: old.steps,
            expected_result: old.expected_result,
            priority: old.priority,
            review_status: old.review_status
          };
          const updatedTc = {
            ...old,
            ...tc,
            project_id: projectId,
            version: (old.version || 1) + 1,
            version_history: [snapshot, ...history].slice(0, 20),
            updated_at: now
          };
          db.test_cases[idx] = updatedTc;
          results.push(updatedTc);
        } else {
          const newTc = {
            ...tc,
            project_id: projectId,
            version: 1,
            version_history: [],
            monday_sync_status: tc.monday_sync_status || 'not_synced',
            created_at: now,
            updated_at: now
          };
          db.test_cases.push(newTc);
          results.push(newTc);
        }
      }
      return results;
    });
  }

  async deleteTestCase(id) {
    return this.update((db) => {
      db.test_cases = db.test_cases.filter((t) => t.id !== id);
      return true;
    });
  }

  // --- Executions ---
  async getExecutions(projectId) {
    return this.read().test_executions.filter((e) => e.project_id === projectId);
  }

  async saveExecution(execution) {
    return this.update((db) => {
      const now = new Date().toISOString();
      const newExec = {
        ...execution,
        id: execution.id || `exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        executed_at: execution.executed_at || now
      };
      db.test_executions.unshift(newExec);
      return newExec;
    });
  }

  // --- Defects ---
  async getDefects(projectId) {
    return this.read().defects.filter((d) => !projectId || d.project_id === projectId);
  }

  async getDefectById(id) {
    return this.read().defects.find((d) => d.id === id) || null;
  }

  async saveDefect(defect) {
    return this.update((db) => {
      const idx = db.defects.findIndex((d) => d.id === defect.id);
      const now = new Date().toISOString();
      if (idx >= 0) {
        db.defects[idx] = { ...db.defects[idx], ...defect, updated_at: now };
        return db.defects[idx];
      }
      const newDef = {
        ...defect,
        id: defect.id || `DEF-${Date.now().toString().slice(-4)}`,
        created_at: now,
        updated_at: now
      };
      db.defects.unshift(newDef);
      return newDef;
    });
  }

  // --- Monday Configs ---
  async getMondayConfig(projectId) {
    return this.read().monday_configs.find((m) => m.project_id === projectId) || null;
  }

  async saveMondayConfig(config) {
    return this.update((db) => {
      const idx = db.monday_configs.findIndex((m) => m.project_id === config.project_id);
      if (idx >= 0) {
        db.monday_configs[idx] = { ...db.monday_configs[idx], ...config };
        return db.monday_configs[idx];
      }
      db.monday_configs.push(config);
      return config;
    });
  }

  // --- Users & RBAC ---
  async getUsers() {
    return this.read().users;
  }

  async getUser(username) {
    return this.read().users.find((u) => u.username === username) || null;
  }

  async saveUser(user) {
    return this.update((db) => {
      const idx = db.users.findIndex((u) => u.username === user.username);
      if (idx >= 0) {
        db.users[idx] = { ...db.users[idx], ...user };
        return db.users[idx];
      }
      db.users.push(user);
      return user;
    });
  }
}
