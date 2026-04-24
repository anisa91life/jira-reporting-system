import React, { useState, useMemo } from 'react';
import { Layers, Activity, CheckCircle, RotateCcw, PlusCircle, ArrowLeft, XCircle, TrendingUp, ClipboardList } from 'lucide-react';
import { getAIReleaseHealth } from '../api/jiraApi';


const ReleaseReport = ({ data, projectKey }) => {
    const [selectedReleaseId, setSelectedReleaseId] = useState(null);
    const [activeTab, setActiveTab] = useState('rolledOver'); // rolledOver, addedDuring, notCompleted, completed
    const [showAllReleases, setShowAllReleases] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);

    // Data passed should be `{ releases: [...] }`
    const releases = useMemo(() => {
        if (!data?.releases) return [];
        return [...data.releases].sort((a, b) => {
            const dateA = new Date(a.releaseDate || a.startDate || '1970-01-01').getTime();
            const dateB = new Date(b.releaseDate || b.startDate || '1970-01-01').getTime();
            return dateB - dateA; // Descending (newest first)
        });
    }, [data?.releases]);

    // Auto-select latest release on mount
    React.useEffect(() => {
        if (releases.length > 0 && !selectedReleaseId) {
            setSelectedReleaseId(releases[0].id);
        }
    }, [releases]);

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

    const handleGenerateAIOverview = async () => {
        if (!selectedRelease) return;
        setAiLoading(true);
        setAiError(null);
        try {
            const result = await getAIReleaseHealth(selectedRelease);
            setAiAnalysis(result.aiAnalysis);
        } catch (err) {
            console.error("Failed to generate AI overview:", err);
            setAiError("Failed to load AI overview. Please check server logs.");
        } finally {
            setAiLoading(false);
        }
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>All Releases</h3>
                    </div>

                    {releases.length === 0 && (
                        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No releases found for this project.
                        </div>
                    )}

                    {(showAllReleases ? releases : releases.slice(0, 3)).map(release => {
                        const m = release.metrics;
                        const completionRate = m.totalIssues > 0 ? ((m.completedIssues / m.totalIssues) * 100).toFixed(1) : 0;
                        const isSelected = selectedReleaseId === release.id;

                        let phase = 'pending';
                        let badgeText = "Pending";
                        let badgeStyle = { bg: 'rgba(255,255,255,0.1)', text: 'var(--text-secondary)' };

                        if (release.released) {
                            badgeText = "Completed";
                            badgeStyle = { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' };
                            phase = 'completed';
                        } else if (new Date(release.startDate) <= new Date() && (!release.releaseDate || new Date(release.releaseDate) >= new Date())) {
                            badgeText = "In Progress";
                            badgeStyle = { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' };
                            phase = 'active';
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
                                    setAiAnalysis(null);
                                    setAiError(null);
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

                    {releases.length > 3 && (
                        <button 
                            className="btn-secondary" 
                            onClick={() => setShowAllReleases(!showAllReleases)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            {showAllReleases ? 'Show Less' : `Show All (${releases.length})`}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <button
                                        className="btn-invisible"
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', marginBottom: '16px', fontWeight: 600, padding: 0 }}
                                        onClick={() => {
                                            setSelectedReleaseId(null);
                                            setAiAnalysis(null);
                                            setAiError(null);
                                        }}
                                    >
                                        <ArrowLeft size={16} /> Back to Releases
                                    </button>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{selectedRelease.name}</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{selectedRelease.description}</p>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatDate(selectedRelease.startDate)} — {formatDate(selectedRelease.releaseDate)}</p>
                                    
                                    {/* Phase Banner */}
                                    {(() => {
                                        const now = new Date();
                                        const start = new Date(selectedRelease.startDate);
                                        const end = selectedRelease.releaseDate ? new Date(selectedRelease.releaseDate) : null;
                                        
                                        if (selectedRelease.released) return null; // No banner needed for completed
                                        if (start > now) return (
                                            <div style={{ marginTop: '12px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.85rem', display: 'inline-block', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                📅 <strong>Future Release:</strong> Viewing planned scope and initial commitments.
                                            </div>
                                        );
                                        return (
                                            <div style={{ marginTop: '12px', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', fontSize: '0.85rem', display: 'inline-block', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3B82F6' }}>
                                                ⚡ <strong>Active Release:</strong> Tracking ongoing execution and remaining work.
                                            </div>
                                        );
                                    })()}
                                </div>
                                <button
                                    onClick={handleGenerateAIOverview}
                                    disabled={aiLoading}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px',
                                        fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer',
                                        opacity: aiLoading ? 0.7 : 1, transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                                    }}
                                >
                                    <Activity size={18} />
                                    {aiLoading ? 'Generating...' : 'Release Health AI Overview'}
                                </button>
                            </div>

                            {/* AI Analysis View */}
                            {aiError && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {aiError}
                                </div>
                            )}

                            {aiAnalysis && (
                                <div className="glass-panel fade-in" style={{ padding: '24px', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                                        <Activity size={20} color="#8b5cf6" /> AI Release Health Overview
                                    </h3>
                                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                        {aiAnalysis}
                                    </div>
                                </div>
                            )}

                            {/* Drill Metrics */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div className="report-card" style={{ flex: 1, padding: '24px', opacity: new Date(selectedRelease.startDate) > new Date() ? 0.6 : 1 }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Completion Rate</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {new Date(selectedRelease.startDate) > new Date() ? 'N/A' : (selectedRelease.metrics.totalIssues > 0 ? ((selectedRelease.metrics.completedIssues / selectedRelease.metrics.totalIssues) * 100).toFixed(1) : 0) + '%'}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {new Date(selectedRelease.startDate) > new Date() ? 'Not started' : `${selectedRelease.metrics.completedIssues} of ${selectedRelease.metrics.totalIssues} issues completed`}
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
                                        {selectedRelease.metrics.rolledOverIssues} issues from earlier versions
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
                                        {selectedRelease.metrics.addedDuringRelease} issues added after start
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '6px', borderRadius: 'var(--radius-lg)' }}>
                                <button className={`segment-tab ${activeTab === 'rolledOver' ? 'active' : ''}`} onClick={() => setActiveTab('rolledOver')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <RotateCcw size={16} color={activeTab === 'rolledOver' ? '#F59E0B' : 'var(--text-secondary)'} /> {new Date(selectedRelease.startDate) > new Date() ? 'Rolled Over' : 'Rolled Over'} <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{selectedRelease.issues.rolledOver.length}</span>
                                </button>
                                <button className={`segment-tab ${activeTab === 'addedDuring' ? 'active' : ''}`} onClick={() => setActiveTab('addedDuring')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <PlusCircle size={16} color={activeTab === 'addedDuring' ? '#3B82F6' : 'var(--text-secondary)'} /> Added <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{selectedRelease.issues.addedDuring.length}</span>
                                </button>
                                <button className={`segment-tab ${activeTab === 'notCompleted' ? 'active' : ''}`} onClick={() => setActiveTab('notCompleted')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    {(() => {
                                        const now = new Date();
                                        const start = new Date(selectedRelease.startDate);
                                        const isRed = selectedRelease.released;
                                        const isBlue = !selectedRelease.released && start <= now;
                                        // Use a more vibrant Sky Blue/Purple for Planned Work if it's the active tab, 
                                        // instead of a neutral gray, to ensure it "pops" like the others.
                                        const color = activeTab === 'notCompleted' 
                                            ? (isRed ? '#EF4444' : (isBlue ? '#3B82F6' : '#0EA5E9'))
                                            : 'var(--text-secondary)';

                                        if (selectedRelease.released) return <XCircle size={16} color={color} />;
                                        return <ClipboardList size={16} color={color} />;
                                    })()}
                                    {(() => {
                                        const now = new Date();
                                        const start = new Date(selectedRelease.startDate);
                                        if (selectedRelease.released) return 'Not Completed';
                                        if (start > now) return 'Planned Work';
                                        return 'Remaining Work';
                                    })()}
                                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{selectedRelease.issues.notCompleted.length}</span>
                                </button>
                                <button className={`segment-tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <CheckCircle size={16} color={activeTab === 'completed' ? '#10B981' : 'var(--text-secondary)'} /> Completed <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{selectedRelease.issues.completed.length}</span>
                                </button>
                            </div>

                            {/* Tab Content Header */}
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    {activeTab === 'rolledOver' && <><RotateCcw size={20} color="#F59E0B" /> Rolled Over from Previous Releases</>}
                                    {activeTab === 'addedDuring' && <><PlusCircle size={20} color="#3B82F6" /> Added during Release Window</>}
                                    {activeTab === 'notCompleted' && (
                                        <>
                                            {(() => {
                                                const now = new Date();
                                                const start = new Date(selectedRelease.startDate);
                                                if (selectedRelease.released) return <XCircle size={20} color="#EF4444" />;
                                                if (start > now) return <ClipboardList size={20} color="#0EA5E9" />;
                                                return <ClipboardList size={20} color="#3B82F6" />;
                                            })()}
                                            {(() => {
                                                const now = new Date();
                                                const start = new Date(selectedRelease.startDate);
                                                if (selectedRelease.released) return 'Not Completed in this Release';
                                                if (start > now) return 'Planned Work Items';
                                                return 'Remaining Work (Ongoing)';
                                            })()}
                                        </>
                                    )}
                                    {activeTab === 'completed' && <><CheckCircle size={20} color="#10B981" /> Completed in this Release</>}
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                                    {activeTab === 'rolledOver' && "Issues carried forward from earlier versions"}
                                    {activeTab === 'addedDuring' && "Scope additions detected during the release period"}
                                    {activeTab === 'notCompleted' && (
                                        (() => {
                                            const now = new Date();
                                            const start = new Date(selectedRelease.startDate);
                                            if (selectedRelease.released) return "Issues belonging to this release that were not completed by the release date";
                                            if (start > now) return "Issues currently scheduled for this future release window";
                                            return "Initial scope and ongoing tasks currently assigned to this active release";
                                        })()
                                    )}
                                    {activeTab === 'completed' && "Issues successfully delivered in this release window"}
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
