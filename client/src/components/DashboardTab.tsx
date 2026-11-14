import React, { useState } from 'react';
import { ProjectDashboardData, CrossProjectSummary, Project } from '../types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileText,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface DashboardTabProps {
  dashboard: ProjectDashboardData | null;
  crossProject: CrossProjectSummary | null;
  onRefresh: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectProjectById: (id: string) => void;
  projects: Project[];
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  dashboard,
  crossProject,
  onRefresh,
  onNavigateTab,
  onSelectProjectById,
  projects
}) => {
  const [viewMode, setViewMode] = useState<'project' | 'cross'>('project');

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading QA Metrics Dashboard...
      </div>
    );
  }

  const { testStatusMetrics, coverageMetrics, executionMetrics, defectMetrics, blockedMetrics, mondaySyncMetrics, needsReviewQueue } = dashboard;

  return (
    <div className="space-y-6">
      {/* Top Banner & Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <span>Quality Engineering Dashboard</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              {dashboard.project.name}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time quality intelligence, test coverage, execution pass rates, defect triage & Monday CRM sync health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex text-xs">
            <button
              onClick={() => setViewMode('project')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'project' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Project View
            </button>
            <button
              onClick={() => setViewMode('cross')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'cross' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cross-Project Portfolio
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === 'cross' && crossProject && (
        <div className="space-y-6">
          {/* Cross Project Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-medium text-slate-400">Total Managed Projects</span>
              <div className="text-2xl font-black text-slate-100 mt-1">{crossProject.crossProjectTotals.totalProjects}</div>
              <span className="text-[11px] text-emerald-400">Isolated QA Workspaces</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-medium text-slate-400">Approved Test Cases</span>
              <div className="text-2xl font-black text-indigo-400 mt-1">
                {crossProject.crossProjectTotals.totalApprovedTests} / {crossProject.crossProjectTotals.totalGeneratedTests}
              </div>
              <span className="text-[11px] text-slate-400">
                {Math.round((crossProject.crossProjectTotals.totalApprovedTests / (crossProject.crossProjectTotals.totalGeneratedTests || 1)) * 100)}% approval rate
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-medium text-slate-400">Overall Execution Pass Rate</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {crossProject.crossProjectTotals.overallPassRate}%
              </div>
              <span className="text-[11px] text-slate-400">{crossProject.crossProjectTotals.totalExecutions} total runs</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-medium text-slate-400">Active Open Defects</span>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {crossProject.crossProjectTotals.totalOpenDefects}
              </div>
              <span className="text-[11px] text-amber-400">{crossProject.crossProjectTotals.totalNeedsReview} cases need review</span>
            </div>
          </div>

          {/* Project Comparison Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-200">Cross-Project Portfolio Health</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Project & Domain</th>
                    <th className="p-3">Tests (Approved / Gen)</th>
                    <th className="p-3">AC Coverage</th>
                    <th className="p-3">Executions & Pass Rate</th>
                    <th className="p-3">Open Defects</th>
                    <th className="p-3">Needs Review</th>
                    <th className="p-3">Monday Sync</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {crossProject.projects.map((proj) => (
                    <tr key={proj.projectId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-semibold text-slate-100">
                        {proj.name}
                        <div className="text-[10px] text-slate-400">{proj.domain}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-indigo-300">{proj.approvedTests}</span> / {proj.totalTests}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full"
                              style={{ width: `${proj.coveragePercentage}%` }}
                            />
                          </div>
                          <span className="font-mono text-emerald-400 font-bold">{proj.coveragePercentage}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-200">{proj.executionsCount} runs</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          proj.passRate >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {proj.passRate}% Pass
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          proj.openDefects > 0 ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400'
                        }`}>
                          {proj.openDefects} Open
                        </span>
                      </td>
                      <td className="p-3">
                        {proj.needsReviewCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                            {proj.needsReviewCount} Review Needed
                          </span>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          proj.mondayStatus === 'success' ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-800'
                        }`}>
                          {proj.mondayStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            onSelectProjectById(proj.projectId);
                            setViewMode('project');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
                        >
                          Switch & View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'project' && (
        <div className="space-y-6">
          {/* Quality Disclaimer Notice */}
          <div className="bg-indigo-950/40 border border-indigo-800/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-indigo-200">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] mr-1">Engineering Discipline:</span>
              {testStatusMetrics.qualityDisclaimer}
            </div>
          </div>

          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Generated vs Approved */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400">Test Cases Status</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {testStatusMetrics.approvalRate}% Approved
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-400">{testStatusMetrics.approvedTests}</span>
                <span className="text-xs text-slate-400">/ {testStatusMetrics.totalGenerated} generated</span>
              </div>
              <div className="mt-2 text-[11px] flex gap-3 text-slate-400">
                <span className="text-amber-400 font-medium">{testStatusMetrics.draftTests} Draft</span>
                {testStatusMetrics.needsReviewCount > 0 && (
                  <span className="text-rose-400 font-bold">{testStatusMetrics.needsReviewCount} Needs Review</span>
                )}
              </div>
            </div>

            {/* AC Coverage */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400">Acceptance Criteria Coverage</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {coverageMetrics.coveragePercentage}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{coverageMetrics.coveredCriteria}</span>
                <span className="text-xs text-slate-400">/ {coverageMetrics.totalCriteria} criteria linked</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                {coverageMetrics.uncoveredCriteria > 0 ? (
                  <span className="text-amber-400 font-bold">{coverageMetrics.uncoveredCriteria} uncovered gaps</span>
                ) : (
                  <span className="text-emerald-400">100% criteria traced to tests</span>
                )}
              </div>
            </div>

            {/* Execution Pass Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400">Execution Pass Rate</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  executionMetrics.passRate >= 80 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  {executionMetrics.passRate}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-100">{executionMetrics.passed}</span>
                <span className="text-xs text-slate-400">/ {executionMetrics.totalExecutions} runs</span>
              </div>
              <div className="mt-2 text-[11px] flex gap-2 text-slate-400">
                <span className="text-rose-400 font-bold">{executionMetrics.failed} Failed</span>
                <span className="text-amber-400">{executionMetrics.blocked} Blocked</span>
                <span className="text-slate-500">{executionMetrics.skipped} Skipped</span>
              </div>
            </div>

            {/* Defects Open */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400">Open Defects & Hypotheses</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-rose-950 text-rose-300 border border-rose-800">
                  {defectMetrics.openDefectsCount} Active
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-400">{defectMetrics.bySeverity.Critical || 0}</span>
                <span className="text-xs text-slate-400">Critical / {defectMetrics.bySeverity.High || 0} High</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                <span>{defectMetrics.totalDefects} total logged in lifecycle</span>
              </div>
            </div>
          </div>

          {/* Section: Needs Review Queue & Blocked Tests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Needs Review Queue */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-slate-200">Specification Change & Review Queue</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-bold border border-amber-800">
                  {needsReviewQueue.length} Flagged
                </span>
              </div>

              {needsReviewQueue.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2 opacity-80" />
                  All test cases are up-to-date with active specifications. No pending review flags.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {needsReviewQueue.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-400">{item.id}</span>
                          <span className="text-xs font-semibold text-slate-200">{item.title}</span>
                        </div>
                        <p className="text-[11px] text-amber-300/80 mt-1">{item.reason}</p>
                      </div>
                      <button
                        onClick={() => onNavigateTab('test-cases')}
                        className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors whitespace-nowrap"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked Tests & Monday Health */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-slate-200">Monday CRM Sync & Blockers</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                  mondaySyncMetrics.lastSyncStatus === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                }`}>
                  {mondaySyncMetrics.isConfigured ? `Board #${mondaySyncMetrics.boardId}` : 'Not Configured'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Monday Synced Items:</span>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">{mondaySyncMetrics.syncedCount} Items</div>
                  <span className="text-[10px] text-slate-500">Live Item IDs & Links stored</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Sync Failures:</span>
                  <div className={`text-lg font-bold mt-0.5 ${mondaySyncMetrics.failedCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {mondaySyncMetrics.failedCount} Errors
                  </div>
                  <span className="text-[10px] text-slate-500">Auto-retry queue enabled</span>
                </div>
              </div>

              {/* Blocked Executions */}
              <div className="border-t border-slate-800 pt-3">
                <h4 className="text-xs font-semibold text-slate-300 mb-2">Blocked Test Executions ({blockedMetrics.count})</h4>
                {blockedMetrics.count === 0 ? (
                  <p className="text-xs text-slate-500">Zero blocked execution runs recorded.</p>
                ) : (
                  <div className="space-y-1.5">
                    {blockedMetrics.blockedItems.map((b) => (
                      <div key={b.executionId} className="p-2 bg-slate-950 rounded text-xs border border-slate-800 flex justify-between items-center">
                        <span className="font-mono text-indigo-400 font-semibold">{b.testCaseId}</span>
                        <span className="text-slate-400 truncate max-w-xs">{b.actualResult}</span>
                        <span className="text-[10px] text-slate-500">{b.environment}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
