const db = require('../config/database');

const getRisks = async (req, res) => {
    const { projectKey, sprintId } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM manual_risks WHERE project_key = $1 AND sprint_id = $2 ORDER BY created_at DESC',
            [projectKey, sprintId]
        );
        res.json({ risks: result.rows });
    } catch (error) {
        console.error('[RiskController] getRisks error:', error);
        res.status(500).json({ error: 'Failed to fetch risks' });
    }
};

const createRisk = async (req, res) => {
    const { projectKey, sprintId, title, description, severity } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO manual_risks (project_key, sprint_id, title, description, severity, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
            [projectKey, sprintId, title, description, severity || 'Medium']
        );
        res.status(201).json({ risk: result.rows[0] });
    } catch (error) {
        console.error('[RiskController] createRisk error:', error);
        res.status(500).json({ error: 'Failed to create risk' });
    }
};

const updateRisk = async (req, res) => {
    const { id } = req.params;
    const { title, description, severity } = req.body;
    try {
        const result = await db.query(
            `UPDATE manual_risks 
             SET title = $1, description = $2, severity = $3, updated_at = NOW() 
             WHERE id = $4 RETURNING *`,
            [title, description, severity, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Risk not found' });
        }
        res.json({ risk: result.rows[0] });
    } catch (error) {
        console.error('[RiskController] updateRisk error:', error);
        res.status(500).json({ error: 'Failed to update risk' });
    }
};

const deleteRisk = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM manual_risks WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Risk not found' });
        }
        res.json({ message: 'Risk deleted successfully', id });
    } catch (error) {
        console.error('[RiskController] deleteRisk error:', error);
        res.status(500).json({ error: 'Failed to delete risk' });
    }
};

module.exports = {
    getRisks,
    createRisk,
    updateRisk,
    deleteRisk
};
