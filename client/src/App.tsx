import React, { useState, useEffect } from 'react';
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
  User,
  UserRole
} from './types';
import { api } from './api';
import { Navbar } from './components/Navbar';
import { DashboardTab } from './components/DashboardTab';
import { RequirementsTab } from './components/RequirementsTab';
import { QADocsTab } from './components/QADocsTab';
import { TestCasesTab } from './components/TestCasesTab';
import { ExecutionTab } from './components/ExecutionTab';
import { DefectsTab } from './components/DefectsTab';
import { MondaySyncTab } from './components/MondaySyncTab';
import { ProjectModal } from './components/ProjectModal';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user_admin',
    username: 'admin',
    name: 'System Administrator',
    role: 'Admin'
  });

  // Project state
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [artifacts, setArtifacts] = useState<QAArtifact[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [mondayConfig, setMondayConfig] = useState<MondayConfig | null>(null);
  const [dashboardData, setDashboardData] = useState<ProjectDashboardData | null>(null);
  const [crossProjectData, setCrossProjectData] = useState<CrossProjectSummary | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Load initial projects
  useEffect(() => {
    loadProjects();
  }, []);

  // When selected project changes, load its data
  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject.id);
    }
  }, [selectedProject?.id]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const projs = await api.getProjects();
      setProjects(projs);
      if (projs.length > 0 && !selectedProject) {
        setSelectedProject(projs[0]);
      }
      const cross = await api.getCrossProjectDashboard();
      setCrossProjectData(cross);
    } catch (err: any) {
      setErrorNotification(`Failed to load projects: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectData = async (projectId: string) => {
    try {
      const [reqs, arts, tcs, execs, defs, mConfig, dash] = await Promise.all([
        api.getRequirements(projectId),
        api.getArtifacts(projectId),
        api.getTestCases(projectId),
        api.getExecutions(projectId),
        api.getDefects(projectId),
        api.getMondayConfig(projectId),
        api.getProjectDashboard(projectId)
      ]);

      setRequirements(reqs);
      setArtifacts(arts);
      setTestCases(tcs);
      setExecutions(execs);
      setDefects(defs);
      setMondayConfig(mConfig);
      setDashboardData(dash);
    } catch (err: any) {
      console.error('Error loading project details:', err);
    }
  };

  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleGenerateAI = async (payload?: { rawContent?: string; format?: string; title?: string }) => {
    if (!selectedProject) return;
    setIsGeneratingAI(true);
    try {
      const res = await api.generateQADocs(selectedProject.id, payload);
      await loadProjectData(selectedProject.id);
      setActiveTab('qa-docs');
      setSuccessToast(`Successfully generated ${res.generatedCount || 'all'} test cases across 7 QA documents!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`AI QA Generation error: ${err.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveRequirement = async (rawContent: string, format: string, title?: string) => {
    if (!selectedProject) return;
    const result = await api.saveRequirements(selectedProject.id, rawContent, format, title);
    await loadProjectData(selectedProject.id);
    return result;
  };

  const handleUpdateArtifact = async (type: string, content: any, status?: string) => {
    if (!selectedProject) return;
    await api.updateArtifact(selectedProject.id, type, content, status);
    const updated = await api.getArtifacts(selectedProject.id);
    setArtifacts(updated);
  };

  const handleUpdateTestCase = async (tcId: string, updates: Partial<TestCase>) => {
    if (!selectedProject) return;
    await api.updateTestCase(selectedProject.id, tcId, updates);
    const updatedList = await api.getTestCases(selectedProject.id);
    setTestCases(updatedList);
    const dash = await api.getProjectDashboard(selectedProject.id);
    setDashboardData(dash);
  };

  const handleBatchApproveTestCases = async (ids?: string[]) => {
    if (!selectedProject) return;
    await api.batchApproveTestCases(selectedProject.id, ids);
    const updatedList = await api.getTestCases(selectedProject.id);
    setTestCases(updatedList);
    const dash = await api.getProjectDashboard(selectedProject.id);
    setDashboardData(dash);
  };

  const handleCreateTestCase = async (tc: Partial<TestCase>) => {
    if (!selectedProject) return;
    await api.createTestCase(selectedProject.id, tc);
    const updatedList = await api.getTestCases(selectedProject.id);
    setTestCases(updatedList);
  };

  const handleDeleteTestCase = async (tcId: string) => {
    if (!selectedProject) return;
    await api.deleteTestCase(selectedProject.id, tcId);
    const updatedList = await api.getTestCases(selectedProject.id);
    setTestCases(updatedList);
  };

  const handleRecordExecution = async (execData: Partial<TestExecution>) => {
    if (!selectedProject) return;
    const result = await api.recordExecution(selectedProject.id, execData);
    await loadProjectData(selectedProject.id);
    return result;
  };

  const handleSaveDefect = async (defectData: Partial<Defect>) => {
    if (!selectedProject) return;
    const res = await api.saveDefect(selectedProject.id, defectData);
    const updated = await api.getDefects(selectedProject.id);
    setDefects(updated);
    return res;
  };

  const handleUpdateDefect = async (defectId: string, defectData: Partial<Defect>) => {
    if (!selectedProject) return;
    const res = await api.updateDefect(selectedProject.id, defectId, defectData);
    const updated = await api.getDefects(selectedProject.id);
    setDefects(updated);
    return res;
  };

  const handleSaveMondayConfig = async (config: Partial<MondayConfig>) => {
    if (!selectedProject) return;
    const saved = await api.updateMondayConfig(selectedProject.id, config);
    setMondayConfig(saved);
    return saved;
  };

  const handleTriggerMondaySync = async () => {
    if (!selectedProject) return;
    const res = await api.syncMonday(selectedProject.id);
    await loadProjectData(selectedProject.id);
    return res;
  };

  const handleSaveProject = async (projectData: Partial<Project>) => {
    const created = await api.createProject(projectData);
    const all = await api.getProjects();
    setProjects(all);
    setSelectedProject(created);
    setShowProjectModal(false);
  };

  const activeRequirement = requirements.find((r) => r.is_active === 1) || requirements[0] || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Global Navbar */}
      <Navbar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={(p) => setSelectedProject(p)}
        onNewProject={() => setShowProjectModal(true)}
        currentUser={currentUser}
        onChangeUserRole={(role) => setCurrentUser({ ...currentUser, role })}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isGeneratingAI={isGeneratingAI}
        onGenerateAI={handleGenerateAI}
      />

      {/* Main App Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm font-semibold">Initializing QA Workspace & Intelligence Engine...</p>
          </div>
        ) : !selectedProject ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center max-w-lg mx-auto my-12 space-y-4">
            <h3 className="font-bold text-lg text-slate-100">No Projects Configured</h3>
            <p className="text-xs text-slate-400">
              Create a new project workspace or select an existing one to manage specifications, AI test cases, executions, and Monday sync.
            </p>
            <button
              onClick={() => setShowProjectModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
            >
              + Create First Project
            </button>
          </div>
        ) : (
          <div>
            {successToast && (
              <div className="mb-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{successToast}</span>
                </div>
                <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <DashboardTab
                dashboard={dashboardData}
                crossProject={crossProjectData}
                onRefresh={() => loadProjectData(selectedProject.id)}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectProjectById={(id) => {
                  const p = projects.find((x) => x.id === id);
                  if (p) setSelectedProject(p);
                }}
                projects={projects}
              />
            )}

            {activeTab === 'requirements' && (
              <RequirementsTab
                project={selectedProject}
                requirements={requirements}
                activeRequirement={activeRequirement}
                onSaveRequirement={handleSaveRequirement}
                onTriggerAI={handleGenerateAI}
                isGeneratingAI={isGeneratingAI}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'qa-docs' && (
              <QADocsTab
                project={selectedProject}
                artifacts={artifacts}
                onUpdateArtifact={handleUpdateArtifact}
                onTriggerAI={handleGenerateAI}
                isGeneratingAI={isGeneratingAI}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'test-cases' && (
              <TestCasesTab
                project={selectedProject}
                testCases={testCases}
                onUpdateTestCase={handleUpdateTestCase}
                onBatchApprove={handleBatchApproveTestCases}
                onCreateTestCase={handleCreateTestCase}
                onDeleteTestCase={handleDeleteTestCase}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'execution' && (
              <ExecutionTab
                project={selectedProject}
                testCases={testCases}
                executions={executions}
                onRecordExecution={handleRecordExecution}
                onNavigateTab={(tab) => setActiveTab(tab)}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'defects' && (
              <DefectsTab
                project={selectedProject}
                defects={defects}
                onSaveDefect={handleSaveDefect}
                onUpdateDefect={handleUpdateDefect}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'monday-sync' && (
              <MondaySyncTab
                project={selectedProject}
                mondayConfig={mondayConfig}
                testCases={testCases}
                onSaveConfig={handleSaveMondayConfig}
                onTriggerSync={handleTriggerMondaySync}
                currentUser={currentUser}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
          <span>DefectLens QA Studio • Multi-Project Quality Intelligence Platform</span>
          <span>Role: <strong className="text-indigo-400">{currentUser.name} ({currentUser.role})</strong></span>
        </div>
      </footer>

      {/* New Project Modal */}
      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSave={handleSaveProject}
      />
    </div>
  );
};
