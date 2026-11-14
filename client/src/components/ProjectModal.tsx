import React, { useState } from 'react';
import { Project } from '../types';
import { FolderPlus, X, AlertCircle } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: Partial<Project>) => Promise<void>;
  initialProject?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProject
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(initialProject?.name || '');
  const [domain, setDomain] = useState(initialProject?.domain || 'Healthcare & Life Sciences');
  const [purpose, setPurpose] = useState(initialProject?.purpose || '');
  const [background, setBackground] = useState(initialProject?.background || '');
  const [inScope, setInScope] = useState(initialProject?.in_scope || '');
  const [outOfScope, setOutOfScope] = useState(initialProject?.out_of_scope || '');
  const [userRoles, setUserRoles] = useState(initialProject?.user_roles || 'User, Admin, Supervisor');
  const [businessRules, setBusinessRules] = useState(initialProject?.business_rules || '');
  const [targetEnvironments, setTargetEnvironments] = useState(initialProject?.target_environments || 'QA Integration, Staging, Production');
  const [browserCoverage, setBrowserCoverage] = useState(initialProject?.browser_coverage || 'Chrome 120+, Safari 17+, Firefox 122+, Edge 120+');
  const [appUrl, setAppUrl] = useState(initialProject?.app_url || '');
  const [apiDocsUrl, setApiDocsUrl] = useState(initialProject?.api_docs_url || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!purpose.trim()) {
      setError('Project purpose and background are required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        domain: domain.trim(),
        purpose: purpose.trim(),
        background: background.trim(),
        in_scope: inScope.trim(),
        out_of_scope: outOfScope.trim(),
        user_roles: userRoles.trim(),
        business_rules: businessRules.trim(),
        target_environments: targetEnvironments.trim(),
        browser_coverage: browserCoverage.trim(),
        app_url: appUrl.trim(),
        api_docs_url: apiDocsUrl.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-base text-slate-100">
              {initialProject ? 'Edit Project Settings' : 'Create New QA Project Workspace'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Name & Domain */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Application Name *</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MediCare Telehealth Platform"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Industry Domain</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                <option value="FinTech & Banking">FinTech & Banking</option>
                <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                <option value="Enterprise SaaS & CRM">Enterprise SaaS & CRM</option>
                <option value="Supply Chain & Logistics">Supply Chain & Logistics</option>
                <option value="General Software Application">General Software Application</option>
              </select>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Application Purpose & Problem Statement *</label>
            <textarea
              className="w-full h-16 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Provide HIPAA-compliant patient consultation, medical records access, and e-prescriptions."
              required
            />
          </div>

          {/* Background */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Project Background & Context</label>
            <textarea
              className="w-full h-14 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="High-level architecture, user base, scale, and deployment context."
            />
          </div>

          {/* Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-emerald-400 font-semibold mb-1">In-Scope Features</label>
              <textarea
                className="w-full h-16 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={inScope}
                onChange={(e) => setInScope(e.target.value)}
                placeholder="Core features included in test cycles..."
              />
            </div>
            <div>
              <label className="block text-rose-400 font-semibold mb-1">Out-of-Scope Exclusions</label>
              <textarea
                className="w-full h-16 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={outOfScope}
                onChange={(e) => setOutOfScope(e.target.value)}
                placeholder="Explicitly excluded modules or external systems..."
              />
            </div>
          </div>

          {/* User Roles & Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">User Roles & Actors</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={userRoles}
                onChange={(e) => setUserRoles(e.target.value)}
                placeholder="e.g. Patient, Doctor, Nurse, Admin"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Business & Compliance Rules</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={businessRules}
                onChange={(e) => setBusinessRules(e.target.value)}
                placeholder="e.g. 15min inactivity timeout, 2FA for >$1000"
              />
            </div>
          </div>

          {/* Environments & Browsers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Environments</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={targetEnvironments}
                onChange={(e) => setTargetEnvironments(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Browser Coverage</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={browserCoverage}
                onChange={(e) => setBrowserCoverage(e.target.value)}
              />
            </div>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Application URL (Optional)</label>
              <input
                type="url"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://app.example.com"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">API Documentation URL (Optional)</label>
              <input
                type="url"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={apiDocsUrl}
                onChange={(e) => setApiDocsUrl(e.target.value)}
                placeholder="https://api.example.com/swagger"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Workspace...' : 'Save Project Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
