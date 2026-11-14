# DefectLens QA Studio
### Enterprise AI-Powered Multi-Project Quality Engineering Platform

**DefectLens QA Studio** is an enterprise AI-powered QA platform designed to support multiple applications and project domains. It accelerates quality engineering across the full lifecycle:

```
Create Project → Provide Requirements → Analyze Gaps → Generate QA Artifacts & Tests → Review & Approve → Sync to Monday CRM → Record Executions → View Defect Intelligence
```

---

## 🌟 Core Platform Features

### 1. Multi-Project Management & Domain Isolation
- **Multi-Tenant Project Isolation:** Configure distinct applications across domains (e.g. Healthcare, FinTech, E-Commerce, Enterprise SaaS).
- **Comprehensive Project Inputs:** Application purpose, background, in-scope features, out-of-scope exclusions, user roles, business rules, target environments, and browser coverage.
- **Specification Validation:** An application URL alone is never treated as a complete specification; explicit scope and functional rules are enforced.
- **Untrusted Input Protection:** Sanitizes input against script injections and automatically masks credentials, API keys, and JWT tokens from prompts, logs, and exports.

### 2. AI Quality Analysis & Editable QA Artifacts
Analyzes requirements and generates editable structured drafts for:
1. **Requirement Analysis:** Missing details, ambiguities, contradictions, proposed assumptions (labeled for user approval), and stakeholder clarification questions.
2. **User Stories:** Role, goal, and business value.
3. **Acceptance Criteria:** Observable functional, security, and performance expectations in Given/When/Then scenarios.
4. **Use Cases:** Actor, preconditions, main flow steps, alternative flows, and outcomes.
5. **Test Scope:** In-scope modules, integration touchpoints, target environments, and exclusions.
6. **Master Test Plan:** Objectives, manual/automation/security approach, responsibilities, timeline, and entry/exit quality gates.
7. **Structured Test Cases:** Positive, Negative, Boundary, Integration, and Security scenarios.
8. **Acceptance Criteria Coverage Matrix:** Full traceability linking criteria to tests and highlighting uncovered gaps.

*Rule: Proposed business assumptions are explicitly labeled with `requiresApproval: true` and `status: 'PROPOSED_FOR_APPROVAL'`.*

### 3. Test Case Lifecycle & Versioning
- **Structured Fields:** Test ID, Title, Project, Feature, Requirement Refs, Story Refs, AC Refs, Preconditions, Test Data, Numbered Steps, Expected Result, Test Type, Priority, and Review Status.
- **Approval Workflow:** `Draft` → `Approved` / `Needs Review` / `Rejected` (governed by RBAC).
- **Specification Change Impact Tracking:** When requirements are modified, the change detection engine flags affected test cases as `Needs Review` with actionable reasons.
- **Version History:** Tracks historical snapshots on every revision.
- **Exporting:** One-click export to CSV and JSON formats.

### 4. Monday.com Enterprise CRM Integration
- **Per-Project Configuration:** Independent board IDs, API tokens, and column mappings.
- **Stable External IDs:** Embeds `[TC-xxx]` external identifiers preventing duplicate pulse creation.
- **Safe Sync Execution:** Synchronizes approved test cases, stores live Monday item IDs and URLs, and applies a 3-attempt backoff retry on network timeouts (HTTP 429 / 500+).
- **Backend Credential Security:** Tokens remain on the backend and are masked in UI responses. Simulated sync is never reported as live success.

### 5. Execution Engine & Defect Intelligence
- **Execution Tracking:** Records manual runs with Actual Results, Environment, Build Version, and Evidence.
- **Playwright / CI Automation Webhook Contract:** REST API endpoint (`POST /api/v1/automation/runs`) accepting test logs, execution durations, locators, and screenshots directly from test runners.
- **Automated Defect Draft Preparation:** Automatically drafts reviewable defects on failed executions with Expected vs Actual results.
- **Defect Analyzer Adapter:** Invokes core completeness scoring, duplicate Jaccard token detection, blocker heuristics, and synthesizes clearly labeled AI/Rule root cause hypotheses.

### 6. Executive & Cross-Project Dashboard
- **Quality Disclaimer:** Clearly communicates that generated test volume does not equate to tested release readiness.
- **Metrics Breakdown:** Generated vs. Approved test counts, Acceptance criteria coverage %, Execution pass rates, Open defects by severity, Blocked test runs, Monday CRM sync status, and the "Needs Review" queue.
- **Cross-Project Portfolio View:** High-level executive view comparing health across all managed workspaces.

### 7. Role-Based Access Control (RBAC)
- **Admin:** Full platform control (Project creation/deletion, Monday configuration, test approval, user management).
- **QA Lead:** QA lifecycle control (Requirements authoring, AI generation, test approval, Monday sync, defect management).
- **QA Engineer:** Execution & authoring (Draft test cases, manual & automated execution logging, defect creation).
- **Viewer:** Stakeholder read-only access to dashboards, test suites, and exports.

---

## 🚀 Quickstart & Setup Instructions

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0

### 1. Installation
```bash
# Clone and enter directory
cd defectlens-node

# Install dependencies
npm install
```

