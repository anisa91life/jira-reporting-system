const jiraService = require('../services/jiraService');

// Helper to calculate days between two dates
const diffDays = (d1, d2) => {
    const timeDiff = Math.abs(new Date(d2).getTime() - new Date(d1).getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

const getPMOSprintReport = async (req, res) => {
    const { projectKey, sprintId } = req.params;
    
    try {
        // 1. Fetch Sprint Details
        const sprint = await jiraService.getSprintDetails(sprintId);
        const startDate = new Date(sprint.startDate);
        const endDate = sprint.completeDate ? new Date(sprint.completeDate) : new Date();

        // 2. Fetch Board Sprints to find the previous one for Trends
        const sprints = await jiraService.getBoardSprints(sprint.originBoardId);
        const currentIndex = sprints.findIndex(s => s.id === parseInt(sprintId));
        const prevSprint = currentIndex > 0 ? sprints[currentIndex - 1] : null;

        // 3. Fetch Issues with Changelog
        // Simplified JQL for maximum compatibility with all Jira Cloud environments
        const jql = `sprint = ${sprintId}`;
        console.log(`PMO Report JQL: "${jql}" for sprintId: ${sprintId}`);
        const data = await jiraService.getIssuesWithChangelog(jql);
        const issues = data.issues || [];
        console.log(`PMO Report: Fetched ${issues.length} issues`);

        // 4. Metric Containers
        let committedPoints = 0;
        let deliveredPoints = 0;
        let addedPoints = 0;
        let removedPoints = 0;
        let unplannedDeliveredPoints = 0;
        
        let addedIssuesKeys = [];
        
        let cycleTimes = [];
        let criticalBugsCreated = 0;
        let criticalBugsResolved = 0;
        let blockedCount = 0;

        issues.forEach(issue => {
            // Check both common Story Point fields (11224 and 10004)
            const pts11224 = parseFloat(issue.fields['customfield_11224']) || 0;
            const pts10004 = parseFloat(issue.fields['customfield_10004']) || 0;
            const points = pts10004 || pts11224 || 0;

            const isDone = issue.fields.status?.statusCategory?.key === 'done';
            const sprintStatus = issue.fields.customfield_10007 || [];
            const isCurrentlyInSprint = sprintStatus.some(s => s.id === parseInt(sprintId));
            
            // Analyze Changelog for sprint addition/removal
            let addedDate = null;
            let removedDate = null;
            
            if (issue.changelog && issue.changelog.histories) {
                issue.changelog.histories.forEach(history => {
                    history.items.forEach(item => {
                        if (item.field === 'Sprint') {
                            const toSprints = item.to ? item.to.split(',').map(s => s.trim()) : [];
                            const fromSprints = item.from ? item.from.split(',').map(s => s.trim()) : [];
                            
                            if (toSprints.includes(sprintId.toString())) {
                                addedDate = new Date(history.created);
                            }
                            if (fromSprints.includes(sprintId.toString())) {
                                removedDate = new Date(history.created);
                            }
                        }
                    });
                });
            }

            // Logic for Commitment vs Scope Change
            // If addedDate is after sprint start, it's scope change
            const wasInAtStart = !addedDate || addedDate <= startDate;
            
            if (wasInAtStart && isCurrentlyInSprint) {
                committedPoints += points;
                if (isDone) deliveredPoints += points;
            } else if (isCurrentlyInSprint && addedDate > startDate) {
                addedPoints += points;
                addedIssuesKeys.push(issue.key);
                if (isDone) unplannedDeliveredPoints += points;
            } else if (!isCurrentlyInSprint && removedDate > startDate) {
                removedPoints += points;
            }

            // Cycle Time Calculation
            if (isDone) {
                let inProgressDate = null;
                let doneDate = null;

                if (issue.changelog && issue.changelog.histories) {
                    issue.changelog.histories.forEach(history => {
                        history.items.forEach(item => {
                            if (item.field === 'status') {
                                // This is simplified; in a real app, you'd map statuses to categories
                                const to = item.toString.toLowerCase();
                                if (to.includes('progress') || to.includes('doing') || to.includes('review')) {
                                    if (!inProgressDate || new Date(history.created) < inProgressDate) {
                                        inProgressDate = new Date(history.created);
                                    }
                                }
                                if (to.includes('done') || to.includes('resolved') || to.includes('closed')) {
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
            if (issue.fields.issuetype.name === 'Bug' && ['High', 'Highest', 'Critical', 'Urgent'].includes(issue.fields.priority.name)) {
                const createdDate = new Date(issue.fields.created);
                if (createdDate >= startDate && createdDate <= endDate) {
                    criticalBugsCreated++;
                }
                if (isDone) {
                    // Check if resolved during sprint
                    let resolvedDate = null;
                    if (issue.changelog && issue.changelog.histories) {
                        issue.changelog.histories.forEach(h => {
                            h.items.forEach(item => {
                                if (item.field === 'status' && item.toString.toLowerCase().includes('done')) {
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
                (link.type.inward === 'is blocked by' && link.inwardIssue) || 
                (link.type.name === 'Blocks' && link.inwardIssue)
            );
            if (hasBlockers) blockedCount++;
        });

        // Debug Logs for User
        console.log(`[PMO Debug] Sprint: ${sprint.name} (${sprintId})`);
        console.log(`[PMO Debug] Committed Points: ${committedPoints}`);
        console.log(`[PMO Debug] Delivered Points (from Commitment): ${deliveredPoints}`);
        console.log(`[PMO Debug] Added Issues Count: ${addedIssuesKeys.length} | Points: ${addedPoints}`);
        console.log(`[PMO Debug] Added Issues Keys: ${addedIssuesKeys.join(', ')}`);
        console.log(`[PMO Debug] Unplanned Delivered Points: ${unplannedDeliveredPoints}`);

        // 5. Sprint Timing Info (Calculated earlier for health logic)
        const totalDuration = diffDays(sprint.startDate, sprint.endDate || sprint.completeDate);
        const currentProgressDay = sprint.state === 'active' ? diffDays(sprint.startDate, new Date()) : null;
        const progressPercent = currentProgressDay ? (currentProgressDay / totalDuration) * 100 : 100;
        
        const sprintInfo = {
            name: sprint.name,
            startDate: sprint.startDate,
            endDate: sprint.endDate || sprint.completeDate,
            state: sprint.state, // 'active' or 'closed'
            totalDays: totalDuration,
            currentDay: currentProgressDay
        };

        // 6. Final Calculations
        const commitmentReliability = committedPoints > 0 ? (deliveredPoints / committedPoints) * 100 : (deliveredPoints > 0 ? 100 : 0);
        const scopeChange = committedPoints > 0 ? ((addedPoints - removedPoints) / committedPoints) * 100 : 0;
        const totalDelivered = deliveredPoints + unplannedDeliveredPoints;
        const unplannedWork = totalDelivered > 0 ? (unplannedDeliveredPoints / totalDelivered) * 100 : 0;
        const avgCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;

        // 7. Executive Summary Logic (Progress Aware)
        let health = '🟢';
        let healthText = 'Healthy';
        let mainRisk = 'No major risks identified.';
        let isEarlyPhase = sprint.state === 'active' && progressPercent < 30;
        
        if (isEarlyPhase) {
            health = '🔵';
            healthText = 'Monitoring';
            mainRisk = 'Sprint is in early phase (< 30%). Metrics are not yet final.';
        } else if (commitmentReliability < 70 || scopeChange > 20 || (criticalBugsCreated > criticalBugsResolved)) {
            health = '🔴';
            healthText = 'At Risk';
            if (scopeChange > 20) mainRisk = 'High scope creep is destabilizing the sprint.';
            else if (commitmentReliability < 70) mainRisk = 'Low commitment reliability suggests over-planning.';
            else mainRisk = 'Critical bug debt is increasing.';
        } else if (commitmentReliability < 85 || scopeChange > 10) {
            health = '🟡';
            healthText = 'Caution';
            mainRisk = 'Minor delays or scope changes observed.';
        }

        // 8. Decisions Generation
        const decisions = [];
        if (isEarlyPhase) decisions.push('Ensure all items are properly groomed and estimated.');
        if (scopeChange > 20) decisions.push('Approve strict limit on mid-sprint scope changes.');
        if (avgCycleTime > 8) decisions.push('Review workflow bottlenecks (Cycle Time is high).');
        if (blockedCount > 3) decisions.push('Escalate cross-team dependencies.');
        if (criticalBugsCreated > 5) decisions.push('Schedule a dedicated bug-squashing session.');

        // 9. Trends (Mocked for now)
        const getTrend = (val) => val > 0 ? '↑' : val < 0 ? '↓' : '→';

        const report = {
            sprintInfo,
            summary: {
                health,
                healthText,
                mainRisk,
                focusNext: isEarlyPhase ? 'Complete initial committed items' : (commitmentReliability < 80 ? 'Improve estimation accuracy' : 'Maintain delivery velocity'),
                summaryText: isEarlyPhase 
                    ? `Sprint ${sprint.name} is in its early phase. Team has delivered ${totalDelivered} points so far.`
                    : `Sprint ${sprint.name} delivered ${totalDelivered} points with ${commitmentReliability.toFixed(0)}% reliability.`
            },
            metrics: [
                { name: 'Commitment Reliability', value: `${commitmentReliability.toFixed(0)}%`, trend: getTrend(0), confidence: 'High', insight: commitmentReliability < 80 ? 'Rollover due to complexity' : 'Strong execution', description: 'Shows how much of the planned work was actually completed during the sprint.' },
                { name: 'Scope Change', value: `${scopeChange.toFixed(0)}%`, trend: scopeChange > 10 ? '↑' : '→', confidence: 'Medium', insight: scopeChange > 15 ? 'Late requirements added' : 'Stable scope', description: 'Indicates how much the sprint scope changed after it started.' },
                { name: 'Unplanned Work', value: `${unplannedWork.toFixed(0)}%`, trend: '↓', confidence: 'High', insight: 'Includes urgent support tasks', description: 'Represents work that was not planned at sprint start but was completed.' },
                { name: 'Cycle Time', value: `${avgCycleTime.toFixed(1)}d`, trend: '→', confidence: 'Medium', insight: 'Consistent throughput', description: "Average time it takes for a task to move from 'In Progress' to 'Done'." },
                { name: 'Critical Bugs', value: `${criticalBugsCreated}/${criticalBugsResolved}`, trend: '↓', confidence: 'High', insight: 'Created vs Resolved', description: 'Number of high-priority bugs created and resolved during the sprint.' },
                { name: 'Dependency Delays', value: blockedCount, trend: '↑', confidence: 'Low', insight: 'External blockers', description: 'Tasks delayed due to dependencies on other teams or external factors.' }
            ],
            risks: [
                { level: 'High', description: mainRisk, impact: 'Delayed delivery', action: 'Management intervention needed' }
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
            }
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
