import React, { useState } from 'react';
import { TestCase, Project, User } from '../types';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  Filter,
  Plus,
  History,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface TestCasesTabProps {
  project: Project;
  testCases: TestCase[];
  onUpdateTestCase: (tcId: string, updates: Partial<TestCase>) => Promise<void>;
  onBatchApprove: (ids?: string[]) => Promise<void>;
  onCreateTestCase: (tc: Partial<TestCase>) => Promise<void>;
  onDeleteTestCase: (tcId: string) => Promise<void>;
  currentUser: User;
}

export const TestCasesTab: React.FC<TestCasesTabProps> = ({
  project,
  testCases,
  onUpdateTestCase,
  onBatchApprove,
  onCreateTestCase,
  onDeleteTestCase,
  currentUser
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<Partial<TestCase>>({});
  const [expandedTcId, setExpandedTcId] = useState<string | null>(null);

  const filteredCases = testCases.filter((tc) => {
    if (filterType !== 'all' && tc.test_type !== filterType) return false;
    if (filterPriority !== 'all' && tc.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && tc.review_status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tc.id.toLowerCase().includes(q) ||
        tc.title.toLowerCase().includes(q) ||
        tc.feature.toLowerCase().includes(q) ||
        tc.expected_result.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApprove = async (tc: TestCase) => {
    try {
      await onUpdateTestCase(tc.id, { review_status: 'Approved' });
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (tc: TestCase) => {
    try {
      await onUpdateTestCase(tc.id, { review_status: 'Rejected' });
    } catch (err: any) {
      alert(`Reject error: ${err.message}`);
    }
  };

  const openEditModal = (tc: TestCase) => {
    setEditFormData({
      ...tc,
      steps: typeof tc.steps === 'string' ? tc.steps : JSON.stringify(tc.steps, null, 2)
    });
    setShowEditModal(true);
  };

  const saveEditForm = async () => {
    if (!editFormData.id || !editFormData.title) return;
    try {
      await onUpdateTestCase(editFormData.id, editFormData);
      setShowEditModal(false);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const openNewTestCaseModal = () => {
    setEditFormData({
      id: `TC-${project.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      title: '',
      feature: 'Core Application Flow',
      steps: '1. Navigate to target screen\n2. Perform user action\n3. Verify result',
      expected_result: '',
      preconditions: 'User authenticated with valid permissions',
      test_data: 'Standard test fixtures',
      test_type: 'Positive',
      priority: 'Medium',
      review_status: 'Draft'
    });
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Test Cases Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>Structured Test Cases & Verification Suite</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                {testCases.length} Cases
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Review, edit, and approve test cases. Approved cases synchronize to Monday CRM with stable external IDs.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onBatchApprove()}
              className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Batch Approve All
            </button>

            <button
              onClick={openNewTestCaseModal}
              className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Test Case
            </button>

            {/* Export buttons */}
            <a
              href={`/api/projects/${project.id}/export/test-cases?format=csv`}
              download
              className="flex items-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              CSV
            </a>

            <a
              href={`/api/projects/${project.id}/export/test-cases?format=json`}
              download
              className="flex items-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-purple-400" />
              JSON
            </a>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
          {/* Search */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Search Test Cases</label>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder="Filter by title, ID, or step..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Test Type</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
              <option value="Boundary">Boundary</option>
              <option value="Integration">Integration</option>
              <option value="Security">Security</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Priority</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Review Status</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Draft">Draft</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-500">
            No test cases found matching your filters.
          </div>
        ) : (
          filteredCases.map((tc) => {
            const isExpanded = expandedTcId === tc.id;
            const priorityColor =
              tc.priority === 'Critical' ? 'text-rose-400 bg-rose-950/60 border-rose-800' :
              tc.priority === 'High' ? 'text-amber-400 bg-amber-950/60 border-amber-800' :
              'text-slate-300 bg-slate-800 border-slate-700';

            const statusColor =
              tc.review_status === 'Approved' ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800' :
              tc.review_status === 'Needs Review' ? 'text-amber-400 bg-amber-950/60 border-amber-800' :
              tc.review_status === 'Rejected' ? 'text-rose-400 bg-rose-950/60 border-rose-800' :
              'text-slate-400 bg-slate-800/80 border-slate-700';

            return (
              <div
                key={tc.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-all space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-indigo-400 text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {tc.id}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${priorityColor}`}>
                        {tc.priority}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {tc.test_type}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor}`}>
                        {tc.review_status}
                      </span>
                      {tc.version && tc.version > 1 && (
                        <span className="text-[10px] text-slate-500 font-mono">v{tc.version}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-100">{tc.title}</h3>
                    <div className="text-[11px] text-slate-400 flex gap-4">
                      <span>Feature: <strong className="text-slate-300">{tc.feature}</strong></span>
                      {tc.ac_refs && (
                        <span>AC: <strong className="font-mono text-emerald-400">{Array.isArray(tc.ac_refs) ? tc.ac_refs.join(', ') : tc.ac_refs}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {tc.review_status !== 'Approved' && (
                      <button
                        onClick={() => handleApprove(tc)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded transition-colors"
                        title="Approve Test Case"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(tc)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded transition-colors"
                      title="Edit Test Case"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTestCase(tc);
                        setShowHistoryModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded transition-colors"
                      title="View Version History"
                    >
                      <History className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => setExpandedTcId(isExpanded ? null : tc.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs">
                    {/* Preconditions & Test Data */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                        <span className="font-semibold text-slate-400 block mb-1">Preconditions:</span>
                        <p className="text-slate-200">{tc.preconditions || 'None'}</p>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                        <span className="font-semibold text-slate-400 block mb-1">Test Data:</span>
                        <p className="text-slate-200">{tc.test_data || 'Standard fixtures'}</p>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <span className="font-semibold text-slate-400 block mb-1.5">Numbered Test Steps:</span>
                      {Array.isArray(tc.steps) ? (
                        <div className="space-y-1.5">
                          {tc.steps.map((st: any) => (
                            <div key={st.stepNumber} className="flex justify-between text-slate-200 bg-slate-900/60 p-2 rounded">
                              <span><strong>Step {st.stepNumber}:</strong> {st.action}</span>
                              <span className="text-slate-400 text-[11px]">→ {st.expectedStepResult}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="text-slate-200 font-mono whitespace-pre-wrap">{tc.steps}</pre>
                      )}
                    </div>

                    {/* Expected Result */}
                    <div className="bg-emerald-950/20 p-2.5 rounded border border-emerald-900/40">
                      <span className="font-semibold text-emerald-400 block mb-0.5">Expected Result:</span>
                      <p className="text-slate-200">{tc.expected_result}</p>
                    </div>

                    {/* Monday Link if synced */}
                    {tc.monday_link && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>Monday CRM Pulse:</span>
                        <a
                          href={tc.monday_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          #{tc.monday_item_id} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Create Test Case Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-100">
              {editFormData.id && testCases.some((t) => t.id === editFormData.id) ? `Edit Test Case ${editFormData.id}` : 'Create New Test Case'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Feature</label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                    value={editFormData.feature || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, feature: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Priority</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                    value={editFormData.priority || 'Medium'}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as any })}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Preconditions</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  value={editFormData.preconditions || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, preconditions: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Steps (Numbered actions)</label>
                <textarea
                  className="w-full h-28 bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  value={typeof editFormData.steps === 'string' ? editFormData.steps : JSON.stringify(editFormData.steps, null, 2)}
                  onChange={(e) => setEditFormData({ ...editFormData, steps: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Expected Result</label>
                <textarea
                  className="w-full h-16 bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  value={editFormData.expected_result || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, expected_result: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={saveEditForm}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
              >
                Save Test Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistoryModal && selectedTestCase && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-400" />
                <span>Version History: {selectedTestCase.id}</span>
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-200 text-xs">✕</button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(!selectedTestCase.version_history || selectedTestCase.version_history.length === 0) ? (
                <p className="text-xs text-slate-500 py-4 text-center">No prior revisions recorded for this test case.</p>
              ) : (
                selectedTestCase.version_history.map((snap, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                      <span>Revision v{snap.version}</span>
                      <span>{new Date(snap.saved_at).toLocaleString()}</span>
                    </div>
                    <div className="font-semibold text-slate-200">{snap.title}</div>
                    <div className="text-[11px] text-slate-400">Status: {snap.review_status} • Priority: {snap.priority}</div>
                  </div>
                ))
              )}
            </div>

            <div className="text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
