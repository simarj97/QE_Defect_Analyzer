import { z } from 'zod';

export const RequirementAnalysisSchema = z.object({
  summary: z.string(),
  missingDetails: z.array(z.object({
    area: z.string(),
    description: z.string(),
    impact: z.string(),
    proposedResolution: z.string().optional()
  })),
  ambiguities: z.array(z.object({
    termOrPhrase: z.string(),
    interpretationA: z.string(),
    interpretationB: z.string(),
    clarificationNeeded: z.string()
  })),
  contradictions: z.array(z.object({
    itemA: z.string(),
    itemB: z.string(),
    conflictExplanation: z.string()
  })),
  assumptions: z.array(z.object({
    id: z.string(),
    assumption: z.string(),
    basis: z.string(),
    status: z.enum(['PROPOSED_FOR_APPROVAL', 'APPROVED', 'REJECTED']),
    requiresApproval: z.boolean().default(true)
  })),
  questionsForStakeholders: z.array(z.object({
    questionId: z.string(),
    recipientRole: z.string(),
    question: z.string(),
    priority: z.enum(['High', 'Medium', 'Low'])
  }))
});

export const UserStorySchema = z.object({
  stories: z.array(z.object({
    id: z.string(),
    reqRef: z.string().optional(),
    role: z.string(),
    goal: z.string(),
    benefit: z.string(),
    fullStory: z.string(),
    priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
    isProposedAssumption: z.boolean().default(false)
  }))
});

export const AcceptanceCriteriaSchema = z.object({
  criteriaList: z.array(z.object({
    id: z.string(),
    storyRef: z.string().optional(),
    reqRef: z.string().optional(),
    category: z.enum(['Functional', 'Performance', 'Security', 'Usability', 'Data Integrity']),
    scenario: z.string(),
    given: z.string(),
    when: z.string(),
    then: z.string(),
    isProposedAssumption: z.boolean().default(false)
  }))
});

export const UseCaseSchema = z.object({
  useCases: z.array(z.object({
    id: z.string(),
    title: z.string(),
    actor: z.string(),
    preconditions: z.array(z.string()),
    mainFlow: z.array(z.object({
      stepNumber: z.number(),
      actorAction: z.string(),
      systemResponse: z.string()
    })),
    alternativeFlows: z.array(z.object({
      branchCondition: z.string(),
      steps: z.array(z.string())
    })),
    postconditions: z.array(z.string())
  }))
});

export const TestScopeSchema = z.object({
  inScopeFeatures: z.array(z.object({
    featureName: z.string(),
    description: z.string(),
    riskLevel: z.enum(['Critical', 'High', 'Medium', 'Low'])
  })),
  integrations: z.array(z.object({
    systemName: z.string(),
    type: z.string(),
    verificationApproach: z.string()
  })),
  targetEnvironments: z.array(z.string()),
  browserCoverage: z.array(z.string()),
  explicitExclusions: z.array(z.object({
    featureOrArea: z.string(),
    rationale: z.string()
  }))
});

export const TestPlanSchema = z.object({
  objectives: z.array(z.string()),
  approach: z.object({
    manualTesting: z.string(),
    automationTesting: z.string(),
    securityTesting: z.string(),
    performanceTesting: z.string()
  }),
  responsibilities: z.array(z.object({
    role: z.string(),
    owner: z.string(),
    responsibilities: z.array(z.string())
  })),
  timeline: z.array(z.object({
    phase: z.string(),
    duration: z.string(),
    deliverables: z.array(z.string())
  })),
  entryCriteria: z.array(z.string()),
  exitCriteria: z.array(z.string())
});

export const TestCaseItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  feature: z.string(),
  reqRefs: z.array(z.string()).default([]),
  storyRefs: z.array(z.string()).default([]),
  acRefs: z.array(z.string()).default([]),
  preconditions: z.string().default(''),
  testData: z.string().default(''),
  steps: z.union([
    z.string(),
    z.array(z.object({
      stepNumber: z.number(),
      action: z.string(),
      expectedStepResult: z.string()
    }))
  ]),
  expectedResult: z.string(),
  testType: z.enum(['Positive', 'Negative', 'Boundary', 'Integration', 'Security']),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  reviewStatus: z.enum(['Draft', 'Approved', 'Needs Review', 'Rejected']).default('Draft'),
  isProposedAssumption: z.boolean().default(false)
});

export const TestCasesListSchema = z.object({
  testCases: z.array(TestCaseItemSchema)
});

export const CoverageReportSchema = z.object({
  summary: z.object({
    totalCriteria: z.number(),
    coveredCriteria: z.number(),
    uncoveredCriteria: z.number(),
    coveragePercentage: z.number()
  }),
  coveredItems: z.array(z.object({
    criterionId: z.string(),
    description: z.string(),
    category: z.string(),
    linkedTestIds: z.array(z.string())
  })),
  uncoveredItems: z.array(z.object({
    criterionId: z.string(),
    description: z.string(),
    category: z.string(),
    riskNote: z.string()
  })),
  recommendations: z.array(z.string())
});
