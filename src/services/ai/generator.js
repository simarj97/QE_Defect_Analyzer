import {
  RequirementAnalysisSchema,
  UserStorySchema,
  AcceptanceCriteriaSchema,
  UseCaseSchema,
  TestScopeSchema,
  TestPlanSchema,
  TestCasesListSchema,
  CoverageReportSchema
} from './schemas.js';
import { AIAdapter } from './adapter.js';

export class QAArtifactGenerator {
  constructor(aiAdapter = new AIAdapter()) {
    this.ai = aiAdapter;
  }

  async generateAll(project, requirement) {
    const analysis = await this.generateRequirementAnalysis(project, requirement);
    const stories = await this.generateUserStories(project, requirement, analysis);
    const acceptanceCriteria = await this.generateAcceptanceCriteria(project, requirement, stories);
    const useCases = await this.generateUseCases(project, requirement, stories, acceptanceCriteria);
    const testScope = await this.generateTestScope(project, requirement);
    const testPlan = await this.generateTestPlan(project, requirement, testScope);
    const testCases = await this.generateTestCases(project, requirement, stories, acceptanceCriteria);
    const coverageReport = await this.generateCoverageReport(project, acceptanceCriteria, testCases);

    return {
      requirementAnalysis: analysis,
      userStories: stories,
      acceptanceCriteria,
      useCases,
      testScope,
      testPlan,
      testCases,
      coverageReport
    };
  }

  async generateRequirementAnalysis(project, requirement) {
    const items = requirement.parsed_items || [];
    const domain = project.domain || 'Software Application';
    const isHealthcare = /health|patient|telehealth|doctor|medical|clinic/i.test(domain + ' ' + project.name);
    const isFintech = /fintech|bank|payment|remittance|transfer|wire|currency|wallet|crypto/i.test(domain + ' ' + project.name);

    // Dynamic generation from actual user input items
    const missingDetails = [];
    const ambiguities = [];
    const contradictions = [];
    const assumptions = [];
    const questions = [];

    // Analyze gaps across user's parsed items
    items.forEach((item, idx) => {
      // Check if item has short description or lacks error states
      if (!item.description || item.description.length < 50) {
        missingDetails.push({
          area: `Error Handling & Edge Cases for "${item.title}"`,
          description: `The specification for "${item.title}" does not detail fallback behavior under system exceptions or network degradation.`,
          impact: 'Potential unhandled exceptions and undefined user experience during partial system failures.',
          proposedResolution: `Define retry timeout intervals, exponential backoff, and user-facing error copy for ${item.title}.`
        });
      }

      // Check for ambiguities in item title/description
      if (/fast|quick|instant|reliable|secure|real-?time|high performance/i.test(item.description + ' ' + item.title)) {
        ambiguities.push({
          termOrPhrase: `"${item.title}" performance / latency SLA`,
          interpretationA: 'Synchronous real-time blocking operation completed within sub-second SLA (<500ms).',
          interpretationB: 'Asynchronous queued background worker with eventual consistency notification.',
          clarificationNeeded: `Quantify non-functional latency and throughput benchmarks for ${item.title}.`
        });
      }
    });

    // Check project-level inputs
    if (project.business_rules) {
      assumptions.push({
        id: `ASSUME-${project.name.slice(0, 3).toUpperCase()}-01`,
        assumption: `The platform strictly enforces configured business rules: "${project.business_rules.slice(0, 100)}" across all client interfaces.`,
        basis: 'Provided project business rule specification.',
        status: 'PROPOSED_FOR_APPROVAL',
        requiresApproval: true
      });
    } else {
      assumptions.push({
        id: `ASSUME-${project.name.slice(0, 3).toUpperCase()}-01`,
        assumption: 'All API communications mandate TLS 1.3 encryption and OAuth2/JWT token authorization headers.',
        basis: 'Enterprise security baseline recommendation.',
        status: 'PROPOSED_FOR_APPROVAL',
        requiresApproval: true
      });
    }

    if (project.user_roles) {
      questions.push({
        questionId: `Q-${project.name.slice(0, 3).toUpperCase()}-101`,
        recipientRole: 'Product Owner / Security Lead',
        question: `How are role-based access privileges partitioned among defined user roles (${project.user_roles})?`,
        priority: 'High'
      });
    }

    // Domain-specific intelligence additions
    if (isHealthcare) {
      missingDetails.push({
        area: 'HIPAA & PHI Audit Logging Retention',
        description: 'Requirements do not detail audit retention policy for patient electronic health record access.',
        impact: 'Compliance vulnerability under healthcare data privacy regulations.',
        proposedResolution: 'Add explicit 7-year audit logging and AES-256 field-level encryption requirements.'
      });
      assumptions.push({
        id: 'ASSUME-HC-02',
        assumption: 'All patient session tokens expire after 15 minutes of inactivity per HIPAA guidelines.',
        basis: 'Standard healthcare compliance benchmark.',
        status: 'PROPOSED_FOR_APPROVAL',
        requiresApproval: true
      });
    } else if (isFintech) {
      missingDetails.push({
        area: 'AML / KYC Thresholds & Currency Precision',
        description: 'Transfer limits, sanctioned country lists, and FX precision rounding are not fully defined.',
        impact: 'Potential financial reconciliation discrepancies and regulatory penalties.',
        proposedResolution: 'Specify decimal rounding standard and daily transfer velocity limits.'
      });
      assumptions.push({
        id: 'ASSUME-FT-02',
        assumption: 'Two-Factor Authentication (2FA) is mandatory for financial operations exceeding threshold limits.',
        basis: 'PSD2 / Strong Customer Authentication (SCA) industry standard.',
        status: 'PROPOSED_FOR_APPROVAL',
        requiresApproval: true
      });
    } else {
      missingDetails.push({
        area: 'Session & Authentication Expiry',
        description: 'Session revocation on password reset or concurrent login is not explicitly defined.',
        impact: 'Potential session fixation or unauthorized concurrent device access.',
        proposedResolution: 'Define token expiry (JWT) and multi-device session management policies.'
      });
    }

    const data = {
      summary: `AI Requirement Gap & Ambiguity Analysis for ${project.name}. Evaluated ${items.length} parsed specification items against enterprise security, performance, and domain standards.`,
      missingDetails,
      ambiguities,
      contradictions,
      assumptions,
      questionsForStakeholders: questions
    };

    return RequirementAnalysisSchema.parse(data);
  }

