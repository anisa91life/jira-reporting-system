import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Adjust if backend runs on a different port
});

export const getProjects = async () => {
    const res = await api.get('/projects');
    return res.data;
};

export const getProjectSprints = async (projectKey) => {
    const res = await api.get(`/projects/${projectKey}/sprints`);
    return res.data;
};

export const getProjectEpics = async (projectKey) => {
    const res = await api.get(`/projects/${projectKey}/epics`);
    return res.data;
};

export const getOverallReport = async (projectKey) => {
    const res = await api.get(`/reports/overall/${projectKey}`);
    return res.data;
};

export const getSprintReport = async (projectKey, sprintId) => {
    const res = await api.get(`/reports/sprint/${projectKey}/${sprintId}`);
    return res.data;
};

export const getEpicReport = async (projectKey, epicId) => {
    const res = await api.get(`/reports/epic/${projectKey}/${epicId}`);
    return res.data;
};

export const getPMOSprintReport = async (projectKey, sprintId) => {
    const res = await api.get(`/reports/pmo-sprint/${projectKey}/${sprintId}`);
    return res.data;
};

export const getAISprintHealth = async (projectKey, sprintId) => {
    const res = await api.post('/ai/sprint-health', { projectKey, sprintId });
    return res.data;
};
