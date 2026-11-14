import React, { useState } from 'react';
import { Defect, Project, User } from '../types';
import {
  Bug,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Download,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  ShieldAlert,
  Send
} from 'lucide-react';

interface DefectsTabProps {
  project: Project;
  defects: Defect[];
  onSaveDefect: (defect: Partial<Defect>) => Promise<any>;
  onUpdateDefect: (id: string, defect: Partial<Defect>) => Promise<any>;
  currentUser: User;
}

export const DefectsTab: React.FC<DefectsTabProps> = ({
  project,
  defects,
  onSaveDefect,
  onUpdateDefect,
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [showNewDefectModal, setShowNewDefectModal] = useState<boolean>(false);
  const [newDefectData, setNewDefectData] = useState<Partial<Defect>>({
    title: '',
    description: '',
    steps: '',
    expected: '',
    actual: '',
    environment: 'QA Integration',
    severity: 'High',
    status: 'Open'
  });

  const filteredDefects = defects.filter((d) => {
    if (filterSeverity !== 'all' && d.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.id.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        (d.test_case_id && d.test_case_id.toLowerCase().includes(q)) ||
        (d.actual && d.actual.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCreateDefect = async () => {
    if (!newDefectData.title) return;
    try {
      await onSaveDefect({
        ...newDefectData,
        id: `DEF-${project.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
      });
      setShowNewDefectModal(false);
      setNewDefectData({
        title: '',
        description: '',
        steps: '',
        expected: '',
        actual: '',
        environment: 'QA Integration',
        severity: 'High',
        status: 'Open'
      });
    } catch (err: any) {
      alert(`Failed to save defect: ${err.message}`);
    }
  };

  const handleStatusChange = async (defect: Defect, newStatus: string) => {
    try {
      await onUpdateDefect(defect.id, { status: newStatus as any });
    } catch (err: any) {
      alert(`Error updating defect status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Defect Intelligence & Root Cause Analyzer</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
              {defects.length} Defects Tracked
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated completeness scoring, duplicate Jaccard detection, severity heuristics, and AI root cause hypotheses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowNewDefectModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Report Defect
          </button>

          <a
            href={`/api/projects/${project.id}/export/defects`}
            download
            className="flex items-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Search Defects</label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            placeholder="Search by ID, title, or evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">Severity</label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">Lifecycle Status</label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Open">Open</option>
            <option value="In Review">In Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Defect Cards List */}
      <div className="space-y-4">
        {filteredDefects.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-500">
            No defects found matching criteria.
          </div>
        ) : (
          filteredDefects.map((d) => {
            const sevColor =
              d.severity === 'Critical' ? 'text-rose-400 bg-rose-950/60 border-rose-800' :
              d.severity === 'High' ? 'text-amber-400 bg-amber-950/60 border-amber-800' :
              'text-slate-300 bg-slate-800 border-slate-700';

            const statusColor =
              d.status === 'Open' ? 'text-rose-400 bg-rose-950 border-rose-800' :
              d.status === 'In Review' ? 'text-amber-400 bg-amber-950 border-amber-800' :
              d.status === 'Resolved' ? 'text-emerald-400 bg-emerald-950 border-emerald-800' :
              'text-slate-400 bg-slate-800 border-slate-700';

            return (
              <div
                key={d.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-bold text-rose-400 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {d.id}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${sevColor}`}>
                        {d.severity}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor}`}>
                        {d.status}
                      </span>
                      {d.test_case_id && (
                        <span className="text-[11px] font-mono text-indigo-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          Linked: {d.test_case_id}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-100">{d.title}</h3>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Status:</span>
                    <select
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-semibold focus:outline-none"
                      value={d.status}
                      onChange={(e) => handleStatusChange(d, e.target.value)}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Open">Open</option>
                      <option value="In Review">In Review</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Expected vs Actual Result Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="font-semibold text-emerald-400 block mb-1">Expected Result:</span>
                    <p className="text-slate-300">{d.expected || 'Specified expected behavior'}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-rose-900/40">
                    <span className="font-semibold text-rose-400 block mb-1">Observed Failure / Actual Result:</span>
                    <p className="text-slate-200 font-mono text-[11px]">{d.actual || 'No actual text recorded'}</p>
                  </div>
                </div>

                {/* Analyzer Intelligence Bar */}
                {d.analysis && (
                  <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                        <span className="font-bold text-slate-200">DefectLens Analyzer Score:</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {d.analysis.completeness}% Evidence Completeness
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Suggested Severity: <strong className="text-amber-400">{d.analysis.suggestedSeverity}</strong>
                      </div>
                    </div>

                    {d.analysis.observations && d.analysis.observations.length > 0 && (
                      <div className="text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">Observations: </span>
                        {d.analysis.observations.join(' • ')}
                      </div>
                    )}

                    {d.analysis.duplicates && d.analysis.duplicates.length > 0 && (
                      <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-900/60">
                        ⚠️ Similarity match: {d.analysis.duplicates[0].similarity}% match with defect {d.analysis.duplicates[0].id} ("{d.analysis.duplicates[0].title}")
                      </div>
                    )}
                  </div>
                )}

                {/* AI / Rule Root Cause Hypotheses */}
                {d.hypotheses && d.hypotheses.length > 0 && (
                  <div className="space-y-2 pt-1 text-xs">
                    <span className="font-bold text-slate-300 block">Root Cause Hypotheses (Clearly Labeled):</span>
                    {d.hypotheses.map((hyp) => (
                      <div key={hyp.id} className="bg-indigo-950/20 border border-indigo-900/50 p-3 rounded-lg space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-indigo-300">{hyp.label}</span>
                          <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                            {hyp.confidence} Confidence
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px]">{hyp.explanation}</p>
                        <div className="text-[11px] text-indigo-200/80 mt-1">
                          <strong>Recommended Verification:</strong> {hyp.recommendedCheck}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Monday CRM Link */}
                {d.monday_link && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Monday CRM Defect Item:</span>
                    <a
                      href={d.monday_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      #{d.monday_item_id} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Defect Modal */}
      {showNewDefectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-xl text-xs">
            <h3 className="font-bold text-base text-slate-100">Report New Defect</h3>

            <div>
              <label className="block text-slate-400 mb-1">Defect Title</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={newDefectData.title}
                onChange={(e) => setNewDefectData({ ...newDefectData, title: e.target.value })}
                placeholder="e.g. 504 Gateway Timeout on checkout submit"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Severity</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none"
                  value={newDefectData.severity}
                  onChange={(e) => setNewDefectData({ ...newDefectData, severity: e.target.value as any })}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Environment</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none"
                  value={newDefectData.environment}
                  onChange={(e) => setNewDefectData({ ...newDefectData, environment: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Reproduction Steps</label>
              <textarea
                className="w-full h-20 bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                value={newDefectData.steps}
                onChange={(e) => setNewDefectData({ ...newDefectData, steps: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Expected</label>
                <textarea
                  className="w-full h-16 bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                  value={newDefectData.expected}
                  onChange={(e) => setNewDefectData({ ...newDefectData, expected: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Actual</label>
                <textarea
                  className="w-full h-16 bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
                  value={newDefectData.actual}
                  onChange={(e) => setNewDefectData({ ...newDefectData, actual: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowNewDefectModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDefect}
                className="px-4 py-1.5 font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors"
              >
                Save & Analyze Defect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
