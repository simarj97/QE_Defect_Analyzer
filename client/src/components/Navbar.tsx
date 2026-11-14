import React from 'react';
import { Project, User, UserRole } from '../types';
import { Layers, Shield, Sparkles, FolderPlus, UserCheck, RefreshCw } from 'lucide-react';

interface NavbarProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (proj: Project) => void;
  onNewProject: () => void;
  currentUser: User;
  onChangeUserRole: (role: UserRole) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isGeneratingAI: boolean;
  onGenerateAI: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onNewProject,
  currentUser,
  onChangeUserRole,
  activeTab,
  onSelectTab,
  isGeneratingAI,
  onGenerateAI
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'requirements', label: '1. Requirements & Scope', icon: '📝' },
    { id: 'qa-docs', label: '2. AI QA Documents', icon: '🧠' },
    { id: 'test-cases', label: '3. Test Cases & Approval', icon: '🧪' },
    { id: 'execution', label: '4. Test Execution', icon: '⚡' },
    { id: 'defects', label: '5. Defect Analyzer', icon: '🐛' },
    { id: 'monday-sync', label: '6. Monday CRM', icon: '🔗' }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-inner">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                DefectLens QA Studio
              </span>
              <span className="text-xs uppercase px-2 py-0.5 rounded font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                Enterprise AI
              </span>
            </div>
            <p className="text-xs text-slate-400">Multi-Project Quality Engineering & Test Intelligence</p>
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-xs text-slate-400 font-medium">Project:</span>
            <select
              className="bg-transparent text-sm font-semibold text-slate-100 focus:outline-none cursor-pointer"
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                  {p.name} ({p.domain})
                </option>
              ))}
            </select>
            {selectedProject && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                {selectedProject.domain.split(' ')[0]}
              </span>
            )}
          </div>

          <button
            onClick={onNewProject}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <FolderPlus className="h-3.5 w-3.5 text-indigo-400" />
            + New Project
          </button>

          {/* AI Generate Button */}
          {selectedProject && (
            <button
              onClick={onGenerateAI}
              disabled={isGeneratingAI}
              className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3.5 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isGeneratingAI ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  AI Analyze & Generate
                </>
              )}
            </button>
          )}

          {/* Role Switcher (RBAC) */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Role:</span>
            <select
              className="bg-transparent font-medium text-amber-300 focus:outline-none cursor-pointer"
              value={currentUser.role}
              onChange={(e) => onChangeUserRole(e.target.value as UserRole)}
            >
              <option value="Admin" className="bg-slate-800 text-white">Admin (Full Access)</option>
              <option value="QA Lead" className="bg-slate-800 text-white">QA Lead (Author/Approve/Sync)</option>
              <option value="QA Engineer" className="bg-slate-800 text-white">QA Engineer (Author/Execute)</option>
              <option value="Viewer" className="bg-slate-800 text-white">Viewer (Read Only)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 flex overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