  async generateUserStories(project, requirement, analysis) {
    const items = requirement.parsed_items || [];
    const stories = [];
    const prefix = project.name.slice(0, 3).toUpperCase();

    items.forEach((item, idx) => {
      const storyId = `US-${prefix}-${String(idx + 1).padStart(2, '0')}`;
      const role = item.userRole || (project.user_roles ? project.user_roles.split(',')[0].trim() : 'Authorized User');
      const goal = item.title;
      const benefit = `ensure reliable ${item.type.toLowerCase()} execution and maintain system integrity`;
      stories.push({
        id: storyId,
        reqRef: item.id,
        role,
        goal: `perform ${goal}`,
        benefit,
        fullStory: `As a ${role}, I want to ${goal.toLowerCase()}, so that I can ${benefit}.`,
        priority: idx === 0 ? 'Critical' : idx === 1 ? 'High' : 'Medium',
        isProposedAssumption: false
      });
    });

    // Add proposed assumption story if needed
    if (analysis && analysis.assumptions && analysis.assumptions.length > 0) {
      analysis.assumptions.forEach((assump, aIdx) => {
        stories.push({
          id: `US-${prefix}-PROP-${aIdx + 1}`,
          reqRef: assump.id,
          role: 'Security / Compliance Officer',
          goal: `enforce policy: ${assump.assumption.slice(0, 60)}`,
          benefit: `guarantee safety and adherence to ${assump.basis}`,
          fullStory: `As a Compliance Lead, I want to ${assump.assumption}, so that we maintain ${assump.basis} [PROPOSED ASSUMPTION].`,
          priority: 'High',
          isProposedAssumption: true
        });
      });
    }

    return UserStorySchema.parse({ stories });
  }

