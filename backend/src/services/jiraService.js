const axios = require('axios');

/**
 * Jira API uses Basic Authentication.
 * To authenticate, we encode `email:api_token` into Base64 format.
 * This encoded string is then passed in the "Authorization" HTTP header as "Basic <base64_string>".
 */
const getAuthHeader = () => {
    const { JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
        throw new Error("Jira credentials missing in .env file");
    }
    const token = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    return `Basic ${token}`;
};

const getAxiosInstance = () => {
    const { JIRA_BASE_URL } = process.env;
    if (!JIRA_BASE_URL) {
        throw new Error("JIRA_BASE_URL missing in .env file");
    }
    return axios.create({
        baseURL: JIRA_BASE_URL,
        headers: {
            'Authorization': getAuthHeader(),
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });
};

const jiraService = {
    // Standard Platform API for projects
    getProjects: async () => {
        try {
            const api = getAxiosInstance();
            const response = await api.get('/rest/api/3/project');
            return response.data;
        } catch (error) {
            console.error("Error fetching projects:", error.response?.data || error.message);
            throw error;
        }
    },

    // Agile API for boards
    getBoardsByProject: async (projectKey) => {
        try {
            const api = getAxiosInstance();
            // Boards are retrieved through Agile API, filtering by project
            const response = await api.get(`/rest/agile/1.0/board?projectKeyOrId=${projectKey}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching boards for ${projectKey}:`, error.response?.data || error.message);
            throw error;
        }
    },

    // Agile API for sprints (requires board ID)
    getSprints: async (boardId) => {
        try {
            const api = getAxiosInstance();
            const response = await api.get(`/rest/agile/1.0/board/${boardId}/sprint`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching sprints for board ${boardId}:`, error.response?.data || error.message);
            throw error;
        }
    },

    // Platform API for searching using JQL
    getEpics: async (projectKey) => {
        try {
            // JQL to find all Epics for the project
            // Issue Type 10000 is typically Epic, but searching by issuetype = Epic is safer
            const jql = `project = "${projectKey}" AND issuetype = Epic ORDER BY created DESC`;
            return await jiraService.getIssuesByJQL(jql);
        } catch (error) {
            console.error(`Error fetching epics for ${projectKey}:`, error.response?.data || error.message);
            throw error;
        }
    },

    // Platform API for custom JQL queries (used for all complex reporting)
    getIssuesByJQL: async (jql) => {
        try {
            // Using the modern search/jql cursor API directly as legacy search is deactivated on this instance
            return await jiraService.getIssuesByJQLCursor(jql);
        } catch (error) {
            console.error("Error fetching issues by JQL:", error.response?.data || error.message);
            throw error;
        }
    },

    // Standard cursor-based search for modern Jira Cloud
    getIssuesByJQLCursor: async (jql) => {
        const api = getAxiosInstance();
        let allIssues = [];
        let nextPageToken = null;
        do {
            const payload = {
                jql: jql,
                maxResults: 100,
                fields: ["summary", "status", "assignee", "priority", "issuetype", "parent"]
            };
            if (nextPageToken) payload.nextPageToken = nextPageToken;

            // In cursor API, we hit search/jql
            const response = await api.post('rest/api/3/search/jql', payload);
            allIssues = allIssues.concat(response.data.issues || []);
            nextPageToken = response.data.nextPageToken;
            if (allIssues.length >= 800000) break;
        } while (nextPageToken);
        return { issues: allIssues, total: allIssues.length };
    },

    // Get project roles
    getProjectRoles: async (projectKey) => {
        try {
            const api = getAxiosInstance();
            const response = await api.get(`/rest/api/3/project/${projectKey}/role`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching roles for ${projectKey}:`, error.response?.data || error.message);
            return {};
        }
    },

    // Get actual members of a specific role
    getRoleMembers: async (projectKey, roleId) => {
        try {
            const api = getAxiosInstance();
            const response = await api.get(`/rest/api/3/project/${projectKey}/role/${roleId}`);
            return response.data.actors || [];
        } catch (error) {
            console.error(`Error fetching role members for ${roleId}:`, error.response?.data || error.message);
            return [];
        }
    },

    // Get all assignable users on a project
    getAssignableUsers: async (projectKey) => {
        try {
            const api = getAxiosInstance();
            // maxResults determines how many members to fetch
            const response = await api.get(`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=1000`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching users for ${projectKey}:`, error.response?.data || error.message);
            throw error;
        }
    },

    // Agile API: Get details for a specific sprint
    getSprintDetails: async (sprintId) => {
        try {
            const api = getAxiosInstance();
            const response = await api.get(`/rest/agile/1.0/sprint/${sprintId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching sprint ${sprintId}:`, error.response?.data || error.message);
            throw error;
        }
    },

    // Agile API: Get all sprints for a specific board
    getBoardSprints: async (boardId) => {
        try {
            const api = getAxiosInstance();
            const response = await api.get(`/rest/agile/1.0/board/${boardId}/sprint`);
            return response.data.values || [];
        } catch (error) {
            console.error(`Error fetching sprints for board ${boardId}:`, error.response?.data || error.message);
            throw error;
        }
    },

    // Platform API: Search issues with full changelog history (Required for Cycle Time and Scope Change)
    getIssuesWithChangelog: async (jql) => {
        try {
            // Force usage of modern search/jql cursor API for stability
            return await jiraService.getIssuesWithChangelogCursor(jql);
        } catch (error) {
            console.error("Error fetching issues with changelog:", error.response?.data || error.message);
            throw error;
        }
    },

    // Cursor-based variant for changelog search
    getIssuesWithChangelogCursor: async (jql) => {
        const api = getAxiosInstance();
        let allIssues = [];
        let nextPageToken = null;
        do {
            const payload = {
                jql: jql,
                maxResults: 100,
                expand: "changelog",
                fields: ["summary", "status", "assignee", "priority", "issuetype", "parent", "issuelinks", "created", "updated", "customfield_11224", "customfield_10004", "customfield_10007"]
            };
            if (nextPageToken) payload.nextPageToken = nextPageToken;

            const response = await api.post('rest/api/3/search/jql', payload);
            console.log(`[Jira] JQL Search Success: ${response.status} - Batch Size: ${response.data.issues?.length || 0}`);
            allIssues = allIssues.concat(response.data.issues || []);
            nextPageToken = response.data.nextPageToken;
            if (allIssues.length >= 500) break;
        } while (nextPageToken);
        return { issues: allIssues, total: allIssues.length };
    }
};

module.exports = jiraService;
