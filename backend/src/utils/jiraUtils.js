/**
 * Shared Jira utility functions for status classification and reporting.
 */

// --- Status Classification ---

// Project-specific completion statuses used for PMO and Release reporting.
// Key = Project Key (AIE, HAR, HP)
const PROJECT_COMPLETION_MAP = {
    AIE: new Set(['code review', 'ready for stage', 'ready for qa', 'in qa', 'ready for prod', 'done']),
    HAR: new Set(['ready for code review', 'in review', 'code review', 'ready for qa', 'in qa', 'ready for uat', 'done']),
    HP: new Set(['ready for code review', 'code review', 'ready for qa', 'in qa', 'ready for uat', 'in uat', 'ready for release', 'done']),
    PF: new Set(['ready for code review', 'code review', 'ready for qa', 'in qa', 'ready for uat', 'done'])
};

const DEFAULT_COMPLETION_STATUSES = new Set(['done']);

const LATE_STAGE_STATUSES = new Set([
    'code review', 'ready for qa', 'qa review', 'staging', 'ready for stage', 'ready for staging'
]);

/**
 * Determines if an issue is considered "Completed" based on its status and project context.
 * 
 * @param {Object} issue - The Jira issue object.
 * @param {string} projectKey - The project key (e.g., 'AIE').
 * @returns {boolean}
 */
const isEffectivelyDone = (issue, projectKey) => {
    const statusName = (issue.fields.status?.name || '').toLowerCase().trim();

    if (projectKey && PROJECT_COMPLETION_MAP[projectKey.toUpperCase()]) {
        return PROJECT_COMPLETION_MAP[projectKey.toUpperCase()].has(statusName);
    }

    return DEFAULT_COMPLETION_STATUSES.has(statusName);
};

/**
 * Determines if an issue is in the "Late Stage" of its workflow.
 * 
 * @param {Object} issue - The Jira issue object.
 * @returns {boolean}
 */
const isLateStage = (issue) => {
    const statusName = (issue.fields.status?.name || '').toLowerCase().trim();
    return LATE_STAGE_STATUSES.has(statusName);
};

module.exports = {
    PROJECT_COMPLETION_MAP,
    isEffectivelyDone,
    isLateStage
};
