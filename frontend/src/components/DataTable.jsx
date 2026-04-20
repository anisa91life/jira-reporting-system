import React from 'react';

const getTagClass = (status) => {
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('resolved') || s.includes('closed')) return 'done';
    if (s.includes('progress') || s.includes('review')) return 'progress';
    return 'todo';
};

const getPriorityColor = (priority) => {
    const value = String(priority || '').toLowerCase();
    if (value.includes('urgent')) return '#dc2626';
    if (value.includes('high')) return '#ef4444';
    if (value.includes('medium')) return '#f59e0b';
    if (value.includes('low')) return '#3b82f6';
    return 'var(--text-secondary)';
};

const DataTable = ({ issues }) => {
    if (!issues || issues.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No recent issues available.
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '24px', overflow: 'hidden' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Recent Activity & Tasks</h3>
            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Summary</th>
                            <th>Status</th>
                            <th>Assignee</th>
                            <th>Priority</th>
                        </tr>
                    </thead>
                    <tbody>
                        {issues.map(issue => (
                            <tr key={issue.key}>
                                <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{issue.key}</td>
                                <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {issue.summary}
                                </td>
                                <td>
                                    <span className={`tag-badge ${getTagClass(issue.status)}`}>
                                        {issue.status}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>{issue.assignee}</td>
                                <td>
                                    <span style={{ 
                                        color: getPriorityColor(issue.priority),
                                        fontWeight: 600,
                                        fontSize: '0.85rem'
                                    }}>
                                        {issue.priority}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;
