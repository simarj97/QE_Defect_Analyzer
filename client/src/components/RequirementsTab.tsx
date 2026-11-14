import React, { useState } from 'react';
import { Project, Requirement, User } from '../types';
import { FileText, Upload, Save, AlertCircle, CheckCircle2, History, Sparkles, Layers } from 'lucide-react';

interface RequirementsTabProps {
  project: Project;
  requirements: Requirement[];
  activeRequirement: Requirement | null;
  onSaveRequirement: (rawContent: string, format: string, title?: string) => Promise<any>;
  onTriggerAI: (payload?: { rawContent?: string; format?: string; title?: string }) => void;
  isGeneratingAI: boolean;
  currentUser: User;
}

export const RequirementsTab: React.FC<RequirementsTabProps> = ({
  project,
  requirements,
  activeRequirement,
  onSaveRequirement,
  onTriggerAI,
  isGeneratingAI,
  currentUser
}) => {
  const [format, setFormat] = useState<'markdown' | 'text' | 'csv' | 'json'>(activeRequirement?.format || 'markdown');
  const [content, setContent] = useState<string>(activeRequirement?.raw_content || '');
  const [title, setTitle] = useState<string>(`Requirements v${(activeRequirement?.version || 0) + 1}`);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Requirements content cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError(null);
    setSaveResult(null);
    try {
      const result = await onSaveRequirement(content, format, title);
      setSaveResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to save requirements.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    let detectedFormat: 'markdown' | 'text' | 'csv' | 'json' = 'text';
    if (fileName.endsWith('.md')) detectedFormat = 'markdown';
    else if (fileName.endsWith('.json')) detectedFormat = 'json';
    else if (fileName.endsWith('.csv')) detectedFormat = 'csv';

    setFormat(detectedFormat);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (event) => {
      setContent(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Project Metadata Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {project.domain}
              </span>
              <h2 className="text-xl font-bold text-slate-100">{project.name}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">{project.purpose}</p>
          </div>

          <div className="text-right text-xs text-slate-500">
            <div>Target Environments: <span className="text-slate-300 font-medium">{project.target_environments}</span></div>
            <div className="mt-0.5">Browser Coverage: <span className="text-slate-300 font-medium">{project.browser_coverage}</span></div>
          </div>
        </div>

        {/* Scope Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-800">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">✓ In-Scope Features</span>
            <p className="text-slate-300">{project.in_scope || 'Not specified'}</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="font-semibold text-rose-400 block mb-1">✗ Out-of-Scope Exclusions</span>
            <p className="text-slate-400">{project.out_of_scope || 'None specified'}</p>
          </div>
        </div>

        {/* Roles & Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="font-semibold text-indigo-300 block mb-1">User Roles & Actors</span>
            <p className="text-slate-300">{project.user_roles || 'User, Administrator'}</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="font-semibold text-amber-300 block mb-1">Business & Compliance Rules</span>
            <p className="text-slate-300">{project.business_rules || 'Standard validation rules apply.'}</p>
          </div>
        </div>
      </div>

      {/* Requirements Input & Editor */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm text-slate-100">Specification & Requirements Intake</h3>
              <p className="text-xs text-slate-400">Paste or upload requirements in Markdown, Text, CSV, or JSON format.</p>
            </div>
          </div>

          {/* Format Selector & Upload */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 font-medium">Format:</span>
              <select
                className="bg-transparent font-semibold text-indigo-400 focus:outline-none"
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
              >
                <option value="markdown" className="bg-slate-900 text-white">Markdown (.md)</option>
                <option value="text" className="bg-slate-900 text-white">Plain Text (.txt)</option>
                <option value="csv" className="bg-slate-900 text-white">CSV Spreadsheet (.csv)</option>
                <option value="json" className="bg-slate-900 text-white">JSON Document (.json)</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
              <Upload className="h-3.5 w-3.5 text-indigo-400" />
              Upload File
              <input type="file" accept=".md,.txt,.csv,.json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {saveResult && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-200 p-3 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Specification saved as Version {saveResult.requirement.version}!</span>
            </div>
            {saveResult.diff?.hasChanges && (
              <div className="text-[11px] text-amber-300 mt-1">
                Detected changes in specification. {saveResult.flaggedTestCasesCount} test cases were flagged as <span className="font-bold underline">"Needs Review"</span> to ensure alignment.
              </div>
            )}
          </div>
        )}

        {/* Title Input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Specification Document Title</label>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Core Telehealth Requirements v1.2"
          />
        </div>

        {/* Content Textarea */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-medium text-slate-400">Requirements Payload (Untrusted input sanitized on submission)</label>
            <span className="text-[11px] text-slate-500 font-mono">{content.length} characters</span>
          </div>
          <textarea
            className="w-full h-80 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Paste requirement text, user stories, or acceptance criteria here...\n\nExample:\n# Feature Name\n- Requirement details\n- AC: Given [condition], when [action], then [outcome]`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500">
            {activeRequirement ? (
              <span>Active Version: <strong className="text-slate-300">v{activeRequirement.version}</strong> (Uploaded {new Date(activeRequirement.created_at).toLocaleDateString()})</span>
            ) : (
              <span>No requirements baseline saved yet.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5 text-indigo-400" />
              {isSaving ? 'Saving...' : 'Save Specification'}
            </button>

            <button
              onClick={() => onTriggerAI({ rawContent: content, format, title })}
              disabled={isGeneratingAI}
              className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {isGeneratingAI ? 'Running AI Engine...' : 'Run AI Analysis & Generate Tests'}
            </button>
          </div>
        </div>
      </div>

      {/* Parsed Requirement Items Preview */}
      {activeRequirement && activeRequirement.parsed_items && activeRequirement.parsed_items.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>Parsed Structured Requirement Items ({activeRequirement.parsed_items.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Version {activeRequirement.version}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRequirement.parsed_items.map((item, idx) => (
              <div key={item.id || idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-indigo-400 text-[11px]">{item.id}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-medium">{item.type}</span>
                </div>
                <h4 className="font-semibold text-slate-200">{item.title}</h4>
                <p className="text-slate-400 text-[11px] line-clamp-3">{item.description}</p>
                {item.acceptanceCriteria && item.acceptanceCriteria.length > 0 && (
                  <div className="text-[10px] text-emerald-400 bg-emerald-950/40 p-1.5 rounded border border-emerald-900/60 mt-1">
                    ✓ {item.acceptanceCriteria.length} Acceptance Criteria defined
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
