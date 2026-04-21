const jiraService = require('../services/jiraService');

// Helper: calculate absolute days between two dates
const diffDays = (d1, d2) => {
    const timeDiff = Math.abs(new Date(d2).getTime() - new Date(d1).getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// --- Status Classification ---

const DONE_EQUIVALENT_STATUSES = new Set([
    'done', 'closed', 'released', 'ready for release', 'ready for prod', 'ready for production'
]);

const LATE_STAGE_STATUSES = new Set([
    'code review', 'ready for qa', 'qa review', 'staging', 'ready for stage', 'ready for staging'
]);

const isEffectivelyDone = (issue) => {
    const statusCategoryKey = issue.fields.status?.statusCategory?.key;
    const statusName = (issue.fields.status?.name || '').toLowerCase().trim();
    return statusCategoryKey === 'done' || DONE_EQUIVALENT_STATUSES.has(statusName);
};

const isLateStage = (issue) => {
    const statusName = (issue.fields.status?.name || '').toLowerCase().trim();
    return LATE_STAGE_STATUSES.has(statusName);
};

// --- Sprint Phase Detection ---

const detectSprintPhase = (sprint) => {
    const now = new Date();
    const start = new Date(sprint.startDate);
    // Use completeDate if sprint is closed, otherwise use endDate
    const end = sprint.completeDate
        ? new Date(sprint.completeDate)
        : sprint.endDate
            ? new Date(sprint.endDate)
            : null;

    if (!sprint.startDate) return 'unknown';
    if (now < start) return 'future';
    if (end && now > end) return 'completed';
    return 'active';
};

// --- Rule-Based Health Calculation ---

const calculateHealth = (metrics, sprintPhase, progressPercent) => {
    if (sprintPhase === 'future') return 'NOT_STARTED';

    if (sprintPhase === 'active') {
        if (progressPercent < 30) return 'MONITORING';

        if (
            metrics.commitmentReliability < 60 ||
            metrics.scopeChange > 30 ||
            metrics.unplannedWork > 30
        ) return 'AT_RISK';

        if (
            metrics.commitmentReliability >= 60 &&
            metrics.scopeChange <= 20
        ) return 'ON_TRACK';

        return 'WARNING';
    }

    if (sprintPhase === 'completed') {
        if (metrics.commitmentReliability >= 80) return 'SUCCESS';
        if (metrics.commitmentReliability >= 60) return 'WARNING';
        return 'FAILED';
    }

    return 'UNKNOWN';
};

// Map health status to emoji and text
const HEALTH_MAP = {
    NOT_STARTED: { emoji: '⏳', text: 'Not Started' },
    MONITORING:  { emoji: '🔵', text: 'Monitoring' },
    ON_TRACK:    { emoji: '🟢', text: 'On Track' },
    WARNING:     { emoji: '🟡', text: 'Warning' },
    AT_RISK:     { emoji: '🔴', text: 'At Risk' },
    SUCCESS:     { emoji: '🟢', text: 'Completed Successfully' },
    FAILED:      { emoji: '🔴', text: 'Completed — Low Reliability' },
    UNKNOWN:     { emoji: '⚫', text: 'Unknown' },
};

// --- Main Controller ---

const getPMOSprintReport = async (req, res) => {
    const { projectKey, sprintId } = req.params;

    try {
        // 1. Fetch Sprint Details
        const sprint = await jiraService.getSprintDetails(sprintId);
        const startDate = new Date(sprint.startDate);
        const endDate = sprint.completeDate
            ? new Date(sprint.completeDate)
            : sprint.endDate
                ? new Date(sprint.endDate)
                : new Date();

        // 2. Detect Sprint Phase Using Dates
        const sprintPhase = detectSprintPhase(sprint);

        // Timing calculations
        const now = new Date();
        const totalDuration = diffDays(sprint.startDate, sprint.endDate || sprint.completeDate || new Date());
        const currentProgressDay = sprintPhase === 'active' ? diffDays(sprint.startDate, now) : null;
        const progressPercent = sprintPhase === 'active' && totalDuration > 0
            ? parseFloat(((currentProgressDay / totalDuration) * 100).toFixed(1))
            : sprintPhase === 'completed' ? 100 : 0;

        const sprintInfo = {
            name: sprint.name,
            startDate: sprint.startDate,
            endDate: sprint.endDate || sprint.completeDate,
            state: sprint.state,
            sprintPhase,      // 'future' | 'active' | 'completed'
            totalDays: totalDuration,
            currentDay: currentProgressDay,
            progressPercent
        };

        // 3. FUTURE SPRINT — Return early, no metrics
        if (sprintPhase === 'future') {
            console.log(`[PMO] Sprint "${sprint.name}" has not started yet. Phase: future`);
            return res.json({
                sprintInfo,
                status: 'NOT_STARTED',
                message: 'Sprint has not started yet. No metrics available.',
                summary: {
                    health: '⏳',
                    healthText: 'Not Started',
                    healthStatus: 'NOT_STARTED',
                    mainRisk: 'Sprint has not started yet.',
                    focusNext: 'Complete sprint planning and backlog grooming.',
                    summaryText: `Sprint ${sprint.name} is scheduled to start on ${new Date(sprint.startDate).toLocaleDateString()}.`
                },
                metrics: null,
                assigneeWorkload: {},
                rolloverCount: 0,
                risks: [],
                decisions: [],
                charts: { commitment: [], workDistribution: [] }
            });
        }

        // 4. Fetch Board Sprints (for rollover detection)
        const sprints = await jiraService.getBoardSprints(sprint.originBoardId);
        const currentIndex = sprints.findIndex(s => s.id === parseInt(sprintId));
        const prevSprint = currentIndex > 0 ? sprints[currentIndex - 1] : null;

        // 5. Fetch Issues with Changelog
        const jql = `sprint = ${sprintId}`;
        console.log(`PMO Report JQL: "${jql}" for sprintId: ${sprintId}`);
        const data = await jiraService.getIssuesWithChangelog(jql);
        const issues = data.issues || [];
        console.log(`PMO Report: Fetched ${issues.length} issues`);

        // 6. Metric Containers
        let committedPoints = 0;
        let deliveredPoints = 0;
        let unplannedDeliveredPoints = 0;
        let removedPoints = 0;

        // FIX #2/#3: Scope change and unplanned work using issue.fields.created vs sprint.startDate
        let scopeAddedPoints = 0;   // Issues CREATED after sprint start (true new scope)
        let scopeAddedKeys = [];

        let rolloverIssueKeys = [];
        let cycleTimes = [];
        let criticalBugsCreated = 0;
        let criticalBugsResolved = 0;
        let blockedCount = 0;
        const assigneeWorkload = {};
        
        // Standard aggregations
        let doneIssuesCount = 0;
        let notDoneIssuesCount = 0;
        const statusDistribution = {};
        const priorityDistribution = {};
        const assigneeMap = {};

        issues.forEach(issue => {
            // Standard distributions
            const status = issue.fields.status?.name || 'Unknown';
            const priority = issue.fields.priority?.name || 'None';
            statusDistribution[status] = (statusDistribution[status] || 0) + 1;
            priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;

            // Story Points
            const pts11224 = parseFloat(issue.fields['customfield_11224']) || 0;
            const pts10004 = parseFloat(issue.fields['customfield_10004']) || 0;
            const points = pts10004 || pts11224 || 0;

            // Extract Assignee for Team Members section
            const assignee = issue.fields.assignee;
            if (assignee) {
                const id = assignee.accountId || assignee.displayName;
                if (!assigneeMap[id]) {
                    assigneeMap[id] = {
                        accountId: assignee.accountId || '',
                        displayName: assignee.displayName || 'Unknown',
                        avatarUrl: assignee.avatarUrls ? (assignee.avatarUrls['48x48'] || assignee.avatarUrls['32x32']) : '',
                        storyPoints: 0
                    };
                }
                assigneeMap[id].storyPoints += points;
            }

            const isDone = isEffectivelyDone(issue);
            const isLate = isLateStage(issue);
            
            if (isDone) {
                doneIssuesCount++;
            } else {
                notDoneIssuesCount++;
            }

            // FIX #2: Use issue creation date to classify scope change
            // Issues created AFTER sprint start = added scope (no changelog parsing needed)
            const issueCreatedAt = new Date(issue.fields.created);
            const wasCreatedAfterSprintStart = issueCreatedAt > startDate;

            // Rollover detection: issue existed before sprint start (via changelog)
            let addedToSprintViaChangelog = false;
            let addedDate = null;
            let removedDate = null;

            if (issue.changelog && issue.changelog.histories) {
                const sortedHistories = [...issue.changelog.histories].sort(
                    (a, b) => new Date(a.created) - new Date(b.created)
                );
                sortedHistories.forEach(history => {
                    history.items.forEach(item => {
                        if (item.field === 'Sprint') {
                            const historyDate = new Date(history.created);
                            const toVal = item.to ? String(item.to) : '';
                            const fromVal = item.from ? String(item.from) : '';

                            if (toVal.includes(sprintId.toString()) && !addedDate) {
                                addedDate = historyDate;
                                addedToSprintViaChangelog = true;
                            }
                            if (fromVal.includes(sprintId.toString())) {
                                removedDate = historyDate;
                            }
                        }
                    });
                });
            }

            // An issue is rollover if it was created before the sprint started
            // AND was moved into the sprint (from another sprint or backlog)
            const isRollover = !wasCreatedAfterSprintStart && addedToSprintViaChangelog && addedDate && addedDate <= startDate;
            if (isRollover) rolloverIssueKeys.push(issue.key);

            // Classification:
            // - Committed = existed at sprint start (created before sprint start)
            // - Added scope = created AFTER sprint start
            if (!wasCreatedAfterSprintStart) {
                // Committed work
                committedPoints += points;
                if (isDone) deliveredPoints += points;
            } else {
                // FIX #2/#3: True scope addition and unplanned work
                scopeAddedPoints += points;
                scopeAddedKeys.push(issue.key);
                if (isDone) unplannedDeliveredPoints += points;
            }

            // Handle removed issues
            if (removedDate && removedDate > startDate) {
                removedPoints += points;
            }

            // FIX: Cycle Time — correct field access (item.toString is the Jira display name field)
            if (isDone) {
                let inProgressDate = null;
                let doneDate = null;

                if (issue.changelog && issue.changelog.histories) {
                    issue.changelog.histories.forEach(history => {
                        history.items.forEach(item => {
                            if (item.field === 'status') {
                                const toStatus = (item.toString || '').toLowerCase();

                                if (toStatus.includes('progress') || toStatus === 'in progress') {
                                    if (!inProgressDate || new Date(history.created) < inProgressDate) {
                                        inProgressDate = new Date(history.created);
                                    }
                                }
                                if (
                                    toStatus.includes('done') ||
                                    toStatus.includes('resolved') ||
                                    toStatus.includes('closed') ||
                                    toStatus.includes('ready for release')
                                ) {
                                    if (!doneDate || new Date(history.created) < doneDate) {
                                        doneDate = new Date(history.created);
                                    }
                                }
                            }
                        });
                    });
                }

                if (inProgressDate && doneDate && doneDate > inProgressDate) {
                    cycleTimes.push(diffDays(inProgressDate, doneDate));
                }
            }

            // Bugs
            if (
                issue.fields.issuetype?.name === 'Bug' &&
                issue.fields.priority?.name &&
                ['High', 'Highest', 'Critical', 'Urgent'].includes(issue.fields.priority.name)
            ) {
                const createdDate = new Date(issue.fields.created);
                if (createdDate >= startDate && createdDate <= endDate) criticalBugsCreated++;

                if (isDone) {
                    let resolvedDate = null;
                    if (issue.changelog && issue.changelog.histories) {
                        issue.changelog.histories.forEach(h => {
                            h.items.forEach(item => {
                                const toStatus = (item.toString || '').toLowerCase();
                                if (item.field === 'status' &&
                                    (toStatus.includes('done') || toStatus.includes('ready for release'))) {
                                    resolvedDate = new Date(h.created);
                                }
                            });
                        });
                    }
                    if (resolvedDate && resolvedDate >= startDate && resolvedDate <= endDate) {
                        criticalBugsResolved++;
                    }
                }
            }

            // Blockers
            const hasBlockers = issue.fields.issuelinks?.some(link =>
                (link.type?.inward === 'is blocked by' && link.inwardIssue) ||
                (link.type?.name === 'Blocks' && link.inwardIssue)
            );
            if (hasBlockers) blockedCount++;

            // Per-assignee workload breakdown
            const assigneeName = issue.fields.assignee?.displayName || 'Unassigned';
            if (!assigneeWorkload[assigneeName]) {
                assigneeWorkload[assigneeName] = {
                    activeTickets: 0, activePoints: 0,
                    lateStageTickets: 0, lateStagePoints: 0,
                    doneTickets: 0, donePoints: 0,
                    rolloverTickets: 0, totalTickets: 0
                };
            }
            const aw = assigneeWorkload[assigneeName];
            aw.totalTickets++;
            if (isRollover) aw.rolloverTickets++;
            if (isDone) {
                aw.doneTickets++; aw.donePoints += points;
            } else if (isLate) {
                aw.lateStageTickets++; aw.lateStagePoints += points;
            } else {
                aw.activeTickets++; aw.activePoints += points;
            }
        });

        // Debug Logs
        console.log(`[PMO Debug] Sprint: ${sprint.name} (${sprintId}) | Phase: ${sprintPhase} | Progress: ${progressPercent}%`);
        console.log(`[PMO Debug] Committed Points: ${committedPoints}`);
        console.log(`[PMO Debug] Delivered Points: ${deliveredPoints}`);
        console.log(`[PMO Debug] Scope Added (created after start): ${scopeAddedKeys.length} issues | ${scopeAddedPoints} pts`);
        console.log(`[PMO Debug] Scope Added Keys: ${scopeAddedKeys.join(', ')}`);
        console.log(`[PMO Debug] Rollover Issues: ${rolloverIssueKeys.length}`);
        console.log(`[PMO Debug] Unplanned Delivered: ${unplannedDeliveredPoints}`);

        // 7. Final Metric Calculations

        // FIX #4: Commitment Reliability
        const commitmentReliability = committedPoints > 0
            ? parseFloat(((deliveredPoints / committedPoints) * 100).toFixed(1))
            : 0;

        // FIX #2: Scope Change = Added SP after sprint start / Committed SP × 100
        const scopeChange = committedPoints > 0
            ? parseFloat(((scopeAddedPoints / committedPoints) * 100).toFixed(1))
            : 0;

        const totalDelivered = deliveredPoints + unplannedDeliveredPoints;

        // FIX #3: Unplanned Work = Unplanned delivered SP / Total Delivered SP × 100
        // Suppressed in early sprint phase (< 30%) as it's unreliable
        const isEarlyPhase = sprintPhase === 'active' && progressPercent < 30;
        const unplannedWork = isEarlyPhase
            ? 0
            : totalDelivered > 0
                ? parseFloat(((unplannedDeliveredPoints / totalDelivered) * 100).toFixed(1))
                : 0;

        const avgCycleTime = cycleTimes.length > 0
            ? parseFloat((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length).toFixed(1))
            : 0;

        const rawMetrics = { commitmentReliability, scopeChange, unplannedWork };

        // FIX #7: Rule-based health
        const healthStatus = calculateHealth(rawMetrics, sprintPhase, progressPercent);
        const healthInfo = HEALTH_MAP[healthStatus] || HEALTH_MAP['UNKNOWN'];

        // Main risk text
        const mainRisk = healthStatus === 'MONITORING'
            ? `Sprint is in early phase (${progressPercent}% through). Metrics not yet reliable.`
            : healthStatus === 'AT_RISK'
                ? scopeChange > 30 ? 'Significant scope creep detected mid-sprint.'
                    : commitmentReliability < 60 ? 'Low delivery rate — team may be over-committed.'
                        : 'High unplanned work ratio is disrupting planned delivery.'
                : healthStatus === 'WARNING'
                    ? 'Minor delivery or scope concerns — monitor closely.'
                    : healthStatus === 'FAILED'
                        ? 'Sprint completed with low commitment reliability.'
                        : 'No major risks identified.';

        // Decisions
        const decisions = [];
        if (isEarlyPhase) decisions.push('Ensure all items are properly groomed and estimated.');
        if (scopeChange > 20) decisions.push('Enforce scope freeze — no new issues should be added to the sprint.');
        if (avgCycleTime > 8) decisions.push('Run a workflow audit — cycle time is high. Check for review bottlenecks.');
        if (blockedCount > 3) decisions.push('Escalate blocked items — more than 3 issues have dependency blockers.');
        if (criticalBugsCreated > 5) decisions.push('Schedule a dedicated bug-squashing session with the team.');

        const getTrend = (val) => val > 0 ? '↑' : val < 0 ? '↓' : '→';

        const assigneeDistribution = {};
        Object.entries(assigneeWorkload).forEach(([name, data]) => {
            assigneeDistribution[name] = data.totalTickets;
        });

        const teamMembers = Object.values(assigneeMap).sort((a, b) => b.storyPoints - a.storyPoints);

        const recentIssues = issues.slice(0, 10).map(i => ({
            key: i.key,
            summary: i.fields.summary,
            status: i.fields.status?.name || 'Unknown',
            assignee: i.fields.assignee?.displayName || 'Unassigned',
            priority: i.fields.priority?.name || 'None'
        }));
        
        const completionPercentage = issues.length > 0 ? ((doneIssuesCount / issues.length) * 100).toFixed(1) : 0;

        const report = {
            sprintInfo,
            status: healthStatus,
            summary: {
                health: healthInfo.emoji,
                healthText: healthInfo.text,
                healthStatus,
                mainRisk,
                focusNext: isEarlyPhase
                    ? 'Complete initial committed items'
                    : commitmentReliability < 80
                        ? 'Improve estimation accuracy'
                        : 'Maintain delivery velocity',
                summaryText: sprintPhase === 'future'
                    ? `Sprint ${sprint.name} has not started yet.`
                    : isEarlyPhase
                        ? `Sprint ${sprint.name} is in its early phase (day ${currentProgressDay} of ${totalDuration}). Team has delivered ${totalDelivered} points so far.`
                        : `Sprint ${sprint.name} delivered ${totalDelivered} points with ${commitmentReliability}% commitment reliability.`
            },
            metrics: [
                {
                    name: 'Commitment Reliability',
                    value: `${commitmentReliability}%`,
                    trend: getTrend(0),
                    confidence: isEarlyPhase ? 'Low' : 'High',
                    insight: isEarlyPhase ? 'Too early to evaluate' : commitmentReliability < 80 ? 'Below target — review over-commitment' : 'Strong execution',
                    description: 'Delivered story points as a percentage of committed story points at sprint start.'
                },
                {
                    name: 'Scope Change',
                    value: `${scopeChange}%`,
                    trend: scopeChange > 10 ? '↑' : '→',
                    confidence: isEarlyPhase ? 'Low' : 'Medium',
                    insight: scopeChange > 20 ? 'New issues created after sprint start' : scopeChange > 0 ? 'Minor scope additions' : 'Stable scope',
                    description: 'Story points of issues created after sprint start, as a percentage of committed story points.'
                },
                {
                    name: 'Unplanned Work',
                    value: isEarlyPhase ? 'N/A' : `${unplannedWork}%`,
                    trend: '↓',
                    confidence: isEarlyPhase ? 'Low' : 'High',
                    insight: isEarlyPhase ? 'Not reliable yet — check mid-sprint' : unplannedWork > 20 ? 'High ratio of unplanned completed work' : 'Manageable level',
                    description: 'Story points of unplanned issues (created during sprint) that were delivered, as a % of total delivered.'
                },
                {
                    name: 'Cycle Time',
                    value: `${avgCycleTime}d`,
                    trend: '→',
                    confidence: cycleTimes.length === 0 ? 'Low' : 'Medium',
                    insight: cycleTimes.length === 0 ? 'No completed issues yet' : avgCycleTime > 8 ? 'High — review workflow' : 'Consistent throughput',
                    description: "Average time from 'In Progress' to 'Done' per issue."
                },
                {
                    name: 'Critical Bugs',
                    value: `${criticalBugsCreated}/${criticalBugsResolved}`,
                    trend: criticalBugsCreated > criticalBugsResolved ? '↑' : '↓',
                    confidence: 'High',
                    insight: 'Created vs Resolved during sprint',
                    description: 'High-priority bugs created and resolved during this sprint.'
                },
                {
                    name: 'Dependency Delays',
                    value: blockedCount,
                    trend: blockedCount > 3 ? '↑' : '→',
                    confidence: 'Low',
                    insight: blockedCount > 3 ? 'Multiple blockers — needs attention' : 'Under control',
                    description: 'Issues currently blocked by dependencies on other teams or work.'
                }
            ],
            assigneeWorkload,
            rolloverCount: rolloverIssueKeys.length,
            risks: [
                { level: healthStatus === 'AT_RISK' ? 'High' : healthStatus === 'WARNING' ? 'Medium' : 'Low', description: mainRisk, impact: 'Delayed delivery', action: 'Review in next daily standup' }
            ],
            decisions,
            charts: {
                commitment: [
                    { name: 'Plan', points: committedPoints },
                    { name: 'Actual', points: totalDelivered }
                ],
                workDistribution: [
                    { name: 'Planned', value: deliveredPoints },
                    { name: 'Unplanned', value: unplannedDeliveredPoints }
                ]
            },
            // Legacy standard sprint metrics appended for unified view
            totalIssues: issues.length,
            doneIssuesCount,
            notDoneIssuesCount,
            completionPercentage,
            statusDistribution,
            priorityDistribution,
            assigneeDistribution,
            teamMembers,
            recentIssues
        };

        res.json(report);

    } catch (error) {
        console.error("PMO Report Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getPMOSprintReport
};