  async generateAcceptanceCriteria(project, requirement, userStories) {
    const criteriaList = [];
    const stories = userStories.stories || [];

    stories.forEach((story, sIdx) => {
      const baseId = `AC-${story.id}`;
      // Functional AC
      criteriaList.push({
        id: `${baseId}.1`,
        storyRef: story.id,
        reqRef: story.reqRef,
        category: 'Functional',
        scenario: `Successful execution of ${story.goal}`,
        given: `User is authenticated with role "${story.role}" and navigates to the feature`,
        when: `User submits valid parameters for ${story.goal}`,
        then: `The system successfully processes the request, returns HTTP 200/201, and updates record status`,
        isProposedAssumption: story.isProposedAssumption
      });

      // Negative / Validation AC
      criteriaList.push({
        id: `${baseId}.2`,
        storyRef: story.id,
        reqRef: story.reqRef,
        category: 'Functional',
        scenario: `Invalid or missing parameters rejected with clear actionable error`,
        given: `User is on the ${story.goal} submission form`,
        when: `User submits incomplete or malformed payload`,
        then: `System rejects the operation with HTTP 400 Bad Request and highlights validation errors without losing form state`,
        isProposedAssumption: story.isProposedAssumption
      });

      // Security / Permission AC
      criteriaList.push({
        id: `${baseId}.3`,
        storyRef: story.id,
        reqRef: story.reqRef,
        category: 'Security',
        scenario: `Unauthorized access attempt is blocked and audited`,
        given: `An unauthenticated user or user with insufficient privileges`,
        when: `Attempting direct access or API invocation for ${story.goal}`,
        then: `System denies request with HTTP 401/403 and writes a security audit log event`,
        isProposedAssumption: story.isProposedAssumption
      });

      // Performance AC
      if (sIdx === 0) {
        criteriaList.push({
          id: `${baseId}.4`,
          storyRef: story.id,
          reqRef: story.reqRef,
          category: 'Performance',
          scenario: `End-to-end response time meets SLA under standard load`,
          given: `System under standard concurrent load (<500 active sessions)`,
          when: `User triggers ${story.goal}`,
          then: `Transaction completes within 1.5 seconds and UI reflects updated state smoothly`,
          isProposedAssumption: story.isProposedAssumption
        });
      }
    });

    return AcceptanceCriteriaSchema.parse({ criteriaList });
  }

  async generateUseCases(project, requirement, userStories, acceptanceCriteria) {
    const useCases = [];
    const stories = (userStories.stories || []).slice(0, 4);

    stories.forEach((story, idx) => {
      const ucId = `UC-${project.name.slice(0, 3).toUpperCase()}-${String(idx + 1).padStart(2, '0')}`;
      useCases.push({
        id: ucId,
        title: `Manage ${story.goal}`,
        actor: story.role,
        preconditions: [
          `User is logged in as valid ${story.role}`,
          'Target service subsystem is healthy and operational'
        ],
        mainFlow: [
          { stepNumber: 1, actorAction: `Navigates to ${story.goal} interface`, systemResponse: 'Renders dashboard with current state and action triggers' },
          { stepNumber: 2, actorAction: 'Inputs required data and reviews parameters', systemResponse: 'Validates fields in real-time with format checks' },
          { stepNumber: 3, actorAction: 'Confirms and submits the transaction', systemResponse: 'Processes request, writes database transaction, and outputs confirmation' }
        ],
        alternativeFlows: [
          {
            branchCondition: 'Validation Failure on Step 2',
            steps: ['System highlights offending fields in red', 'Actor corrects input and resubmits']
          },
          {
            branchCondition: 'Upstream Integration Timeout on Step 3',
            steps: ['System safely rolls back intermediate changes', 'Displays retry prompt with idempotent reference ID']
          }
        ],
        postconditions: [
          'Record state is persisted in database',
          'Audit log entry generated with user timestamp and IP hash'
        ]
      });
    });

    return UseCaseSchema.parse({ useCases });
  }

