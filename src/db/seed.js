import { QAArtifactGenerator } from '../services/ai/generator.js';
import { parseRequirements } from '../services/requirements/parser.js';
import { INITIAL_USERS } from '../auth/rbac.js';

export async function createSeedData() {
  const generator = new QAArtifactGenerator();

  // Project 1: Healthcare Domain
  const healthcareProject = {
    id: 'proj_medicare_telehealth',
    name: 'MediCare Telehealth & Patient Portal',
    domain: 'Healthcare & Life Sciences',
    purpose: 'Provide HIPAA-compliant patient consultation, medical records access, appointment booking, and digital e-prescriptions.',
    background: 'MediCare delivers secure telehealth consultations connecting certified clinicians with over 500,000 enrolled patients across hospital networks.',
    in_scope: 'Patient onboarding, Video consultation room, Electronic Health Record (EHR) viewer, Prescription dispatch to partner pharmacies, Two-Factor Authentication (2FA).',
    out_of_scope: 'Direct billing to private health insurance clearinghouses (handled by third-party billing gateway), Physical medical device hardware firmware.',
    user_roles: 'Patient, Licensed Physician, Clinical Nurse, HIPAA Compliance Officer, System Administrator',
    business_rules: 'All session tokens expire after 15 minutes of inactivity; EHR data must be encrypted with AES-256; Prescriptions require physician digital signature; Patient consent for telehealth recording must be logged.',
    target_environments: 'QA Staging, HIPAA-Compliant Sandbox, Production US-East',
    browser_coverage: 'Chrome 120+, Safari 17+ (macOS/iOS), Firefox 122+, Edge 120+',
    app_url: 'https://telehealth.medicare-demo.org',
    api_docs_url: 'https://api.medicare-demo.org/v2/swagger',
    created_at: new Date('2026-11-01T10:00:00Z').toISOString(),
    updated_at: new Date('2026-11-01T10:00:00Z').toISOString()
  };

  const healthcareRawReq = `# MediCare Telehealth Platform Specification
## 1. Patient Appointment Booking
- Patients can view clinician availability by specialty and select an open 30-minute time slot.
- The system must prevent double-booking of any clinician calendar.
- AC: Given a patient selects an available doctor slot, when booking is submitted, then the slot is immediately locked and confirmation email/SMS is dispatched.

## 2. Secure Video Consultation Room
- Clinicians and patients can join an encrypted WebRTC video room up to 10 minutes prior to appointment time.
- The video room must verify user authentication and consent before opening media streams.
- AC: Given both participants have joined, when connection stabilizes, then end-to-end encrypted audio and video streams must render with <300ms latency.

## 3. Electronic Prescription Dispatch
- Licensed physicians can create an e-prescription and digitally sign it with their medical PIN.
- The system validates drug interaction conflicts against the patient's existing allergy record before transmission.
- AC: Given a valid prescription, when physician signs with verified PIN, then prescription payload is securely transmitted to the pharmacy gateway.`;

  const healthcareParsed = parseRequirements({ format: 'markdown', content: healthcareRawReq });
  const healthcareReq = {
    id: 'req_hc_001',
    project_id: healthcareProject.id,
    version: 1,
    title: 'MediCare Core Telehealth & eRx Requirements v1.0',
    format: 'markdown',
    raw_content: healthcareRawReq,
    parsed_items: healthcareParsed.parsedItems,
    is_active: 1,
    created_by: 'Sarah Connor (QA Lead)',
    created_at: new Date('2026-11-01T10:30:00Z').toISOString()
  };

  const hcGenerated = await generator.generateAll(healthcareProject, healthcareReq);

  // Project 2: FinTech Domain
  const fintechProject = {
    id: 'proj_apexpay_remittance',
    name: 'ApexPay Cross-Border Remittance & Wire Transfers',
    domain: 'FinTech & Banking',
    purpose: 'Enable instant, multi-currency international money transfers with automated FX rate locking, AML screening, and SWIFT/FedNow settlement.',
    background: 'ApexPay processes cross-border remittances across 40+ currency corridors, serving enterprise clients and retail remittance senders globally.',
    in_scope: 'Real-time FX quote lock, Multi-currency wallet balances, Wire transfer authorization, AML/Sanction screening against OFAC lists, Instant payout webhooks.',
    out_of_scope: 'Cryptocurrency custody and physical cash pickup agents.',
    user_roles: 'Sender / Account Holder, Compliance Analyst, Treasury Manager, API Partner Developer',
    business_rules: 'Transactions over $1,000 USD require mandatory 2FA; FX rates are locked for exactly 120 seconds; Sender name must be screened against sanction watchlists before debit; Daily velocity limit is $25,000 USD per verified account.',
    target_environments: 'FinTech Sandbox, ISO20022 Integration Testbed, PCI-DSS Level 1 Production',
    browser_coverage: 'Chrome 120+, Safari 17+, Firefox 122+, Edge 120+, Mobile Chrome/Safari',
    app_url: 'https://app.apexpay-transfer.io',
    api_docs_url: 'https://docs.apexpay-transfer.io/api-reference',
    created_at: new Date('2026-11-02T09:00:00Z').toISOString(),
    updated_at: new Date('2026-11-02T09:00:00Z').toISOString()
  };

  const fintechRawReq = `# ApexPay Cross-Border Remittance Specification
## 1. Instant FX Rate Quote & Lock
- Senders can request a guaranteed foreign exchange conversion rate between source and destination currencies.
- The system guarantees the quoted exchange rate for exactly 120 seconds.
- AC: Given sender requests conversion from USD to EUR, when quote is rendered, then countdown timer starts from 120s and rate cannot fluctuate until expiry.

## 2. Multi-Currency Wire Transfer Submission
- Senders can initiate a wire transfer funded from their fiat wallet or linked bank account.
- Transfers above $1,000 USD require 2FA SMS/TOTP authentication.
- AC: Given transfer amount exceeds $1,000 USD, when user clicks submit, then 2FA prompt appears before any debit occurs.

## 3. AML & OFAC Sanctions Screening
- All beneficiary names and routing identifiers must be screened in real time against international sanction lists.
- Matches with >85% confidence score must be held for Compliance Analyst review.
- AC: Given a beneficiary name matching a sanctioned entity, when transfer is evaluated, then status changes to 'Held - Compliance Review' and transaction debit is suspended.`;

  const fintechParsed = parseRequirements({ format: 'markdown', content: fintechRawReq });
  const fintechReq = {
    id: 'req_ft_001',
    project_id: fintechProject.id,
    version: 1,
    title: 'ApexPay Remittance Core Specification v1.0',
    format: 'markdown',
    raw_content: fintechRawReq,
    parsed_items: fintechParsed.parsedItems,
    is_active: 1,
    created_by: 'Sarah Connor (QA Lead)',
    created_at: new Date('2026-11-02T09:30:00Z').toISOString()
  };

  const ftGenerated = await generator.generateAll(fintechProject, fintechReq);

  // Mark half of test cases as Approved, half as Draft
  const hcTestCases = hcGenerated.testCases.map((tc, idx) => ({
    ...tc,
    project_id: healthcareProject.id,
    review_status: idx % 2 === 0 ? 'Approved' : 'Draft',
    monday_sync_status: idx % 2 === 0 ? 'synced' : 'not_synced',
    monday_item_id: idx % 2 === 0 ? `70102030${idx}` : null,
    monday_link: idx % 2 === 0 ? `https://monday.com/boards/4017071689/pulses/70102030${idx}` : null,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const ftTestCases = ftGenerated.testCases.map((tc, idx) => ({
    ...tc,
    project_id: fintechProject.id,
    review_status: idx % 2 === 0 ? 'Approved' : 'Draft',
    monday_sync_status: idx % 2 === 0 ? 'synced' : 'not_synced',
    monday_item_id: idx % 2 === 0 ? `80203040${idx}` : null,
    monday_link: idx % 2 === 0 ? `https://monday.com/boards/4017071689/pulses/80203040${idx}` : null,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  // Seed QA Artifacts
  const artifacts = [
    {
      id: `art_hc_req_analysis`,
      project_id: healthcareProject.id,
      requirement_version: 1,
      type: 'requirement_analysis',
      title: 'Requirement Gap & Ambiguity Analysis',
      content: JSON.stringify(hcGenerated.requirementAnalysis, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_hc_user_stories`,
      project_id: healthcareProject.id,
      requirement_version: 1,
      type: 'user_stories',
      title: 'User Stories with Business Value',
      content: JSON.stringify(hcGenerated.userStories, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_hc_acceptance_criteria`,
      project_id: healthcareProject.id,
      requirement_version: 1,
      type: 'acceptance_criteria',
      title: 'Acceptance Criteria (Gherkin Scenarios)',
      content: JSON.stringify(hcGenerated.acceptanceCriteria, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_hc_use_cases`,
      project_id: healthcareProject.id,
      requirement_version: 1,
      type: 'use_cases',
      title: 'Use Cases & Flow Models',
      content: JSON.stringify(hcGenerated.useCases, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_hc_test_scope`,
      project_id: healthcareProject.id,
      requirement_version: 1,
      type: 'test_scope',
      title: 'Test Scope & Browser Coverage Matrix',
      content: JSON.stringify(hcGenerated.testScope, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_hc_test_plan`,
      project_id: healthcareProject.id,
      requirement_version: 1,
      type: 'test_plan',
      title: 'Master Test Plan & Quality Gate',
      content: JSON.stringify(hcGenerated.testPlan, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_hc_coverage`,
      project_id: healthcareProject.id,
      requirement_version: 1,
      type: 'coverage_report',
      title: 'Acceptance Criteria Coverage Matrix',
      content: JSON.stringify(hcGenerated.coverageReport, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    // FinTech Artifacts
    {
      id: `art_ft_req_analysis`,
      project_id: fintechProject.id,
      requirement_version: 1,
      type: 'requirement_analysis',
      title: 'Requirement Gap & Ambiguity Analysis',
      content: JSON.stringify(ftGenerated.requirementAnalysis, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_ft_user_stories`,
      project_id: fintechProject.id,
      requirement_version: 1,
      type: 'user_stories',
      title: 'User Stories with Business Value',
      content: JSON.stringify(ftGenerated.userStories, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_ft_acceptance_criteria`,
      project_id: fintechProject.id,
      requirement_version: 1,
      type: 'acceptance_criteria',
      title: 'Acceptance Criteria (Gherkin Scenarios)',
      content: JSON.stringify(ftGenerated.acceptanceCriteria, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_ft_use_cases`,
      project_id: fintechProject.id,
      requirement_version: 1,
      type: 'use_cases',
      title: 'Use Cases & Flow Models',
      content: JSON.stringify(ftGenerated.useCases, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_ft_test_scope`,
      project_id: fintechProject.id,
      requirement_version: 1,
      type: 'test_scope',
      title: 'Test Scope & Browser Coverage Matrix',
      content: JSON.stringify(ftGenerated.testScope, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_ft_test_plan`,
      project_id: fintechProject.id,
      requirement_version: 1,
      type: 'test_plan',
      title: 'Master Test Plan & Quality Gate',
      content: JSON.stringify(ftGenerated.testPlan, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    },
    {
      id: `art_ft_coverage`,
      project_id: fintechProject.id,
      requirement_version: 1,
      type: 'coverage_report',
      title: 'Acceptance Criteria Coverage Matrix',
      content: JSON.stringify(ftGenerated.coverageReport, null, 2),
      version: 1,
      status: 'approved',
      updated_by: 'Sarah Connor (QA Lead)',
      updated_at: new Date().toISOString()
    }
  ];

  // Seed sample executions and defects
  const executions = [
    {
      id: 'exec_hc_001',
      project_id: healthcareProject.id,
      test_case_id: hcTestCases[0].id,
      run_id: 'run_playwright_e2e_hc_01',
      execution_status: 'Passed',
      actual_result: 'Appointment slot selected and locked successfully in 240ms.',
      environment: 'QA Staging',
      build_version: 'v2.4.1-rc1',
      evidence: 'Playwright trace logs: all assertions passed.',
      execution_type: 'playwright',
      executed_by: 'Alex Rivera (QA Engineer)',
      duration_ms: 1250,
      defect_id: null,
      executed_at: new Date('2026-11-10T14:20:00Z').toISOString()
    },
    {
      id: 'exec_hc_002',
      project_id: healthcareProject.id,
      test_case_id: hcTestCases[1]?.id || hcTestCases[0].id,
      run_id: 'run_playwright_e2e_hc_01',
      execution_status: 'Failed',
      actual_result: '504 Gateway Timeout during WebRTC peer negotiation on Safari iOS 17.',
      environment: 'QA Staging',
      build_version: 'v2.4.1-rc1',
      evidence: 'Error Stack: WebRTC iceConnectionState transitioned to failed after 15000ms.\nLocator: button#start-video-consultation',
      execution_type: 'playwright',
      executed_by: 'Alex Rivera (QA Engineer)',
      duration_ms: 15200,
      defect_id: 'DEF-HC-001',
      executed_at: new Date('2026-11-10T14:22:00Z').toISOString()
    },
    {
      id: 'exec_ft_001',
      project_id: fintechProject.id,
      test_case_id: ftTestCases[0].id,
      run_id: 'run_playwright_e2e_ft_01',
      execution_status: 'Passed',
      actual_result: 'USD to EUR quote rendered and locked for exactly 120s.',
      environment: 'FinTech Sandbox',
      build_version: 'v1.8.0-b2',
      evidence: 'API response 200 OK; FX timer verified.',
      execution_type: 'playwright',
      executed_by: 'Alex Rivera (QA Engineer)',
      duration_ms: 980,
      defect_id: null,
      executed_at: new Date('2026-11-11T11:00:00Z').toISOString()
    },
    {
      id: 'exec_ft_002',
      project_id: fintechProject.id,
      test_case_id: ftTestCases[1]?.id || ftTestCases[0].id,
      run_id: 'run_manual_ft_01',
      execution_status: 'Failed',
      actual_result: 'Payment transfer over $1,000 bypassed 2FA OTP prompt when currency was JPY.',
      environment: 'FinTech Sandbox',
      build_version: 'v1.8.0-b2',
      evidence: 'Amount 150,000 JPY (~$1,005 USD) submitted without 2FA prompt.',
      execution_type: 'manual',
      executed_by: 'Sarah Connor (QA Lead)',
      duration_ms: 4500,
      defect_id: 'DEF-FT-001',
      executed_at: new Date('2026-11-11T11:15:00Z').toISOString()
    }
  ];

  const defects = [
    {
      id: 'DEF-HC-001',
      project_id: healthcareProject.id,
      test_case_id: hcTestCases[1]?.id || hcTestCases[0].id,
      execution_id: 'exec_hc_002',
      title: '[Execution Failure] WebRTC Video Consultation 504 Timeout on Safari iOS',
      description: 'WebRTC video room connection times out during ICE candidate negotiation when joining from Safari iOS.',
      steps: '1. Open Telehealth consultation link in Safari on iOS 17.\n2. Tap "Join Video Consultation".\n3. Wait for physician connection.',
      expected: 'Encrypted video stream renders within 5 seconds.',
      actual: 'Video room hangs for 15s and returns 504 Gateway Timeout error.',
      environment: 'QA Staging',
      build_version: 'v2.4.1-rc1',
      severity: 'Critical',
      status: 'Open',
      analysis: {
        completeness: 100,
        missing: [],
        duplicates: [],
        suggestedSeverity: 'Critical',
        severityReason: 'High impact on core patient consultation journey on mobile browsers.',
        observations: ['Reproduction confirmed on WebKit / iOS 17.'],
        rootCause: 'ICE candidate gathering failed over UDP on restricted cellular NAT.',
        reviewRequired: true,
        analyzedAt: new Date().toISOString()
      },
      hypotheses: [
        {
          id: 'HYP-01',
          label: 'HYPOTHESIS [TURN Relay Fallback Required]',
          confidence: 'High',
          explanation: 'Cellular network firewall blocks direct P2P UDP media stream; TURN TCP fallback server was not reachable or unconfigured.',
          recommendedCheck: 'Inspect STUN/TURN server credentials and verify port 443 TCP fallback availability.'
        }
      ],
      monday_item_id: '701020301',
      monday_link: 'https://monday.com/boards/4017071689/pulses/701020301',
      created_at: new Date('2026-11-10T14:25:00Z').toISOString(),
      updated_at: new Date('2026-11-10T14:25:00Z').toISOString()
    },
    {
      id: 'DEF-FT-001',
      project_id: fintechProject.id,
      test_case_id: ftTestCases[1]?.id || ftTestCases[0].id,
      execution_id: 'exec_ft_002',
      title: '[Security Defect] Transfer over $1,000 USD Equivalent in JPY Bypasses 2FA Challenge',
      description: 'The 2FA validation check strictly checks numeric amount > 1000 without USD currency conversion calculation, allowing non-USD currencies with smaller unit values (e.g. JPY, KRW) to bypass 2FA.',
      steps: '1. Log into ApexPay account with JPY wallet.\n2. Initiate transfer of 150,000 JPY (~$1,005 USD).\n3. Submit transfer.',
      expected: 'System triggers mandatory 2FA OTP prompt because equivalent value exceeds $1,000 USD.',
      actual: 'Transfer processed instantly without 2FA prompt.',
      environment: 'FinTech Sandbox',
      build_version: 'v1.8.0-b2',
      severity: 'Critical',
      status: 'Open',
      analysis: {
        completeness: 100,
        missing: [],
        duplicates: [],
        suggestedSeverity: 'Critical',
        severityReason: 'Payment security threshold bypass violates PSD2 / SCA compliance rules.',
        observations: ['High risk security gap requiring immediate patch.'],
        rootCause: 'Amount comparison logic does not convert target currency into USD base equivalent before threshold evaluation.',
        reviewRequired: true,
        analyzedAt: new Date().toISOString()
      },
      hypotheses: [
        {
          id: 'HYP-01',
          label: 'HYPOTHESIS [Missing USD Base Normalization in 2FA Evaluator]',
          confidence: 'High',
          explanation: 'The backend validation guard checks `amount > 1000` instead of `convertToUsdBase(amount, currency) > 1000`.',
          recommendedCheck: 'Inspect PaymentAuthorizationService.validate2FARequirement() and ensure normalized USD base conversion is used.'
        }
      ],
      monday_item_id: '802030401',
      monday_link: 'https://monday.com/boards/4017071689/pulses/802030401',
      created_at: new Date('2026-11-11T11:20:00Z').toISOString(),
      updated_at: new Date('2026-11-11T11:20:00Z').toISOString()
    }
  ];

  const mondayConfigs = [
    {
      project_id: healthcareProject.id,
      token: process.env.MONDAY_API_TOKEN || '',
      board_id: process.env.MONDAY_BOARD_ID || '4017071689',
      version: '2026-10',
      column_map: JSON.stringify({ steps: 'steps', expected: 'expected' }),
      status_map: JSON.stringify({ Approved: 'Approved', Draft: 'Draft' }),
      is_enabled: 1,
      last_sync_at: new Date('2026-11-10T14:30:00Z').toISOString(),
      last_sync_status: 'success',
      last_sync_error: null
    },
    {
      project_id: fintechProject.id,
      token: process.env.MONDAY_API_TOKEN || '',
      board_id: process.env.MONDAY_BOARD_ID || '4017071689',
      version: '2026-10',
      column_map: JSON.stringify({ steps: 'steps', expected: 'expected' }),
      status_map: JSON.stringify({ Approved: 'Approved', Draft: 'Draft' }),
      is_enabled: 1,
      last_sync_at: new Date('2026-11-11T11:30:00Z').toISOString(),
      last_sync_status: 'success',
      last_sync_error: null
    }
  ];

  return {
    projects: [healthcareProject, fintechProject],
    requirements: [healthcareReq, fintechReq],
    qa_artifacts: artifacts,
    test_cases: [...hcTestCases, ...ftTestCases],
    test_executions: executions,
    defects,
    monday_configs: mondayConfigs,
    users: INITIAL_USERS
  };
}
