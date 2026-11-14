import Papa from 'papaparse';

export function exportTestCasesToCSV(testCases) {
  const rows = testCases.map((tc) => ({
    'Test ID': tc.id,
    'Title': tc.title,
    'Feature': tc.feature,
    'Requirement Refs': Array.isArray(tc.req_refs) ? tc.req_refs.join(', ') : (tc.req_refs || ''),
    'Story Refs': Array.isArray(tc.story_refs) ? tc.story_refs.join(', ') : (tc.story_refs || ''),
    'AC Refs': Array.isArray(tc.ac_refs) ? tc.ac_refs.join(', ') : (tc.ac_refs || ''),
    'Preconditions': tc.preconditions || '',
    'Test Data': tc.test_data || '',
    'Steps': typeof tc.steps === 'string' ? tc.steps : JSON.stringify(tc.steps),
    'Expected Result': tc.expected_result,
    'Test Type': tc.test_type,
    'Priority': tc.priority,
    'Review Status': tc.review_status,
    'Monday Item ID': tc.monday_item_id || '',
    'Monday Link': tc.monday_link || '',
    'Version': tc.version || 1,
    'Updated At': tc.updated_at
  }));

  return Papa.unparse(rows);
}

export function exportTestCasesToJSON(testCases, projectInfo = null) {
  return JSON.stringify({
    project: projectInfo ? { id: projectInfo.id, name: projectInfo.name, domain: projectInfo.domain } : null,
    exportedAt: new Date().toISOString(),
    totalCount: testCases.length,
    testCases: testCases.map((tc) => ({
      id: tc.id,
      title: tc.title,
      feature: tc.feature,
      reqRefs: tc.req_refs,
      storyRefs: tc.story_refs,
      acRefs: tc.ac_refs,
      preconditions: tc.preconditions,
      testData: tc.test_data,
      steps: tc.steps,
      expectedResult: tc.expected_result,
      testType: tc.test_type,
      priority: tc.priority,
      reviewStatus: tc.review_status,
      version: tc.version,
      mondayItemId: tc.monday_item_id,
      mondayLink: tc.monday_link,
      updatedAt: tc.updated_at
    }))
  }, null, 2);
}

export function exportExecutionsToCSV(executions) {
  const rows = executions.map((e) => ({
    'Execution ID': e.id,
    'Test Case ID': e.test_case_id,
    'Run ID': e.run_id,
    'Status': e.execution_status,
    'Actual Result': e.actual_result || '',
    'Environment': e.environment || '',
    'Build Version': e.build_version || '',
    'Execution Type': e.execution_type || 'manual',
    'Executed By': e.executed_by || '',
    'Duration (ms)': e.duration_ms || 0,
    'Defect Link': e.defect_id || '',
    'Executed At': e.executed_at
  }));

  return Papa.unparse(rows);
}

export function exportDefectsToCSV(defects) {
  const rows = defects.map((d) => ({
    'Defect ID': d.id,
    'Title': d.title,
    'Test Case ID': d.test_case_id || '',
    'Severity': d.severity,
    'Status': d.status,
    'Environment': d.environment || '',
    'Build Version': d.build_version || '',
    'Expected': d.expected || '',
    'Actual': d.actual || '',
    'Steps': d.steps || '',
    'Monday Item ID': d.monday_item_id || '',
    'Created At': d.created_at
  }));

  return Papa.unparse(rows);
}