  async generateTestScope(project, requirement) {
    const rawEnvironments = project.target_environments
      ? (Array.isArray(project.target_environments) ? project.target_environments : project.target_environments.split(',').map((s) => s.trim()))
      : ['QA Integration', 'Staging / Pre-Prod', 'Production Monitoring'];

    const rawBrowsers = project.browser_coverage
      ? (Array.isArray(project.browser_coverage) ? project.browser_coverage : project.browser_coverage.split(',').map((s) => s.trim()))
      : ['Chrome Latest', 'Firefox Latest', 'Safari (macOS/iOS)', 'Edge Latest'];

    const features = (requirement.parsed_items || []).map((item) => ({
      featureName: item.title,
      description: item.description.slice(0, 150),
      riskLevel: 'High'
    }));

    if (features.length === 0) {
      features.push({
        featureName: project.name,
        description: project.purpose,
        riskLevel: 'High'
      });
    }

    const testScope = {
      inScopeFeatures: features,
      integrations: [
        { systemName: 'Authentication & SSO Provider', type: 'OAuth2 / OIDC', verificationApproach: 'JWT validation, token renewal, session expiry' },
        { systemName: 'Primary Relational Database', type: 'PostgreSQL / ACID DB', verificationApproach: 'Data integrity, rollback tests, deadlock prevention' },
        { systemName: 'Monday CRM Sync Gateway', type: 'REST / GraphQL', verificationApproach: 'Bi-directional sync, idempotency, webhook retry verification' }
      ],
      targetEnvironments: rawEnvironments,
      browserCoverage: rawBrowsers,
      explicitExclusions: project.out_of_scope ? [
        { featureOrArea: project.out_of_scope.slice(0, 80), rationale: 'Explicitly marked out of scope in project definition' }
      ] : [
        { featureOrArea: 'Legacy third-party hardware drivers', rationale: 'Outside web application boundary' }
      ]
    };

    return TestScopeSchema.parse(testScope);
  }

  async generateTestPlan(project, requirement, testScope) {
    const testPlan = {
      objectives: [
        `Verify functional correctness of ${project.name} according to approved user stories.`,
        'Ensure zero regression on critical user journeys.',
        'Validate security posture against unauthorized data access and injection vectors.',
        'Verify robust synchronization with Monday CRM board without duplicate records.'
      ],
      approach: {
        manualTesting: 'Exploratory testing, UI polish evaluation, usability verification, edge-case defect hunting.',
        automationTesting: 'Playwright end-to-end regression suites, REST API contract tests, mock integration suites.',
        securityTesting: 'OWASP Top 10 checklist, RBAC privilege escalation tests, input sanitization checks.',
        performanceTesting: 'Response latency benchmarks, load spike recovery under concurrent requests.'
      },
      responsibilities: [
        { role: 'QA Lead', owner: 'Sarah Connor', responsibilities: ['Test strategy sign-off', 'Scope definition', 'Monday integration review', 'Release sign-off'] },
        { role: 'QA Automation Engineer', owner: 'Alex Rivera', responsibilities: ['Playwright script implementation', 'CI pipeline integration', 'Execution triage'] },
        { role: 'Product Owner', owner: 'Domain Lead', responsibilities: ['Acceptance criteria approval', 'Ambiguity resolution', 'Assumption sign-off'] }
      ],
      timeline: [
        { phase: 'Sprint QA Setup & Gap Analysis', duration: 'Week 1', deliverables: ['Approved QA Docs', 'Clarification Sign-off', 'Test Case Suite'] },
        { phase: 'Execution & Automation Run', duration: 'Week 2', deliverables: ['Test Run Execution Logs', 'Defect Analysis Triage', 'Playwright Suite'] },
        { phase: 'Regression & Monday CRM Publish', duration: 'Week 3', deliverables: ['Approved Monday Board Sync', 'Final Quality Gate Report'] }
      ],
      entryCriteria: [
        'Requirements and user stories reviewed and baseline approved.',
        'Target QA environment deployed with test data fixtures.',
        'AI QA drafts reviewed and signed off by QA Lead.'
      ],
      exitCriteria: [
        '100% of Critical and High priority test cases executed.',
        '0 Open Critical / Blocker defects remaining.',
        'Acceptance criteria coverage >= 95%.',
        'All failed execution defects triaged with root-cause hypotheses.'
      ]
    };

    return TestPlanSchema.parse(testPlan);
  }

