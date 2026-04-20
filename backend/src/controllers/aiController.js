const pmoController = require('./pmoController');
const jiraController = require('./jiraController');
const aiAnalysisService = require('../services/aiAnalysisService');

const getSprintHealthAnalysis = async (req, res) => {
    // Determine where parameters are coming from
    const projectKey = req.body.projectKey || req.query.projectKey;
    const sprintId = req.body.sprintId || req.query.sprintId;

    if (!projectKey || !sprintId) {
        return res.status(400).json({ error: "projectKey and sprintId are required in the request body" });
    }

    try {
        console.log(`[AI] Generating health analysis for Project: ${projectKey}, Sprint: ${sprintId}`);

        // 1. Call existing PMO sprint report logic
        const pmoReport = await new Promise((resolve, reject) => {
            const mockReq = { params: { projectKey, sprintId } };
            const mockRes = {
                json: (data) => resolve(data),
                status: () => ({ json: (err) => reject(new Error(err.error || 'Unknown error in PMO Report')) })
            };
            pmoController.getPMOSprintReport(mockReq, mockRes);
        });

        // Early return for FUTURE sprints — no AI analysis needed
        if (pmoReport.status === 'NOT_STARTED') {
            console.log(`[AI] Sprint has not started yet. Skipping AI analysis.`);
            return res.json({
                aiAnalysis: {
                    overallAssessment: 'Green — Sprint has not started yet. No metrics available.',
                    whatStandsOut: 'This sprint is scheduled for the future. Come back once it starts for a full health analysis.',
                    mainRisks: [],
                    likelyCauses: [],
                    suggestedActions: ['Complete sprint planning and backlog grooming before the sprint starts.'],
                    confidence: 'N/A — Sprint has not started'
                },
                sourceMetrics: null
            });
        }

        // Get basic sprint report for status/assignee distribution
        const sprintReport = await new Promise((resolve, reject) => {
            const mockReq = { params: { projectKey, sprintId } };
            const mockRes = {
                json: (data) => resolve(data),
                status: () => ({ json: () => resolve({}) })
            };
            jiraController.getSprintReport(mockReq, mockRes);
        });

        // 2. Extract relevant metrics
        const metricsMap = {};
        if (pmoReport.metrics) {
            pmoReport.metrics.forEach(m => {
                metricsMap[m.name] = m.value;
            });
        }

        const inputData = {
            sprintName: pmoReport.sprintInfo?.name || "Unknown Sprint",
            sprintStatus: pmoReport.sprintInfo?.state || "unknown",
            sprintPhase: pmoReport.sprintInfo?.sprintPhase || "unknown",
            sprintDay: pmoReport.sprintInfo?.currentDay || 0,
            totalDays: pmoReport.sprintInfo?.totalDays || 0,
            progressPercent: pmoReport.sprintInfo?.progressPercent || 0,
            rolloverCount: pmoReport.rolloverCount || 0,
            metrics: {
                commitmentReliability: metricsMap['Commitment Reliability'] || '0%',
                scopeChange: metricsMap['Scope Change'] || '0%',
                unplannedWork: metricsMap['Unplanned Work'] || 'N/A',
                cycleTime: metricsMap['Cycle Time'] || '0d',
                criticalBugsCreated: metricsMap['Critical Bugs'] ? parseInt(metricsMap['Critical Bugs'].split('/')[0]) || 0 : 0,
                criticalBugsResolved: metricsMap['Critical Bugs'] ? parseInt(metricsMap['Critical Bugs'].split('/')[1]) || 0 : 0,
                dependencyDelays: metricsMap['Dependency Delays'] || 0
            },
            statusDistribution: sprintReport.statusDistribution || {},
            assigneeWorkload: pmoReport.assigneeWorkload || {},
            assigneeDistribution: sprintReport.assigneeDistribution || {}
        };

        console.log("[AI] Source Metrics Extracted:", JSON.stringify(inputData, null, 2));

        // 3. Call analyzeSprintHealth()
        const aiAnalysis = await aiAnalysisService.analyzeSprintHealth(inputData);

        // 4. Return AI result
        res.json({
            aiAnalysis: aiAnalysis,
            sourceMetrics: inputData
        });

    } catch (error) {
        console.error("Error in AI Sprint Health Analysis:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getSprintHealthAnalysis
};
