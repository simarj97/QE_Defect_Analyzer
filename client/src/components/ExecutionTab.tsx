import React, { useState } from 'react';
import { TestCase, TestExecution, Project, User } from '../types';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Clock,
  Terminal,
  Code,
  Download,
  ExternalLink,
  Layers,
  Bug
} from 'lucide-react';

interface ExecutionTabProps {
  project: Project;
  testCases: TestCase[];
  executions: TestExecution[];
  onRecordExecution: (data: Partial<TestExecution>) => Promise<any>;
  onNavigateTab: (tab: string) => void;
  currentUser: User;
}

export const ExecutionTab: React.FC<ExecutionTabProps> = ({
  project,
  testCases,
  executions,
  onRecordExecution,
  onNavigateTab,
  currentUser
}) => {
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>(testCases[0]?.id || '');
  const [executionStatus, setExecutionStatus] = useState<'Passed' | 'Failed' | 'Blocked' | 'Skipped'>('Passed');
  const [actualResult, setActualResult] = useState<string>('Execution succeeded with expected output.');
  const [environment, setEnvironment] = useState<string>('QA Integration');
  const [buildVersion, setBuildVersion] = useState<string>('v2.4.1-rc1');
  const [evidence, setEvidence] = useState<string>('');
  const [durationMs, setDurationMs] = useState<number>(1200);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastRecorded, setLastRecorded] = useState<any>(null);
  const [showAutomationDocs, setShowAutomationDocs] = useState<boolean>(false);

  React.useEffect(() => {
    if ((!selectedTestCaseId || !testCases.some((t) => t.id === selectedTestCaseId)) && testCases.length > 0) {
      setSelectedTestCaseId(testCases[0].id);
      setActualResult(testCases[0].expected_result || 'Execution succeeded with expected output.');
    }
  }, [testCases, selectedTestCaseId]);

  const selectedTc = testCases.find((t) => t.id === selectedTestCaseId);

  const handleRecord = async () => {
    const activeTcId = selectedTestCaseId || testCases[0]?.id;
    if (!activeTcId) {
      alert('Please select a valid test case to record execution.');
      return;
    }
    setIsSubmitting(true);
    setLastRecorded(null);
    try {
      const result = await onRecordExecution({
        test_case_id: activeTcId,
        test_case_id_camel: activeTcId,
        execution_status: executionStatus,
        actual_result: actualResult,
        environment,
        build_version: buildVersion,
        evidence,
        duration_ms: durationMs,
        execution_type: 'manual',
        executed_by: currentUser.name
      } as any);
      setLastRecorded(result);
    } catch (err: any) {
      alert(`Execution recording error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Test Execution Engine & Runner</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              {executions.length} Runs Recorded
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Execute manual test runs or ingest CI test logs from Playwright/Cypress runners via standard webhook contract.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAutomationDocs(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-lg transition-colors"
          >
            <Terminal className="h-3.5 w-3.5 text-indigo-400" />
            Playwright / CI Contract
          </button>

          <a
            href={`/api/projects/${project.id}/export/executions`}
            download
            className="flex items-center gap-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Manual Execution Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
          <Play className="h-4 w-4 text-emerald-400" />
          <span>Record Test Execution Result</span>
        </h3>

        {lastRecorded && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-200 p-3 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Execution logged successfully (ID: {lastRecorded.execution.id})</span>
            </div>
            {lastRecorded.createdDefect && (
              <div className="text-[11px] text-amber-300 flex items-center gap-2 mt-1 bg-amber-950/40 p-2 rounded border border-amber-900">
                <Bug className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  Execution failed! Auto-created reviewable defect draft <strong className="font-mono text-amber-200">{lastRecorded.createdDefect.id}</strong> with analyzer root cause hypotheses.
                </span>
                <button
                  onClick={() => onNavigateTab('defects')}
                  className="ml-auto underline font-bold hover:text-white"
                >
                  View Defect
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Select Test Case */}
          <div className="md:col-span-2">
            <label className="block text-slate-400 mb-1 font-medium">Select Test Case to Execute</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
              value={selectedTestCaseId}
              onChange={(e) => {
                setSelectedTestCaseId(e.target.value);
                const tc = testCases.find((t) => t.id === e.target.value);
                if (tc) setActualResult(tc.expected_result);
              }}
            >
              {testCases.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  [{tc.id}] {tc.title} ({tc.priority} • {tc.review_status})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Execution Status</label>
            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-bold focus:outline-none focus:border-indigo-500"
              value={executionStatus}
              onChange={(e) => setExecutionStatus(e.target.value as any)}
            >
              <option value="Passed" className="text-emerald-400">Passed (All Assertions Met)</option>
              <option value="Failed" className="text-rose-400">Failed (Defect / Discrepancy)</option>
              <option value="Blocked" className="text-amber-400">Blocked (Environment / Prerequisite)</option>
              <option value="Skipped" className="text-slate-400">Skipped</option>
            </select>
          </div>
        </div>

        {/* Selected Test Case Info Box */}
        {selectedTc && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
            <div className="text-slate-400">
              <strong className="text-slate-300">Expected Result:</strong> {selectedTc.expected_result}
            </div>
            <div className="text-slate-500 text-[11px]">
              Preconditions: {selectedTc.preconditions || 'None'}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Environment</label>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Build / Version</label>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              value={buildVersion}
              onChange={(e) => setBuildVersion(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Duration (ms)</label>
            <input
              type="number"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              value={durationMs}
              onChange={(e) => setDurationMs(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Actual Result & Evidence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Actual Result (Observed Outcome)</label>
            <textarea
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              value={actualResult}
              onChange={(e) => setActualResult(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Evidence (Stack trace, network logs, locator)</label>
            <textarea
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="e.g. Playwright error log, screenshot URL, or HTTP response payload"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleRecord}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Recording Execution...' : 'Submit Execution Result'}
          </button>
        </div>
      </div>

      {/* Execution History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-200">Execution History Log ({executions.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Test Case ID</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actual Result</th>
                <th className="p-3">Environment / Build</th>
                <th className="p-3">Type & User</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Defect Link</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No execution records logged yet.
                  </td>
                </tr>
              ) : (
                executions.map((e) => {
                  const statusBadge =
                    e.execution_status === 'Passed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    e.execution_status === 'Failed' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                    e.execution_status === 'Blocked' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-slate-800 text-slate-400';

                  return (
                    <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-indigo-400">{e.test_case_id}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge}`}>
                          {e.execution_status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-200 max-w-xs truncate">{e.actual_result}</td>
                      <td className="p-3 text-slate-400">{e.environment} <span className="text-[10px] text-slate-500">({e.build_version})</span></td>
                      <td className="p-3 text-slate-400">{e.execution_type} • {e.executed_by}</td>
                      <td className="p-3 font-mono text-slate-400">{e.duration_ms || 0}ms</td>
                      <td className="p-3">
                        {e.defect_id ? (
                          <button
                            onClick={() => onNavigateTab('defects')}
                            className="font-mono text-rose-400 font-bold hover:underline flex items-center gap-1"
                          >
                            <Bug className="h-3 w-3" /> {e.defect_id}
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-500 font-mono text-[11px]">
                        {new Date(e.executed_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Playwright Automation Contract Modal */}
      {showAutomationDocs && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Code className="h-4 w-4 text-indigo-400" />
                <span>Playwright / Automation Runner Webhook Integration Contract</span>
              </h3>
              <button onClick={() => setShowAutomationDocs(false)} className="text-slate-400 hover:text-slate-200 text-xs">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Automation frameworks like Playwright, Cypress, or Jest submit execution results directly to DefectLens QA Studio via POST webhook:
              </p>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-indigo-300 overflow-x-auto">
                POST /api/v1/automation/runs
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-200">Sample Payload Schema (JSON):</span>
                <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
{`{
  "projectId": "${project.id}",
  "suiteName": "Playwright E2E Regression",
  "environment": "QA Integration",
  "buildVersion": "v2.4.1-rc1",
  "executedBy": "GitHub Actions CI",
  "results": [
    {
      "testCaseId": "TC-${project.name.slice(0, 3).toUpperCase()}-001",
      "status": "Passed",
      "actualResult": "Element clicked and assertion verified",
      "durationMs": 450,
      "locatorUsed": "button#submit-action"
    },
    {
      "testCaseId": "TC-${project.name.slice(0, 3).toUpperCase()}-002",
      "status": "Failed",
      "actualResult": "504 Gateway Timeout during authentication handshake",
      "durationMs": 15000,
      "errorStack": "TimeoutError: locator.waitFor({ state: 'visible' }) exceeded 15000ms",
      "screenshotUrl": "https://ci-artifacts.example.com/screens/tc-002-fail.png"
    }
  ]
}`}
                </pre>
              </div>

              <div className="bg-indigo-950/30 p-3 rounded-lg border border-indigo-900/60 text-indigo-200 text-[11px]">
                <strong>Automated Defect Triage:</strong> When a failed test case is posted, DefectLens instantly runs the Rule & AI Defect Analyzer, determines completeness, calculates duplicate similarity against existing defects, and generates root cause hypotheses.
              </div>
            </div>

            <div className="text-right pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAutomationDocs(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
