import React, { useState, useMemo } from 'react';
import { 
    GitPullRequest, GitMerge, CheckCircle, XCircle, AlertTriangle, 
    Activity, ArrowLeft, GitBranch, ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Mock PR data generator to simulate GitHub integration
const generateMockPRs = (issues) => {
    const prs = [];
    const statuses = ['Merged', 'Open', 'Declined'];

    issues.forEach((issue, index) => {
        // Randomly assign 0 to 3 PRs per issue
        const prCount = index % 4 === 0 ? 0 : (index % 3) + 1;
        for (let i = 0; i < prCount; i++) {
            const status = statuses[i % statuses.length];
            prs.push({
                id: `PR-${issue.key}-${i}`,
                issueKey: issue.key,
                title: `Implement ${issue.key} logic`,
                author: issue.assignee || 'Unassigned',
                branch: `feature/${issue.key}-implementation`,
                status: status,
                createdDate: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
                mergedDate: status === 'Merged' ? new Date(Date.now() - Math.random() * 5000000000).toISOString() : null,
                buildStatus: status === 'Open' ? (i % 2 === 0 ? 'Passed' : 'Failed') : 'Passed',
                diffStats: { add: Math.floor(Math.random() * 200), del: Math.floor(Math.random() * 50) }
            });
        }
    });
    return prs;
};

const DeploymentHealth = ({ release, onBack }) => {
    // Flatten issues from release object
    const allIssues = useMemo(() => {
        if (!release || !release.issues) return [];
        return [
            ...release.issues.rolledOver,
            ...release.issues.addedDuring,
            ...release.issues.notCompleted,
            ...release.issues.completed
        ].filter((issue, index, self) => index === self.findIndex((t) => t.key === issue.key));
    }, [release]);

    const prs = useMemo(() => generateMockPRs(allIssues), [allIssues]);

    const [expandedRows, setExpandedRows] = useState({});
    const [statusFilter, setStatusFilter] = useState('All');

    const toggleRow = (key) => {
        setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const metrics = useMemo(() => {
        const total = prs.length;
        const merged = prs.filter(pr => pr.status === 'Merged').length;
        const open = prs.filter(pr => pr.status === 'Open').length;
        const declined = prs.filter(pr => pr.status === 'Declined').length;
        const issuesNoPrs = allIssues.filter(issue => !prs.some(pr => pr.issueKey === issue.key)).length;
        const buildFailed = prs.filter(pr => pr.buildStatus === 'Failed').length;
        const mergeRate = total > 0 ? Math.round((merged / total) * 100) : 0;

        return { total, merged, open, declined, issuesNoPrs, buildFailed, mergeRate };
    }, [prs, allIssues]);

    const chartData = useMemo(() => {
        // Simple mock last 14 days chart data
        const data = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                Merged: Math.floor(Math.random() * 5),
                Opened: Math.floor(Math.random() * 5)
            });
        }
        return data;
    }, []);

    const authorStats = useMemo(() => {
        const stats = {};
        prs.forEach(pr => {
            if (!stats[pr.author]) {
                stats[pr.author] = { name: pr.author, total: 0, merged: 0, open: 0, declined: 0 };
            }
            stats[pr.author].total += 1;
            if (pr.status === 'Merged') stats[pr.author].merged += 1;
            else if (pr.status === 'Open') stats[pr.author].open += 1;
            else if (pr.status === 'Declined') stats[pr.author].declined += 1;
        });
        return Object.values(stats).sort((a, b) => b.total - a.total);
    }, [prs]);

    if (!release) return null;

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                <button
                    className="btn-invisible"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600, padding: 0 }}
                    onClick={onBack}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity color="#10B981" /> {release.name} — Deployment Health
                    </h2>
                </div>
            </div>

            {/* Blockers Alert */}
            {metrics.buildFailed > 0 || metrics.issuesNoPrs > 0 ? (
                <div style={{ 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between'
                }}>
                    <div>
                        <h4 style={{ color: '#EF4444', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={18} /> Release Blocked — Blockers Detected
                        </h4>
                        <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, paddingLeft: '24px' }}>
                            {metrics.open > 0 && <li>{metrics.open} open PRs not yet merged</li>}
                            {metrics.buildFailed > 0 && <li>{metrics.buildFailed} issue(s) with failing CI build</li>}
                            {metrics.issuesNoPrs > 0 && <li>{metrics.issuesNoPrs} issue(s) have no linked PRs</li>}
                        </ul>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', padding: '4px 12px', borderRadius: '16px', fontWeight: 'bold' }}>
                            {metrics.mergeRate}% merge rate
                        </div>
                    </div>
                </div>
            ) : null}

            {/* PR Health KPI Cards */}
            <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>PR Health</h3>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="report-card" style={{ flex: '1 1 200px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                            <GitPullRequest size={16} /> Total PRs
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.total}</div>
                    </div>
                    <div className="report-card" style={{ flex: '1 1 200px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#10B981' }}>
                            <GitMerge size={16} /> Merged PRs
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.merged}</div>
                    </div>
                    <div className="report-card" style={{ flex: '1 1 200px', padding: '20px', border: metrics.open > 0 ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', color: '#F59E0B' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><GitPullRequest size={16} /> Open PRs</div>
                            {metrics.open > 0 && <span style={{ fontSize: '0.7rem', background: '#F59E0B', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>ATTENTION</span>}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.open}</div>
                    </div>
                    <div className="report-card" style={{ flex: '1 1 200px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#EF4444' }}>
                            <XCircle size={16} /> Declined PRs
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{metrics.declined}</div>
                    </div>
                </div>
            </div>

            {/* PR Activity Chart */}
            <div className="report-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>PR Activity — Last 14 Days</h3>
                <div style={{ height: '200px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="Merged" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Opened" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Engineers List */}
            <div className="report-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Engineers ({authorStats.length})</h3>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Engineer</th>
                            <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Total PRs</th>
                            <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Merged</th>
                            <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Open</th>
                            <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Declined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {authorStats.map((author) => (
                            <tr key={author.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '12px 8px', fontWeight: 600 }}>{author.name}</td>
                                <td style={{ padding: '12px 8px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                        <GitBranch size={12} /> {author.total}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 8px', color: '#10B981' }}>{author.merged}</td>
                                <td style={{ padding: '12px 8px', color: '#F59E0B' }}>{author.open}</td>
                                <td style={{ padding: '12px 8px', color: '#EF4444' }}>{author.declined}</td>
                            </tr>
                        ))}
                        {authorStats.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No engineers found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DeploymentHealth;