  async generateTestCases(project, requirement, userStories, acceptanceCriteria) {
    const testCases = [];
    const pfx = project.name.slice(0, 3).toUpperCase();
    const criteriaList = acceptanceCriteria.criteriaList || [];

    let count = 1;

    for (const ac of criteriaList) {
      const tcId = `TC-${pfx}-${String(count++).padStart(3, '0')}`;
      let testType = 'Positive';
      let priority = 'Medium';

      if (ac.category === 'Security') {
        testType = 'Security';
        priority = 'Critical';
      } else if (ac.category === 'Performance') {
        testType = 'Boundary';
        priority = 'High';
      } else if (ac.scenario.toLowerCase().includes('invalid') || ac.scenario.toLowerCase().includes('reject')) {
        testType = 'Negative';
        priority = 'High';
      } else if (count <= 3) {
        priority = 'Critical';
      }

      const steps = [
        { stepNumber: 1, action: `Set up test environment and initialize preconditions: ${ac.given}`, expectedStepResult: 'Preconditions established cleanly' },
        { stepNumber: 2, action: `Execute user action: ${ac.when}`, expectedStepResult: 'System processes input without unhandled exception' },
        { stepNumber: 3, action: `Verify outcome: ${ac.then}`, expectedStepResult: ac.then }
      ];

      testCases.push({
        id: tcId,
        title: `Verify ${ac.scenario}`,
        feature: ac.storyRef || project.name,
        reqRefs: ac.reqRef ? [ac.reqRef] : [],
        storyRefs: ac.storyRef ? [ac.storyRef] : [],
        acRefs: [ac.id],
        preconditions: ac.given,
        testData: `Standard fixtures for ${project.domain || 'Project'}; valid mock credentials.`,
        steps,
        expectedResult: ac.then,
        testType,
        priority,
        reviewStatus: 'Draft',
        isProposedAssumption: ac.isProposedAssumption || false
      });
    }

    return TestCasesListSchema.parse({ testCases }).testCases;
  }

  async generateCoverageReport(project, acceptanceCriteria, testCases) {
    const criteriaList = acceptanceCriteria.criteriaList || [];
    const tcList = Array.isArray(testCases) ? testCases : (testCases.testCases || []);

    const coveredMap = new Map();
    criteriaList.forEach((ac) => {
      coveredMap.set(ac.id, {
        criterionId: ac.id,
        description: `${ac.scenario} (${ac.category})`,
        category: ac.category,
        linkedTestIds: []
      });
    });

    tcList.forEach((tc) => {
      const refs = Array.isArray(tc.acRefs) ? tc.acRefs : (Array.isArray(tc.ac_refs) ? tc.ac_refs : []);
      refs.forEach((acId) => {
        if (coveredMap.has(acId)) {
          coveredMap.get(acId).linkedTestIds.push(tc.id);
        }
      });
    });

    const coveredItems = [];
    const uncoveredItems = [];

    for (const item of coveredMap.values()) {
      if (item.linkedTestIds.length > 0) {
        coveredItems.push(item);
      } else {
        uncoveredItems.push({
          criterionId: item.criterionId,
          description: item.description,
          category: item.category,
          riskNote: `No active test case linked to this acceptance criterion.`
        });
      }
    }

    const total = criteriaList.length;
    const covered = coveredItems.length;
    const uncovered = uncoveredItems.length;
    const percentage = total > 0 ? Math.round((covered / total) * 100) : 100;

    const recommendations = [];
    if (uncovered > 0) {
      recommendations.push(`Generate or link test cases for ${uncovered} uncovered acceptance criteria.`);
    } else {
      recommendations.push('Full 100% acceptance criteria coverage achieved across generated test cases.');
    }
    recommendations.push('Review and approve draft test cases before synchronizing to Monday CRM.');

    return CoverageReportSchema.parse({
      summary: {
        totalCriteria: total,
        coveredCriteria: covered,
        uncoveredCriteria: uncovered,
        coveragePercentage: percentage
      },
      coveredItems,
      uncoveredItems,
      recommendations
    });
  }
}