### 2. Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Key environment variables in `.env`:
- `HOST`: Bind address (default `127.0.0.1`)
- `PORT`: Server port (default `3000`)
- `AI_PROVIDER`: `local-rules` (built-in offline deterministic domain QA generator) or `openai` / `anthropic` / `watsonx`
- `OPENAI_API_KEY`: API key if using OpenAI GPT-4o
- `MONDAY_API_TOKEN`: Default Monday.com API token (optional)
- `MONDAY_BOARD_ID`: Default Monday.com Board ID (optional)
- `DB_FILE`: Path to database file (default `./data/defectlens_db.json`)

### 3. Build & Run
```bash
# Build Vite React frontend
npm run build

# Start DefectLens QA Studio server
npm start
```

Open your browser at: **`http://localhost:3000`**

### 4. Running Automated Tests
```bash
npm test
```

---

## 📦 Seeded Example Projects

The platform comes pre-seeded with two projects from distinct domains:

1. **MediCare Telehealth & Patient Portal (Healthcare & Life Sciences)**
   - *Scope:* Patient appointment booking, WebRTC video consultation room, EHR access, digital e-prescriptions, HIPAA audit logging.
   - *Includes:* Pre-generated QA documents, approved test cases (`TC-MED-001` to `TC-MED-004`), Playwright execution logs, and defect analysis for WebRTC timeout on Safari iOS.

2. **ApexPay Remittance & Wire Transfers (FinTech & Banking)**
   - *Scope:* Guaranteed 120s FX quote locking, wire transfer authorization, mandatory 2FA on >$1,000 USD, AML/OFAC sanctions screening.
   - *Includes:* Pre-generated QA documents, test cases (`TC-APE-001` to `TC-APE-004`), execution runs, and defect triage for 2FA currency conversion bypass.

---

## 🔌 Automation Runner Webhook Contract

Submit automated test results from Playwright, Cypress, or CI/CD runners:

```http
POST /api/v1/automation/runs
Content-Type: application/json

{
  "projectId": "proj_medicare_telehealth",
  "suiteName": "Playwright Telehealth E2E Regression",
  "environment": "QA Integration",
  "buildVersion": "v2.4.1-rc1",
  "executedBy": "GitHub Actions CI",
  "results": [
    {
      "testCaseId": "TC-MED-001",
      "status": "Passed",
      "actualResult": "Appointment slot locked in 240ms.",
      "durationMs": 1250,
      "locatorUsed": "button#confirm-booking"
    },
    {
      "testCaseId": "TC-MED-002",
      "status": "Failed",
      "actualResult": "504 Gateway Timeout during WebRTC connection",
      "durationMs": 15200,
      "errorStack": "TimeoutError: locator.waitFor exceeded 15000ms",
      "screenshotUrl": "https://ci-artifacts.example.com/tc002.png"
    }
  ]
}
```

---

## 📂 File Architecture

```
defectlens-node/
├── client/                     # React + TypeScript + Tailwind UI
│   ├── src/
│   │   ├── components/         # Tabbed components (Dashboard, Requirements, QADocs, TestCases, Execution, Defects, MondaySync)
│   │   ├── api.ts              # Type-safe API client
│   │   ├── types.ts            # Domain and QA data models
│   │   ├── App.tsx             # Root QA Studio application
│   │   └── main.tsx            # Vite React entry point
│   └── index.html
├── src/                        # Node.js backend services
│   ├── app.js                  # Express API router & middleware
│   ├── auth/rbac.js            # Role-Based Access Control & token manager
│   ├── db/
│   │   ├── storage.js          # Unified transactional persistence engine
│   │   └── seed.js             # Seed data generator for Healthcare & FinTech
│   └── services/
│       ├── ai/                 # AI QA generation engine & multi-provider adapter
│       ├── requirements/       # Parser (MD/CSV/JSON), sanitizer & change tracker
│       ├── testCases/          # Test case management & CSV/JSON export
│       ├── executions/         # Execution manager & Playwright automation contract
│       ├── defects/            # Defect analyzer adapter with root cause hypotheses
│       ├── monday/             # Monday.com sync service with retry mechanism
│       └── dashboard/          # Metric aggregation & cross-project portfolio service
├── migrations/
│   └── 001_initial_schema.sql  # SQL schema definition
├── examples/                   # Sample exports and Playwright payloads
├── server.js                   # Unified server entry point
├── analyzer.js                 # Rule-based defect analyzer core
├── monday.js                   # Monday.com GraphQL client core
└── test/
    ├── app.test.js             # Legacy backward compatibility test suite
    └── ai_qa_studio.test.js    # Comprehensive multi-project AI QA test suite
```

---

## 🔒 Security & Data Integrity

- **Untrusted Input Sanitization:** All requirement inputs and CSV/JSON uploads are stripped of malicious tags.
- **Secrets Redaction:** API keys, Bearer tokens, and JWT strings are masked before passing to AI adapters or logs.
- **Backend Credential Isolation:** Third-party credentials (e.g. Monday API keys) remain exclusively on the backend server.
- **Host & Origin Guards:** Same-origin enforcement on mutative browser requests.
