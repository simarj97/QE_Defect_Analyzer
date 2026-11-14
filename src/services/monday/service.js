import { MondayClient } from '../../../monday.js';

export class MondaySyncService {
  constructor(db) {
    this.db = db;
  }

  getClientForProject(config) {
    if (!config || !config.token || !config.board_id) {
      return null;
    }
    let colMap = {};
    try {
      colMap = typeof config.column_map === 'string' ? JSON.parse(config.column_map || '{}') : (config.column_map || {});
    } catch {
      colMap = {};
    }
    return new MondayClient({
      token: config.token,
      boardId: config.board_id,
      version: config.version || '2026-10',
      columnMap: colMap
    });
  }

  async syncApprovedTestCases(projectId) {
    const config = await this.db.getMondayConfig(projectId);
    const testCases = await this.db.getTestCases(projectId);
    const approvedCases = testCases.filter((tc) => tc.review_status === 'Approved');

    if (!config || !config.token || !config.board_id) {
      return {
        status: 'not_configured',
        isLive: false,
        message: 'Monday CRM integration is not configured with token and board ID for this project. Simulated sync was NOT reported as live success.',
        syncedCount: 0,
        failedCount: 0,
        errors: ['Missing MONDAY_API_TOKEN or MONDAY_BOARD_ID for project ' + projectId]
      };
    }

    const client = this.getClientForProject(config);
    const results = {
      status: 'success',
      isLive: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
      items: []
    };

    for (const tc of approvedCases) {
      try {
        // Safe retry loop
        let success = false;
        let lastError = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // Prepare Monday item name and columns
            const stepsText = typeof tc.steps === 'string' ? tc.steps : tc.steps.map((s) => `${s.stepNumber}. ${s.action} -> Expected: ${s.expectedStepResult}`).join('\n');
            const colValues = {
              status: { label: 'Approved' },
              priority: { label: tc.priority || 'Medium' },
              text: tc.id,
              long_text: `Feature: ${tc.feature}\nPreconditions: ${tc.preconditions}\nSteps:\n${stepsText}\nExpected Result: ${tc.expected_result}`
            };

            let mondayItemId = tc.monday_item_id;

            if (mondayItemId) {
              // Update existing item
              // Mutation using MondayClient request
              await client.request(
                `mutation($boardId:ID!,$itemId:ID!,$columnValues:JSON!){
                  change_multiple_column_values(board_id:$boardId,item_id:$itemId,column_values:$columnValues){
                    id
                  }
                }`,
                {
                  boardId: config.board_id,
                  itemId: mondayItemId,
                  columnValues: JSON.stringify(colValues)
                }
              );
            } else {
              // Create new item with stable name including test case ID to prevent duplicates
              const itemName = `[${tc.id}] ${tc.title}`;
              const createRes = await client.request(
                `mutation($boardId:ID!,$itemName:String!,$columnValues:JSON!){
                  create_item(board_id:$boardId,item_name:$itemName,column_values:$columnValues){
                    id
                  }
                }`,
                {
                  boardId: config.board_id,
                  itemName,
                  columnValues: JSON.stringify(colValues)
                }
              );
              mondayItemId = createRes?.create_item?.id;
            }

            const mondayLink = `https://monday.com/boards/${config.board_id}/pulses/${mondayItemId}`;
            tc.monday_item_id = String(mondayItemId);
            tc.monday_link = mondayLink;
            tc.monday_sync_status = 'synced';
            tc.monday_sync_error = null;
            tc.monday_last_synced_at = new Date().toISOString();
            await this.db.saveTestCase(tc);

            results.syncedCount++;
            results.items.push({ id: tc.id, mondayItemId, mondayLink, status: 'synced' });
            success = true;
            break;
          } catch (err) {
            lastError = err;
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
          }
        }

        if (!success) {
          tc.monday_sync_status = 'failed';
          tc.monday_sync_error = lastError?.message || 'Sync failed after 3 attempts';
          await this.db.saveTestCase(tc);
          results.failedCount++;
          results.errors.push(`Test Case ${tc.id}: ${tc.monday_sync_error}`);
        }
      } catch (loopErr) {
        results.failedCount++;
        results.errors.push(`Test Case ${tc.id}: ${loopErr.message}`);
      }
    }

    config.last_sync_at = new Date().toISOString();
    config.last_sync_status = results.failedCount === 0 ? 'success' : 'failed';
    config.last_sync_error = results.errors.length ? results.errors.join('; ') : null;
    await this.db.saveMondayConfig(config);

    return results;
  }

  async publishDefectFinding(projectId, defectId) {
    const config = await this.db.getMondayConfig(projectId);
    const defect = await this.db.getDefectById(defectId);

    if (!defect) throw new Error('Defect not found');
    if (!config || !config.token || !config.board_id) {
      throw new Error('Monday CRM integration not configured for this project.');
    }
    if (!defect.monday_item_id) {
      throw new Error('Defect must be linked to a Monday item first.');
    }

    const client = this.getClientForProject(config);
    const res = await client.publish(defect.monday_item_id, defect.analysis);
    return res;
  }
}
