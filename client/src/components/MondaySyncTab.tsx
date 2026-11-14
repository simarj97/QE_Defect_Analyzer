import React, { useState } from 'react';
import { MondayConfig, TestCase, Project, User } from '../types';
import {
  ShieldCheck,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Key,
  Database,
  ArrowRight
} from 'lucide-react';

interface MondaySyncTabProps {
  project: Project;
  mondayConfig: MondayConfig | null;
  testCases: TestCase[];
  onSaveConfig: (config: Partial<MondayConfig>) => Promise<any>;
  onTriggerSync: () => Promise<any>;
  currentUser: User;
}

export const MondaySyncTab: React.FC<MondaySyncTabProps> = ({
  project,
  mondayConfig,
  testCases,
  onSaveConfig,
  onTriggerSync,
  currentUser
}) => {
  const [token, setToken] = useState<string>(mondayConfig?.token || '');
  const [boardId, setBoardId] = useState<string>(mondayConfig?.board_id || '4017071689');
  const [version, setVersion] = useState<string>(mondayConfig?.version || '2026-10');
  const [columnMap, setColumnMap] = useState<string>(
    typeof mondayConfig?.column_map === 'string'
      ? mondayConfig.column_map
      : JSON.stringify(mondayConfig?.column_map || { steps: 'steps', expected: 'expected' }, null, 2)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const approvedCases = testCases.filter((tc) => tc.review_status === 'Approved');
  const syncedCases = testCases.filter((tc) => tc.monday_sync_status === 'synced');
  const failedCases = testCases.filter((tc) => tc.monday_sync_status === 'failed');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await onSaveConfig({
        token,
        board_id: boardId,
        version,
        column_map: columnMap,
        is_enabled: 1
      });
      setSaveStatus('Monday CRM configuration saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await onTriggerSync();
      setSyncResult(res);
    } catch (err: any) {
      setSyncResult({ status: 'failed', isLive: false, errors: [err.message] });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Monday.com Enterprise CRM Integration</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              {project.name}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bi-directional synchronization for approved QA test cases with stable external IDs and duplicate prevention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizing...' : 'Sync Approved Tests Now'}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncResult && (
        <div className={`p-4 rounded-xl border text-xs space-y-2 ${
          syncResult.status === 'success'
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
            : syncResult.status === 'not_configured'
            ? 'bg-amber-950/60 border-amber-800 text-amber-200'
            : 'bg-rose-950/60 border-rose-800 text-rose-200'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            {syncResult.status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            )}
            <span>
              {syncResult.status === 'success'
                ? `Successfully synced ${syncResult.syncedCount} approved test cases to Monday Board #${boardId}!`
                : syncResult.message || 'Monday sync failed.'}
            </span>
          </div>

          {!syncResult.isLive && (
            <div className="bg-slate-900/60 p-2.5 rounded text-[11px] font-mono text-slate-300">
              <strong>Engine Notice:</strong> Simulated sync is NEVER reported as live success. Please provide a valid MONDAY_API_TOKEN and numeric MONDAY_BOARD_ID to publish live items.
            </div>
          )}

          {syncResult.errors && syncResult.errors.length > 0 && (
            <div className="space-y-1">
              <span className="font-semibold text-rose-300">Actionable Diagnostics:</span>
              <ul className="list-disc list-inside space-y-0.5 text-rose-200">
                {syncResult.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Configuration Form & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Config Column */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Key className="h-4 w-4 text-indigo-400" />
              <span>Project Monday.com Board Configuration</span>
            </h3>
            {saveStatus && <span className="text-xs text-emerald-400 font-semibold">{saveStatus}</span>}
          </div>

          <div className="space-y-3 text-xs">
            {/* Token */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Monday API Token (Stored securely on backend)</label>
              <input
                type="password"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiJ9..."
              />
            </div>

            {/* Board ID & Version */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Monday Board ID (Numeric)</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  placeholder="e.g. 4017071689"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">API Version</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </div>
            </div>

            {/* Column Mapping JSON */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Column ID Mapping (JSON)</label>
              <textarea
                className="w-full h-28 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                value={columnMap}
                onChange={(e) => setColumnMap(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Save className="h-3.5 w-3.5 text-indigo-400" />
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sync Health Column */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 text-xs">
            <h4 className="font-bold text-slate-200 pb-2 border-b border-slate-800">Sync Status Summary</h4>

            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400">Approved Test Cases:</span>
                <span className="font-bold text-indigo-400">{approvedCases.length}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400">Synced to Board:</span>
                <span className="font-bold text-emerald-400">{syncedCases.length}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400">Sync Failures:</span>
                <span className={`font-bold ${failedCases.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {failedCases.length}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div><strong>External ID Stability:</strong> Prevents duplicate item creation by embedding test ID <code>[TC-xxx]</code> in pulse metadata.</div>
              <div><strong>Retry Mechanism:</strong> Automated 3-attempt backoff on rate limits (HTTP 429) and server timeouts (HTTP 500+).</div>
            </div>
          </div>
        </div>
      </div>

      {/* Synced Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-200">Board Pulse Item Mapping</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Test Case ID</th>
                <th className="p-3">Title</th>
                <th className="p-3">Review Status</th>
                <th className="p-3">Monday Item ID</th>
                <th className="p-3">Sync Status</th>
                <th className="p-3 text-right">Monday Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {testCases.map((tc) => (
                <tr key={tc.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-indigo-400">{tc.id}</td>
                  <td className="p-3 font-medium text-slate-200">{tc.title}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tc.review_status === 'Approved' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tc.review_status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-400">
                    {tc.monday_item_id ? `#${tc.monday_item_id}` : '—'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      tc.monday_sync_status === 'synced' ? 'bg-emerald-950 text-emerald-400' :
                      tc.monday_sync_status === 'failed' ? 'bg-rose-950 text-rose-400' :
                      'bg-slate-800 text-slate-500'
                    }`}>
                      {tc.monday_sync_status || 'not_synced'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {tc.monday_link ? (
                      <a
                        href={tc.monday_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                      >
                        Open Pulse <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
