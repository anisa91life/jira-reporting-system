const jiraService = require('../services/jiraService');
const { isEffectivelyDone } = require('../utils/jiraUtils');

const getProjects = async (req, res) => {
    try {
        const projects = await jiraService.getProjects();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getProjectSprints = async (req, res) => {
    const { projectKey } = req.params;
    try {
        // First, fetch the boards for this project
        const boardsRes = await jiraService.getBoardsByProject(projectKey);
        const boards = boardsRes.values || [];

        if (boards.length === 0) {
            return res.json([]); // No boards, so no sprints
        }

        // Fetch sprints from the first SCRUM board (Kanban boards do not support sprints)
        const scrumBoards = boards.filter(b => b.type === 'scrum');
        if (scrumBoards.length === 0) {
            return res.json([]); // No scrum boards, so no sprints
        }

        const boardId = scrumBoards[0].id;
        const sprintsRes = await jiraService.getSprints(boardId);
        res.json(sprintsRes.values || []);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getProjectEpics = async (req, res) => {
    const { projectKey } = req.params;
    try {
        const data = await jiraService.getEpics(projectKey);
        // Map the JQL search results back to a simple epics array
        const epics = (data.issues || []).map(issue => ({
            id: issue.id,
            key: issue.key,
            name: issue.fields.summary
        }));
        res.json(epics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getTeamMembers = async (projectKey) => {
    try {
        const roles = await jiraService.getProjectRoles(projectKey);
        // We look for common role names that usually define the core team
        // Common roles: 'Administrators', 'Developers', 'Service Desk Team', 'Members'
        const teamRoleNames = ['Developers', 'Members', 'Software Development', 'Administrators', 'Service Desk Team'];

        const allMemberNames = new Set();

        for (const roleName of Object.keys(roles)) {
            if (teamRoleNames.includes(roleName)) {
                const roleId = roles[roleName].split('/').pop();
                const members = await jiraService.getRoleMembers(projectKey, roleId);

                members.forEach(m => {
                    // Only include human users (type: atlassian-user-role-actor)
                    if (m.type === 'atlassian-user-role-actor' && m.displayName) {
                        const name = m.displayName.toLowerCase();
                        const isNotBot = !name.includes('bot') &&
                            !name.includes('automation') &&
                            !name.includes('addon');

                        if (isNotBot) {
                            allMemberNames.add(m.displayName);
                        }
                    }
                });
            }
        }
        return Array.from(allMemberNames);
    } catch (error) {
        console.error("Error identifying team members:", error.message);
        return [];
    }
};

const extractSprintIdsFromText = (rawValue) => {
    if (!rawValue) return [];
    const values = String(rawValue).split(',').map(v => v.trim()).filter(Boolean);
    const sprintIds = new Set();

    values.forEach((val) => {
        if (/^\d+$/.test(val)) {
            sprintIds.add(String(val));
        }

        const idMatches = val.match(/id=(\d+)/g) || [];
        idMatches.forEach((m) => {
            const id = m.split('=')[1];
            if (id) sprintIds.add(String(id));
        });
    });

    return Array.from(sprintIds);
};

const extractIssueSprintIds = (issue) => {
    const sprintIds = new Set();

    const fieldSprints = issue.fields?.customfield_10007;
    if (Array.isArray(fieldSprints)) {
        fieldSprints.forEach((s) => {
            if (typeof s === 'number' || typeof s === 'string') {
                extractSprintIdsFromText(s).forEach(id => sprintIds.add(id));
            } else if (s && typeof s === 'object' && s.id) {
                sprintIds.add(String(s.id));
            }
        });
    }

    const histories = issue.changelog?.histories || [];
    histories.forEach((history) => {
        (history.items || []).forEach((item) => {
            if (item.field !== 'Sprint') return;
            extractSprintIdsFromText(item.fromString).forEach(id => sprintIds.add(id));
            extractSprintIdsFromText(item.toString).forEach(id => sprintIds.add(id));
        });
    });

    return Array.from(sprintIds);
};

const getOverallReport = async (req, res) => {
    const { projectKey } = req.params;
    try {
        // Query to get all standard issues for the project
        const jql = `project = "${projectKey}"`;
        const data = await jiraService.getIssuesByJQL(jql);
        const issues = data.issues || [];

        // Aggregating statistics
        const result = {
            totalIssues: 0, // Calculated during iteration (excluding Done issues)
            statusDistribution: {},
            priorityDistribution: {},
            assigneeDistribution: {}
        };

        // Seed precise team members
        const teamMembers = await getTeamMembers(projectKey);
        teamMembers.forEach(name => {
            result.assigneeDistribution[name] = 0;
        });

        issues.forEach(issue => {
            const statusCatName = issue.fields.status?.statusCategory?.name;
            const statusCatKey = issue.fields.status?.statusCategory?.key;

            // Only count issues that are NOT in a Done status
            if (statusCatName !== 'Done' && statusCatKey !== 'done') {
                result.totalIssues++;
            }

            const status = issue.fields.status?.name || 'Unknown';
            const priority = issue.fields.priority?.name || 'None';
            const assignee = issue.fields.assignee?.displayName || 'Unassigned';

            result.statusDistribution[status] = (result.statusDistribution[status] || 0) + 1;
            result.priorityDistribution[priority] = (result.priorityDistribution[priority] || 0) + 1;
            result.assigneeDistribution[assignee] = (result.assigneeDistribution[assignee] || 0) + 1;
        });

        result.recentIssues = issues.slice(0, 10).map(i => ({
            key: i.key,
            summary: i.fields.summary,
            status: i.fields.status?.name || 'Unknown',
            assignee: i.fields.assignee?.displayName || 'Unassigned',
            priority: i.fields.priority?.name || 'None'
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



const getEpicReport = async (req, res) => {
    const { projectKey, epicId } = req.params;
    try {
        const jql = `project = "${projectKey}" AND parent = "${epicId}"`;
        const data = await jiraService.getIssuesByJQL(jql);
        const issues = data.issues || [];

        const result = {
            totalIssues: issues.length,
            doneIssues: 0,
            remainingIssues: 0,
            statusDistribution: {},
            priorityDistribution: {},
            progressPercentage: 0,
            teamMembers: []
        };

        const assigneeMap = {};

        issues.forEach(issue => {
            const priority = issue.fields.priority?.name || 'None';
            result.priorityDistribution[priority] = (result.priorityDistribution[priority] || 0) + 1;

            // Extract Assignee
            const assignee = issue.fields.assignee;
            if (assignee) {
                const id = assignee.accountId || assignee.displayName;
                if (!assigneeMap[id]) {
                    assigneeMap[id] = {
                        accountId: assignee.accountId || '',
                        displayName: assignee.displayName || 'Unknown',
                        avatarUrl: assignee.avatarUrls ? (assignee.avatarUrls['48x48'] || assignee.avatarUrls['32x32']) : '',
                        ticketCount: 0
                    };
                }
                assigneeMap[id].ticketCount++;
            }

            const statusCat = issue.fields.status?.statusCategory?.key || '';
            if (statusCat === 'done') {
                result.doneIssues++;
            } else {
                result.remainingIssues++;
            }

            const status = issue.fields.status?.name || 'Unknown';
            result.statusDistribution[status] = (result.statusDistribution[status] || 0) + 1;
        });

        if (result.totalIssues > 0) {
            result.progressPercentage = ((result.doneIssues / result.totalIssues) * 100).toFixed(2);
        }

        result.teamMembers = Object.values(assigneeMap).sort((a, b) => b.ticketCount - a.ticketCount);

        result.recentIssues = issues.slice(0, 10).map(i => ({
            key: i.key,
            summary: i.fields.summary,
            status: i.fields.status?.name || 'Unknown',
            assignee: i.fields.assignee?.displayName || 'Unassigned',
            priority: i.fields.priority?.name || 'None'
        }));

        res.json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getProjectReleasesReport = async (req, res) => {
    const { projectKey } = req.params;
    try {
        const versionsData = await jiraService.getProjectVersions(projectKey);
        const versions = Array.isArray(versionsData) ? versionsData : (versionsData?.values || []);

        const jql = `project = "${projectKey}" AND fixVersion IS NOT EMPTY`;
        const data = await jiraService.getIssuesWithChangelog(jql);
        const issues = data.issues || [];

        // Build release map and date lookup
        const versionDateMap = {};
        const releases = versions.map(v => {
            const vDate = v.startDate || v.releaseDate || '0';
            versionDateMap[v.id] = new Date(vDate).getTime();

            return {
                id: v.id,
                name: v.name,
                description: v.description || '',
                startDate: v.startDate,
                releaseDate: v.releaseDate,
                released: v.released,
                metrics: {
                    totalIssues: 0,
                    completedIssues: 0,
                    rolledOverIssues: 0,
                    addedDuringRelease: 0,
                    notCompletedIssues: 0,
                },
                issues: {
                    rolledOver: [],
                    addedDuring: [],
                    notCompleted: [],
                    completed: []
                }
            };
        }).sort((a, b) => {
            const dateA = new Date(a.releaseDate || a.startDate || '1970-01-01').getTime();
            const dateB = new Date(b.releaseDate || b.startDate || '1970-01-01').getTime();
            return dateB - dateA; // Descending (newest first)
        });

        const releaseMap = {};
        releases.forEach(r => releaseMap[r.id] = r);

        issues.forEach(issue => {
            const fixVersions = issue.fields.fixVersions || [];
            
            // 1. Extract Fix Version History from Changelog
            const previousVersionNames = new Set();
            if (issue.changelog && issue.changelog.histories) {
                issue.changelog.histories.forEach(history => {
                    history.items.forEach(item => {
                        if (item.field === 'Fix Version' && item.fromString) {
                            // Collect names of previous versions. 
                            // Note: item.from is the ID, but item.fromString is often more reliable
                            const names = item.fromString.split(',').map(v => v.trim());
                            names.forEach(name => previousVersionNames.add(name));
                        }
                    });
                });
            }

            fixVersions.forEach(fv => {
                const release = releaseMap[fv.id];
                if (!release) return;

                const isFinished = isEffectivelyDone(issue, projectKey);
                const createdDate = new Date(issue.fields.created);
                const currentReleaseStart = release.startDate ? new Date(release.startDate).getTime() : 0;
                
                let isReleaseRollover = false;
                let addedAfterStart = false;

                // 2. Logic: Explicit Movement from EARLIER Release
                // Match names from history back to the actual version objects to compare dates
                if (previousVersionNames.size > 0) {
                    previousVersionNames.forEach(prevName => {
                        const prevVer = versions.find(v => v.name === prevName);
                        if (prevVer && prevVer.id !== fv.id) {
                            const prevDate = versionDateMap[prevVer.id] || 0;
                            const currentTargetDate = versionDateMap[fv.id] || 0;
                            
                            // If it came from a release that was scheduled earlier
                            if (prevDate > 0 && currentTargetDate > 0 && prevDate < currentTargetDate) {
                                isReleaseRollover = true;
                            }
                        }
                    });
                }

                // 3. Logic: Scope Addition (Added after start)
                if (currentReleaseStart > 0 && createdDate.getTime() > currentReleaseStart) {
                    addedAfterStart = true;
                }

                // 4. Fallback Handling
                // Issues created before start but with NO version history are "initial scope", NOT rollover
                // This is implicitly handled because isReleaseRollover defaults to false unless explicit movement is found.

                let category = 'ongoing';
                if (isReleaseRollover) {
                    category = 'rolledOver';
                    release.metrics.rolledOverIssues++;
                } else if (addedAfterStart) {
                    category = 'addedDuring';
                    release.metrics.addedDuringRelease++;
                }

                release.metrics.totalIssues++;

                if (isFinished) {
                    release.metrics.completedIssues++;
                    if (category !== 'addedDuring' && category !== 'rolledOver') category = 'completed';
                } else {
                    release.metrics.notCompletedIssues++;
                    if (category !== 'addedDuring' && category !== 'rolledOver') category = 'notCompleted';
                }

                const issueData = {
                    key: issue.key,
                    title: issue.fields.summary,
                    status: issue.fields.status?.name || 'Unknown',
                    assignee: issue.fields.assignee?.displayName || 'Unassigned',
                    priority: issue.fields.priority?.name || 'None',
                    addedToRelease: addedAfterStart ? 'After Start' : createdDate.toLocaleDateString()
                };

                const now = new Date();
                const releaseEnd = release.releaseDate ? new Date(release.releaseDate) : null;
                const isCompletedRelease = Boolean(release.released) || Boolean(releaseEnd && releaseEnd < now);
                const isInProgressRelease = Boolean(release.startDate && new Date(release.startDate) <= now && (!releaseEnd || releaseEnd >= now));
                const isPendingRelease = !isCompletedRelease && !isInProgressRelease;

                if (category === 'rolledOver') release.issues.rolledOver.push(issueData);
                else if (category === 'addedDuring') release.issues.addedDuring.push(issueData);
                else if (!isFinished) release.issues.notCompleted.push(issueData);
                else release.issues.completed.push(issueData);

                // For pending releases, always populate completion tabs by status.
                if (isPendingRelease) {
                    if (isFinished) {
                        if (!release.issues.completed.some(i => i.key === issueData.key)) {
                            release.issues.completed.push(issueData);
                        }
                    } else {
                        if (!release.issues.notCompleted.some(i => i.key === issueData.key)) {
                            release.issues.notCompleted.push(issueData);
                        }
                    }
                }
            });
        });

        res.json({ releases: releases });

    } catch (error) {
        console.error("Release Report Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const getEpicsAggregatedReport = async (req, res) => {
    const { projectKey } = req.params;
    try {
        const data = await jiraService.getEpicsAggregatedData(projectKey);
        res.json(data);
    } catch (error) {
        console.error("Epic Aggregated Report Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getProjects,
    getProjectSprints,
    getProjectEpics,
    getOverallReport,
    getProjectReleasesReport,
    getEpicReport,
    getEpicsAggregatedReport
};
