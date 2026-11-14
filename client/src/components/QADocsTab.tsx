import React, { useState } from 'react';
import { QAArtifact, Project, User } from '../types';
import {
  FileText,
  AlertTriangle,
  Users,
  CheckSquare,
  Compass,
  FileCheck2,
  PieChart,
  Save,
  CheckCircle2,
  Edit3,
  Sparkles,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface QADocsTabProps {
  project: Project;
  artifacts: QAArtifact[];
  onUpdateArtifact: (type: string, content: any, status?: string) => Promise<void>;
  onTriggerAI: () => void;
  isGeneratingAI: boolean;
  currentUser: User;
}

export const QADocsTab: React.FC<QADocsTabProps> = ({
  project,
  artifacts,
  onUpdateArtifact,
  onTriggerAI,
  isGeneratingAI,
  currentUser
}) => {
  const docTypes = [
    { type: 'requirement_analysis', label: 'Requirement Analysis & Gaps', icon: AlertTriangle },
    { type: 'user_stories', label: 'User Stories & Value', icon: Users },
    { type: 'acceptance_criteria', label: 'Acceptance Criteria', icon: CheckSquare },
    { type: 'use_cases', label: 'Use Cases & Flows', icon: Compass },
    { type: 'test_scope', label: 'Test Scope & Matrix', icon: FileCheck2 },
    { type: 'test_plan', label: 'Master Test Plan', icon: FileText },
    { type: 'coverage_report', label: 'AC Coverage Report', icon: PieChart }
  ];

  const [activeType, setActiveType] = useState<string>('requirement_analysis');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const currentArtifact = artifacts.find((a) => a.type === activeType);

  let parsedData: any = null;
  if (currentArtifact) {
    try {
      parsedData = typeof currentArtifact.content === 'string' ? JSON.parse(currentArtifact.content) : currentArtifact.content;
    } catch {
      parsedData = null;
    }
  }

  const startEditing = () => {
    setEditedText(currentArtifact ? (typeof currentArtifact.content === 'string' ? currentArtifact.content : JSON.stringify(currentArtifact.content, null, 2)) : '');
    setIsEditing(true);
    setSaveStatus(null);
  };

  const saveEdits = async (status = 'draft') => {
    try {
      let parsed = editedText;
      try {
        parsed = JSON.parse(editedText);
      } catch {
        // Keep string if not valid JSON
      }
      await onUpdateArtifact(activeType, parsed, status);
      setIsEditing(false);
      setSaveStatus('Document saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top QA Documents Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>AI QA Engineering Documentation</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              {project.name}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review, refine, and approve editable AI-generated specifications, gap analyses, and coverage matrices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerAI}
            disabled={isGeneratingAI}
            className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-3.5 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            {isGeneratingAI ? 'Regenerating...' : 'Regenerate QA Artifacts'}
          </button>
        </div>
      </div>

      {/* Main Tabbed Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Nav Menu */}
        <div className="lg:col-span-1 space-y-1">
          {docTypes.map((doc) => {
            const Icon = doc.icon;
            const isSelected = activeType === doc.type;
            const art = artifacts.find((a) => a.type === doc.type);
            return (
              <button
                key={doc.type}
                onClick={() => {
                  setActiveType(doc.type);
                  setIsEditing(false);
                  setSaveStatus(null);
                }}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-indigo-600/10 border-indigo-500/80 text-indigo-300 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{doc.label}</span>
                </div>
                {art && (
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    art.status === 'approved' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {art.status}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            {/* Header with edit and status */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-100">
                  {docTypes.find((d) => d.type === activeType)?.label}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {currentArtifact ? (
                    <span>Version <strong>v{currentArtifact.version}</strong> • Updated by {currentArtifact.updated_by}</span>
                  ) : (
                    <span>No document generated yet.</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {saveStatus && (
                  <span className="text-xs text-emerald-400 font-semibold">{saveStatus}</span>
                )}
                {!isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={startEditing}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
                      Edit Raw JSON
                    </button>
                    {currentArtifact && currentArtifact.status !== 'approved' && (
                      <button
                        onClick={() => saveEdits('approved')}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve Document
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs px-3 py-1.5 text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdits(currentArtifact?.status || 'draft')}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Draft
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Document Content */}
            {isEditing ? (
              <div>
                <textarea
                  className="w-full h-96 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                />
              </div>
            ) : !parsedData ? (
              <div className="text-center py-12 text-xs text-slate-500">
                <Sparkles className="h-8 w-8 text-indigo-500/40 mx-auto mb-2" />
                No QA artifact generated yet for this section. Click "AI Analyze & Generate" to build editable drafts.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* 1. Requirement Analysis View */}
                {activeType === 'requirement_analysis' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-slate-300">
                      <strong className="text-indigo-400 block mb-1">Executive Summary:</strong>
                      {parsedData.summary}
                    </div>

                    {/* Missing Details */}
                    <div>
                      <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-400" /> Missing Details & Gaps ({parsedData.missingDetails?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {parsedData.missingDetails?.map((m: any, idx: number) => (
                          <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <span className="font-semibold text-amber-300 block">{m.area}</span>
                            <p className="text-slate-300 mt-0.5">{m.description}</p>
                            <div className="text-[11px] text-slate-500 mt-1">Impact: <strong className="text-slate-400">{m.impact}</strong></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ambiguities */}
                    <div>
                      <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                        <HelpCircle className="h-4 w-4 text-blue-400" /> Ambiguities & Dual Interpretations ({parsedData.ambiguities?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {parsedData.ambiguities?.map((a: any, idx: number) => (
                          <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <span className="font-semibold text-blue-300">{a.termOrPhrase}</span>
                            <div className="grid grid-cols-2 gap-2 mt-1.5 text-[11px]">
                              <div className="bg-slate-900 p-2 rounded">Interpretation A: {a.interpretationA}</div>
                              <div className="bg-slate-900 p-2 rounded">Interpretation B: {a.interpretationB}</div>
                            </div>
                            <p className="text-[11px] text-amber-400/90 mt-1.5">Needed: {a.clarificationNeeded}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assumptions Labeled for Approval */}
                    <div>
                      <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 text-purple-400" /> Proposed Assumptions Labeled for Approval ({parsedData.assumptions?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {parsedData.assumptions?.map((assump: any, idx: number) => (
                          <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-purple-900/40">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-purple-400">{assump.id}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                                {assump.status}
                              </span>
                            </div>
                            <p className="text-slate-200 font-medium mt-1">{assump.assumption}</p>
                            <span className="text-[11px] text-slate-500">Basis: {assump.basis}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stakeholder Questions */}
                    <div>
                      <h4 className="font-bold text-slate-200 mb-2">Clarification Questions for Stakeholders</h4>
                      <div className="space-y-1.5">
                        {parsedData.questionsForStakeholders?.map((q: any, idx: number) => (
                          <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                            <div>
                              <span className="font-mono text-indigo-400 font-bold mr-2">{q.questionId}</span>
                              <span className="text-slate-200">{q.question}</span>
                              <span className="text-[10px] text-slate-500 ml-2">({q.recipientRole})</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400">{q.priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. User Stories View */}
                {activeType === 'user_stories' && (
                  <div className="space-y-3">
                    {parsedData.stories?.map((s: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-400">{s.id}</span>
                            {s.isProposedAssumption && (
                              <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded font-bold">Proposed Assumption</span>
                            )}
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300">{s.priority}</span>
                        </div>
                        <p className="text-slate-100 font-semibold">{s.fullStory}</p>
                        <div className="text-[11px] text-slate-400 flex gap-4">
                          <span>Role: <strong>{s.role}</strong></span>
                          <span>Linked Req: <strong className="font-mono text-indigo-300">{s.reqRef}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Acceptance Criteria View */}
                {activeType === 'acceptance_criteria' && (
                  <div className="space-y-3">
                    {parsedData.criteriaList?.map((ac: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-indigo-400">{ac.id}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {ac.category}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-100">{ac.scenario}</h4>
                        <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-slate-300 space-y-1">
                          <div><strong className="text-emerald-400">GIVEN:</strong> {ac.given}</div>
                          <div><strong className="text-blue-400">WHEN:</strong> {ac.when}</div>
                          <div><strong className="text-purple-400">THEN:</strong> {ac.then}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Use Cases View */}
                {activeType === 'use_cases' && (
                  <div className="space-y-4">
                    {parsedData.useCases?.map((uc: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-indigo-400">{uc.id}</span>
                          <span className="text-slate-400">Actor: <strong>{uc.actor}</strong></span>
                        </div>
                        <h4 className="font-bold text-slate-100">{uc.title}</h4>
                        <div className="text-[11px] text-slate-400">
                          <strong>Preconditions:</strong> {uc.preconditions?.join(' • ')}
                        </div>
                        {/* Main flow steps */}
                        <div className="space-y-1 pt-1">
                          <span className="font-semibold text-slate-300 block">Main Flow:</span>
                          {uc.mainFlow?.map((st: any) => (
                            <div key={st.stepNumber} className="bg-slate-900 p-2 rounded text-[11px] flex justify-between">
                              <span>{st.stepNumber}. {st.actorAction}</span>
                              <span className="text-slate-400">→ {st.systemResponse}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. Test Scope View */}
                {activeType === 'test_scope' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="font-bold text-slate-200 block mb-1">Target Environments:</span>
                        <p className="text-slate-300">{parsedData.targetEnvironments?.join(', ')}</p>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="font-bold text-slate-200 block mb-1">Browser Coverage Matrix:</span>
                        <p className="text-slate-300">{parsedData.browserCoverage?.join(', ')}</p>
                      </div>
                    </div>
                    {/* In scope features */}
                    <div>
                      <h4 className="font-bold text-slate-200 mb-2">In-Scope Features ({parsedData.inScopeFeatures?.length || 0})</h4>
                      <div className="space-y-2">
                        {parsedData.inScopeFeatures?.map((f: any, idx: number) => (
                          <div key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between">
                            <div>
                              <span className="font-semibold text-slate-200">{f.featureName}</span>
                              <p className="text-slate-400 text-[11px] mt-0.5">{f.description}</p>
                            </div>
                            <span className="text-[10px] font-bold text-amber-400">{f.riskLevel} Risk</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Test Plan View */}
                {activeType === 'test_plan' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-200 mb-2">Testing Objectives</h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {parsedData.objectives?.map((obj: string, idx: number) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="font-bold text-emerald-400 block mb-1">Entry Criteria:</span>
                        <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
                          {parsedData.entryCriteria?.map((ec: string, idx: number) => <li key={idx}>{ec}</li>)}
                        </ul>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="font-bold text-indigo-400 block mb-1">Exit Quality Gate:</span>
                        <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
                          {parsedData.exitCriteria?.map((xc: string, idx: number) => <li key={idx}>{xc}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Coverage Report View */}
                {activeType === 'coverage_report' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400">Total Acceptance Criteria Evaluated:</span>
                        <div className="text-2xl font-black text-slate-100 mt-0.5">{parsedData.summary?.totalCriteria} Criteria</div>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400">Traceability Coverage:</span>
                        <div className="text-2xl font-black text-emerald-400 mt-0.5">{parsedData.summary?.coveragePercentage}%</div>
                      </div>
                    </div>

                    {/* Uncovered Criteria Alert if any */}
                    {parsedData.uncoveredItems && parsedData.uncoveredItems.length > 0 && (
                      <div>
                        <h4 className="font-bold text-rose-400 mb-2">Uncovered Criteria Gaps ({parsedData.uncoveredItems.length})</h4>
                        <div className="space-y-1.5">
                          {parsedData.uncoveredItems.map((u: any, idx: number) => (
                            <div key={idx} className="bg-rose-950/40 p-2.5 rounded border border-rose-900 text-rose-200">
                              <span className="font-mono font-bold mr-2">{u.criterionId}</span>
                              <span>{u.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
