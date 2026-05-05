const express = require('express');
const router = express.Router();
const jiraController = require('../controllers/jiraController');
const pmoController = require('../controllers/pmoController');
const aiController = require('../controllers/aiController');
const riskController = require('../controllers/riskController');

// Route for fetching all projects
router.get('/projects', jiraController.getProjects);

// Route for fetching sprints for a specific project
router.get('/projects/:projectKey/sprints', jiraController.getProjectSprints);

// Route for fetching epics for a specific project using JQL
router.get('/projects/:projectKey/epics', jiraController.getProjectEpics);

// Reports Routes
router.get('/reports/overall/:projectKey', jiraController.getOverallReport);

router.get('/reports/epic/:projectKey/:epicId', jiraController.getEpicReport);
router.get('/reports/releases/:projectKey', jiraController.getProjectReleasesReport);
router.get('/reports/pmo-sprint/:projectKey/:sprintId', pmoController.getPMOSprintReport);

// AI Analysis Routes
router.post('/ai/sprint-health', aiController.getSprintHealthAnalysis);
router.post('/ai/release-health', aiController.getReleaseHealthAnalysis);

// Manual Risks Routes
router.get('/risks/:projectKey/:sprintId', riskController.getRisks);
router.post('/risks', riskController.createRisk);
router.put('/risks/:id', riskController.updateRisk);
router.delete('/risks/:id', riskController.deleteRisk);

module.exports = router;
