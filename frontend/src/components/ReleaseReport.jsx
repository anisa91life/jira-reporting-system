import React, { useState, useMemo } from 'react';
import { Layers, Activity, CheckCircle, RotateCcw, PlusCircle, ArrowLeft, XCircle, TrendingUp } from 'lucide-react';

const ReleaseReport = ({ data, projectKey }) => {
    const [selectedReleaseId, setSelectedReleaseId] = useState(null);
    const [activeTab, setActiveTab] = useState('rolledOver'); // rolledOver, addedDuring, notCompleted, completed
    const [showAllReleases, setShowAllReleases] = useState(false);

    // Data passed should be `{ releases: [...] }`
    const releases = data?.releases || [];

    const selectedRelease = useMemo(() => {
        return releases.find(r => r.id === selectedReleaseId);
    }, [releases, selectedReleaseId]);

    // Calculate aggregated metrics
    const aggMetrics = useMemo(() => {
        if (!releases.length) return { totalReleases: 0, totalIssues: 0, avgCompletion: 0, avgRollover: 0 };

        let totalIssues = 0;
        let sumCompletion = 0;
        let sumRollover = 0;
        let validReleases = 0;

        releases.forEach(r => {
            const m = r.metrics;
            totalIssues += m.totalIssues;
            if (m.totalIssues > 0) {
                sumCompletion += (m.completedIssues / m.totalIssues) * 100;
                sumRollover += (m.rolledOverIssues / m.totalIssues) * 100;
                validReleases++;
            }
        });

        return {
            totalReleases: releases.length,
            totalIssues,
            avgCompletion: validReleases ? (sumCompletion / validReleases).toFixed(1) : 0,
            avgRollover: validReleases ? (sumRollover / validReleases).toFixed(1) : 0
        };
    }, [releases]);

    // Format Date helper
    const formatDate = (dateStr) => {
        if (!dateStr) return 'TBD';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusStyle = (status) => {
        const s = status.toLowerCase();
        if (s === 'done' || s === 'completed' || s === 'resolved' || s === 'closed') {
            return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' };
        }
        if (s === 'in progress' || s === 'in review' || s === 'testing') {
            return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' };
        }
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' }; // to do style
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Top Aggregated Cards */}
            <div className="grid-cards fade-in">
                <div className="report-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Releases</div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--text-primary)' }}>{aggMetrics.totalReleases}</div>
                            <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Across all versions</div>
                        </div>
                        <div className="icon-box" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                            <Layers size={24} />
                        </div>
                    </div>
                </div>

                <div className="report-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Issues</div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--text-primary)' }}>{aggMetrics.totalIssues}</div>
                            <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Tracked across releases</div>
                        </div>
                        <div className="icon-box accent-success" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="report-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Completion Rate</div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--text-primary)' }}>{aggMetrics.avgCompletion}%</div>
                            <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Issues completed per release</div>
                        </div>
                        <div className="icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="report-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Roll-over Rate</div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, margin: '8px 0', color: 'var(--text-primary)' }}>{aggMetrics.avgRollover}%</div>
                            <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Issues carried forward</div>
                        </div>
                        <div className="icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                            <RotateCcw size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Wrapper */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', minHeight: '600px' }}>

                {/* Left Column: All Releases List */}
                <div style={{ width: '350px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>All Releases</h3>

                    {releases.length === 0 && (
                        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No releases found for this project.
                        </div>
                    )}

                    {(showAllReleases ? releases : releases.slice(0, 3)).map(release => {
                        const m = release.metrics;
                        const completionRate = m.totalIssues > 0 ? ((m.completedIssues / m.totalIssues) * 100).toFixed(1) : 0;
                        const isSelected = selectedReleaseId === release.id;

                        let badgeText = "Pending";
                        let badgeStyle = { bg: 'rgba(255,255,255,0.1)', text: 'var(--text-secondary)' };

                        if (release.released) {
                            badgeText = "Completed";
                            badgeStyle = { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' };
                        } else if (new Date(release.startDate) <= new Date() && (!release.releaseDate || new Date(release.releaseDate) >= new Date())) {
                            badgeText = "In Progress";
                            badgeStyle = { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' };
                        }

                        return (
                            <div
                                key={release.id}
                                className={`report-card ${isSelected ? 'selected' : ''}`}
                                style={{
                                    padding: '20px',
                                    cursor: 'pointer',
                                    border: isSelected ? '1px solid var(--text-accent)' : '1px solid var(--border)',
                                    transition: 'all 0.2s ease',
                                }}
                                onClick={() => {
                                    setSelectedReleaseId(release.id);
                                    setActiveTab('rolledOver');
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{release.name}</div>
                                        <div style={{
                                            background: badgeStyle.bg, color: badgeStyle.text,
                                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {badgeText}
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)' }}>›</div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                    {formatDate(release.startDate)} — {formatDate(release.releaseDate)}
                                </div>

                                <div style={{ marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Completion</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{completionRate}%</span>
                                </div>
                                <div style={{ width: '100%', background: 'var(--bg-elevated)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
                                    <div style={{ height: '100%', background: 'var(--text-primary)', width: `${completionRate}%` }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Layers size={12} color="var(--text-secondary)" />
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)' }}>Total</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{m.totalIssues}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CheckCircle size={12} color="#10B981" />
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)' }}>Completed</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{m.completedIssues}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <RotateCcw size={12} color="#F59E0B" />
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', lineHeight: 1 }}>Rolled<br />Over</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{m.rolledOverIssues}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <PlusCircle size={12} color="#3B82F6" />
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)' }}>Added</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{m.addedDuringRelease}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {!showAllReleases && releases.length > 3 && (
                        <button
                            className="segment-tab"
                            style={{
                                width: '100%',
                                background: 'rgba(56, 189, 248, 0.1)',
                                color: 'var(--text-accent)',
                                padding: '12px',
                                border: '1px dashed rgba(56, 189, 248, 0.3)',
                                transition: 'all 0.2s ease',
                                marginTop: '8px'
                            }}
                            onClick={() => setShowAllReleases(true)}
                        >
                            Load more
                        </button>
                    )}
                </div>

                {/* Right Column: Drill down or Empty State */}
                <div style={{ flex: 1 }}>
                    {!selectedRelease ? (
                        <div className="glass-panel fade-in" style={{
                            height: '100%', minHeight: '600px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            borderStyle: 'dashed', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.1)'
                        }}>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Select a Release</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Click on a release from the list to view its details and metrics</p>
                        </div>
                    ) : (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Drill header */}
                            <div>
                                <button
                                    className="btn-invisible"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '16px', fontWeight: 600, padding: 0 }}
                                    onClick={() => setSelectedReleaseId(null)}
                                >
                                    <ArrowLeft size={16} /> Back to Releases
                                </button>
                                <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{selectedRelease.name}</h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{selectedRelease.description}</p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatDate(selectedRelease.startDate)} — {formatDate(selectedRelease.releaseDate)}</p>
                            </div>

                            {/* Drill Metrics */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div className="report-card" style={{ flex: 1, padding: '24px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Completion Rate</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {selectedRelease.metrics.totalIssues > 0 ? ((selectedRelease.metrics.completedIssues / selectedRelease.metrics.totalIssues) * 100).toFixed(1) : 0}%
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {selectedRelease.metrics.completedIssues} of {selectedRelease.metrics.totalIssues} issues completed
                                    </div>
                                </div>

                                <div className="report-card" style={{ flex: 1, padding: '24px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Roll-over Rate</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {selectedRelease.metrics.totalIssues > 0 ? ((selectedRelease.metrics.rolledOverIssues / selectedRelease.metrics.totalIssues) * 100).toFixed(1) : 0}%
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {selectedRelease.metrics.rolledOverIssues} issues carried from previous releases
                                    </div>
                                </div>

                                <div className="report-card" style={{ flex: 1, padding: '24px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Scope Change Rate</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {selectedRelease.metrics.totalIssues > 0 ? ((selectedRelease.metrics.addedDuringRelease / selectedRelease.metrics.totalIssues) * 100).toFixed(1) : 0}%
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {selectedRelease.metrics.addedDuringRelease} issues added after release started
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '6px', borderRadius: 'var(--radius-lg)' }}>
                                <button className={`segment-tab ${activeTab === 'rolledOver' ? 'active' : ''}`} onClick={() => setActiveTab('rolledOver')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <RotateCcw size={16} /> Rolled Over <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{selectedRelease.issues.rolledOver.length}</span>
                                </button>
                                <button className={`segment-tab ${activeTab === 'addedDuring' ? 'active' : ''}`} onClick={() => setActiveTab('addedDuring')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <PlusCircle size={16} /> Added During <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{selectedRelease.issues.addedDuring.length}</span>
                                </button>
                                <button className={`segment-tab ${activeTab === 'notCompleted' ? 'active' : ''}`} onClick={() => setActiveTab('notCompleted')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <XCircle size={16} /> Not Completed <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{selectedRelease.issues.notCompleted.length}</span>
                                </button>
                                <button className={`segment-tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <CheckCircle size={16} /> Completed <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{selectedRelease.issues.completed.length}</span>
                                </button>
                            </div>

                            {/* Tab Content Header */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    {activeTab === 'rolledOver' && <><RotateCcw size={20} color="#F59E0B" /> Rolled Over from Previous Releases</>}
                                    {activeTab === 'addedDuring' && <><PlusCircle size={20} color="#3B82F6" /> Added During Release</>}
                                    {activeTab === 'notCompleted' && <><XCircle size={20} color="#EF4444" /> Not Completed in this Release</>}
                                    {activeTab === 'completed' && <><CheckCircle size={20} color="#10B981" /> Completed in this Release</>}
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                                    {activeTab === 'rolledOver' && "Issues that were not completed in their original release and carried forward"}
                                    {activeTab === 'addedDuring' && "Issues that were added to the Fix Version after the release start date"}
                                    {activeTab === 'notCompleted' && "Issues belonging to the release Fix Version that are not Done at the release end date"}
                                    {activeTab === 'completed' && "Issues successfully completed during this release"}
                                </p>

                                {/* Table */}
                                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Key</th>
                                                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Title</th>
                                                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Assignee</th>
                                                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                                                <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Added to Release</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedRelease.issues[activeTab].length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No issues in this category.</td>
                                                </tr>
                                            ) : selectedRelease.issues[activeTab].map((issue) => {
                                                const sStyle = getStatusStyle(issue.status);
                                                return (
                                                    <tr key={issue.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '16px', fontWeight: 600 }}>{issue.key}</td>
                                                        <td style={{ padding: '16px' }}>{issue.title}</td>
                                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{issue.assignee}</td>
                                                        <td style={{ padding: '16px' }}>
                                                            <span style={{
                                                                background: sStyle.bg, color: sStyle.text,
                                                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600
                                                            }}>
                                                                {issue.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{issue.addedToRelease}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ReleaseReport;
