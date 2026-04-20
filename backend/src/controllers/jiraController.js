const jiraService = require('../services/jiraService');

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

const getSprintReport = async (req, res) => {
    const { projectKey, sprintId } = req.params;
    try {
        const jql = `project = "${projectKey}" AND Sprint = ${sprintId}`;
        const data = await jiraService.getIssuesByJQL(jql);
        const issues = data.issues || [];

        const result = {
            totalIssues: issues.length,
            doneIssues: 0,
            notDoneIssues: 0,
            statusDistribution: {},
            priorityDistribution: {},
            assigneeDistribution: {},
            completionPercentage: 0
        };

        issues.forEach(issue => {
            const status = issue.fields.status?.name || 'Unknown';
            const priority = issue.fields.priority?.name || 'None';

            result.statusDistribution[status] = (result.statusDistribution[status] || 0) + 1;
            result.priorityDistribution[priority] = (result.priorityDistribution[priority] || 0) + 1;

            const statusCat = issue.fields.status?.statusCategory?.key || '';
            if (statusCat === 'done') {
                result.doneIssues++;
            } else {
                result.notDoneIssues++;
            }

            const assignee = issue.fields.assignee?.displayName || 'Unassigned';
            result.assigneeDistribution[assignee] = (result.assigneeDistribution[assignee] || 0) + 1;
        });

        if (result.totalIssues > 0) {
            result.completionPercentage = ((result.doneIssues / result.totalIssues) * 100).toFixed(2);
        }

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
            progressPercentage: 0
        };

        issues.forEach(issue => {
            const priority = issue.fields.priority?.name || 'None';
            result.priorityDistribution[priority] = (result.priorityDistribution[priority] || 0) + 1;

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

module.exports = {
    getProjects,
    getProjectSprints,
    getProjectEpics,
    getOverallReport,
    getSprintReport,
    getEpicReport
};
