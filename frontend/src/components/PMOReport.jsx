import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Clock, Bug, Shield, ArrowRight, CornerDownRight, Calendar, Info, Cpu, Loader, Layers, Activity, ActivitySquare, Users, ChevronDown, ChevronUp, Plus, Trash2, Edit2 } from 'lucide-react';
import { CommitmentChart, BugTrendChart, WorkDistributionChart } from './PMOCharts';
import { StatusPieChart, PriorityPieChart } from './Charts';
import ReportCard from './ReportCard';
import InfoTooltip from './InfoTooltip';
import { getAISprintHealth, getManualRisks, createManualRisk, updateManualRisk, deleteManualRisk } from '../api/jiraApi';

const PMOReport = ({ data, projectKey, sprintId, projectName }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [expandedTeams, setExpandedTeams] = useState({});
  const [manualRisks, setManualRisks] = useState([]);
  const [isAddingRisk, setIsAddingRisk] = useState(false);
  const [newRisk, setNewRisk] = useState({ title: '', description: '', severity: 'Medium' });
  const [editingRiskId, setEditingRiskId] = useState(null);
  const [editRisk, setEditRisk] = useState({ title: '', description: '', severity: 'Medium' });

  useEffect(() => {
    if (projectKey && sprintId && data && data.status !== 'NOT_STARTED') {
      loadManualRisks();
    }
  }, [projectKey, sprintId, data]);

  const loadManualRisks = async () => {
    try {
      const risks = await getManualRisks(projectKey, sprintId);
      setManualRisks(risks);
    } catch (err) {
      console.error('Failed to load manual risks', err);
    }
  };

  const handleAddRisk = async () => {
    if (!newRisk.title.trim()) return;
    try {
      const addedRisk = await createManualRisk({
        projectKey,
        sprintId,
        title: newRisk.title,
        description: newRisk.description,
        severity: newRisk.severity
      });
      setManualRisks([addedRisk, ...manualRisks]);
      setNewRisk({ title: '', description: '', severity: 'Medium' });
      setIsAddingRisk(false);
    } catch (err) {
      console.error('Failed to add manual risk', err);
    }
  };

  const handleUpdateRisk = async () => {
    if (!editRisk.title.trim()) return;
    try {
      const updatedRisk = await updateManualRisk(editingRiskId, {
        title: editRisk.title,
        description: editRisk.description,
        severity: editRisk.severity
      });
      setManualRisks(manualRisks.map(r => r.id === editingRiskId ? updatedRisk : r));
      setEditingRiskId(null);
    } catch (err) {
      console.error('Failed to update manual risk', err);
    }
  };

  const startEditRisk = (risk) => {
    setEditingRiskId(risk.id);
    setEditRisk({ title: risk.title, description: risk.description || '', severity: risk.severity });
  };

  const handleDeleteRisk = async (id) => {
    try {
      await deleteManualRisk(id);
      setManualRisks(manualRisks.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete manual risk', err);
    }
  };

  const toggleTeam = (teamName) => {
    setExpandedTeams(prev => ({ ...prev, [teamName]: !prev[teamName] }));
  };

  const TECH_LEADS = {
    "Healthcare Platform & Data Foundation Team": "Gentrit Hoxha",
    "Operational Efficiency & Automation Team": "Fitim Halimi",
    "Patient Care & Clinical Workflows Team": "Vera Jerliu"
  };

  const generateAIInsights = async () => {
    setIsAnalyzing(true);
    setAiError('');
    try {
      const response = await getAISprintHealth(projectKey, sprintId);
      setAiAnalysis(response.aiAnalysis);
    } catch (err) {
      setAiError('Failed to generate AI insights. Make sure the backend is fully configured.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!data) return null;

  // Handle API error
  if (data.error) {
    return (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>Error: {data.error}</p>
        <p>There was a problem generating the PMO report. Check the server logs for more details.</p>
      </div>
    );
  }

  // Handle FUTURE sprint — metrics are null, show a clean state
  if (data.status === 'NOT_STARTED' || !data.metrics) {
    return (
      <div className="glass-panel fade-in" style={{ padding: '40px', textAlign: 'center', borderLeft: '4px solid #8b5cf6' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{data.sprintInfo?.name || 'Future Sprint'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
          {data.message || 'Sprint has not started yet. No metrics available.'}
        </p>
        {data.sprintInfo?.startDate && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Scheduled start: <strong>{new Date(data.sprintInfo.startDate).toLocaleDateString()}</strong>
          </p>
        )}
      </div>
    );
  }


  const { summary, metrics, risks, decisions, charts, sprintInfo } = data;

  const getTrendClass = (trend) => {
    if (trend === '↑') return 'pmo-trend-up';
    if (trend === '↓') return 'pmo-trend-down';
    return 'pmo-trend-neutral';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="pmo-section-container fade-in">

      {/* 0. Sprint Timing Bar */}
      {sprintInfo && (
        <div className="glass-panel sprint-timing-bar fade-in">
          <div className="timing-left">
            <Calendar size={18} className="text-accent" />
            <span className="timing-dates">
              Sprint Duration: <strong>{formatDate(sprintInfo.startDate)} → {formatDate(sprintInfo.endDate)}</strong>
              <span style={{ opacity: 0.6, marginLeft: '8px' }}>({sprintInfo.totalDays} days)</span>
            </span>
          </div>
          <div className="timing-right">
            {sprintInfo.state === 'active' ? (
              <>
                <span className="timing-day">Day {sprintInfo.currentDay || '?'} of {sprintInfo.totalDays}</span>
                <span className="badge badge-active">In Progress</span>
              </>
            ) : (
              <span className="badge badge-completed">Completed</span>
            )}
          </div>
        </div>
      )}
      {/* AI Analysis Section */}
      <div className="glass-panel pmo-ai-section fade-in" style={{ padding: '12px', background: 'linear-gradient(to right, rgba(168, 85, 247, 0.05), rgba(79, 70, 229, 0.05))', borderLeft: '4px solid #8b5cf6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiAnalysis ? '20px' : '0' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Cpu size={24} style={{ color: '#8b5cf6' }} />
            AI Sprint Analysis
          </h2>
          {!aiAnalysis && !isAnalyzing && (
            <button onClick={generateAIInsights} className="primary-btn pulse-glow" style={{ background: 'linear-gradient(to right, #8b5cf6, #3b82f6)', border: 'none', padding: '10px 20px', borderRadius: '8px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} /> Generate Insights
            </button>
          )}
          {isAnalyzing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              Analyzing sprint data...
            </div>
          )}
        </div>

        {aiError && (
          <div style={{ color: 'var(--accent-danger)', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginTop: '16px' }}>
            {aiError}
          </div>
        )}

        {aiAnalysis && (() => {
          const assessment = aiAnalysis.overallAssessment || '';
          const healthColor = assessment.startsWith('red') ? 'var(--accent-danger)'
            : assessment.startsWith('yellow') ? 'var(--accent-warning)'
              : 'var(--accent-success)';
          return (
            <div className="ai-results fade-in-up" style={{ marginTop: '16px' }}>

              {/* Overall Assessment */}
              <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `3px solid ${healthColor}` }}>
                <strong style={{ fontSize: '1.05rem', color: healthColor }}>{assessment}</strong>
              </div>

              {/* What Stands Out */}
              {aiAnalysis.whatStandsOut && (
                <div style={{ marginBottom: '20px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>What Stands Out</h4>
                  <p style={{ lineHeight: '1.6', margin: 0 }}>{aiAnalysis.whatStandsOut}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Main Risks</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0 }}>
                    {(aiAnalysis.mainRisks || []).map((risk, i) => (
                      <li key={i} style={{ lineHeight: '1.5' }}>{risk}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Likely Causes</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0 }}>
                    {(aiAnalysis.likelyCauses || []).map((cause, i) => (
                      <li key={i} style={{ lineHeight: '1.5', color: 'var(--text-secondary)' }}>{cause}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {(aiAnalysis.suggestedActions || []).length > 0 && (
                <div style={{ marginBottom: '20px', padding: '14px', background: 'rgba(139, 92, 246, 0.06)', borderRadius: '8px' }}>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Suggested Actions</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', margin: 0 }}>
                    {aiAnalysis.suggestedActions.map((action, i) => (
                      <li key={i} style={{ lineHeight: '1.5' }}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.confidence && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'right' }}>
                  AI Confidence: {aiAnalysis.confidence}
                </div>
              )}

            </div>
          );
        })()}
      </div>

      {/* 1. Executive Summary */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Executive Summary</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>{summary.summaryText}</p>
          </div>
          <div className="pmo-health-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pmo-health-circle">{summary.health}</span>
              <span className="pmo-health-text" style={{
                color: summary.health === '🔴' ? 'var(--accent-danger)' :
                  summary.health === '🟡' ? 'var(--accent-warning)' :
                    summary.health === '🔵' ? 'var(--text-accent)' :
                      'var(--accent-success)'
              }}>
                {summary.healthText}
              </span>
            </div>
            {summary.tooltip && <InfoTooltip text={summary.tooltip} />}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px' }}>Main Risk</h4>
            <p style={{ fontWeight: 500 }}>{summary.mainRisk}</p>
          </div>
          <div className="glass-card" style={{ padding: '16px' }}>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px' }}>Focus Next Sprint</h4>
            <p style={{ fontWeight: 500 }}>{summary.focusNext}</p>
          </div>
        </div>
      </div>

      {/* At A Glance (Legacy Sprint Breakdown) */}
      {data.totalIssues !== undefined && (
        <div className="grid-cards" style={{ marginBottom: '24px' }}>
          <ReportCard title="Sprint Scope" value={data.totalIssues} subtitle="Total issues in sprint" icon={Layers} />
          <ReportCard
            title="Completion"
            value={`${data.completionPercentage || 0}%`}
            subtitle={`${data.doneIssuesCount || 0} Done / ${data.notDoneIssuesCount || 0} Remaining`}
            icon={CheckCircle} colorClass="accent-success"
          />
          <ReportCard
            title="Team Load"
            value={Object.keys(data.assigneeDistribution || {}).length}
            subtitle="Active Assignees"
            icon={Users} colorClass="text-accent"
          />
        </div>
      )}



      {/* 2. Delivery Metrics (KPI) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-accent)' }}>Delivery Metrics</h3>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>* Hover on (i) for definitions</span>
      </div>
      <div className="pmo-grid-metrics">
        {metrics.map((metric, idx) => (
          <div key={idx} className="pmo-metric-card">
            <div className="pmo-metric-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{metric.name}</span>
                <InfoTooltip
                  text={metric.description}
                  details={metric.details}
                  type={metric.name === 'Unplanned Work' ? 'popover' : 'tooltip'}
                />
              </div>
              <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                {metric.confidence}
              </span>
            </div>
            <div className="pmo-metric-value">
              {metric.value}
              <span className={`pmo-trend-indicator ${getTrendClass(metric.trend)}`}>{metric.trend}</span>
            </div>
            <div className="pmo-insight-box">
              <ActivityIcon name={metric.name} />
              {metric.insight}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Risks & Decisions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <AlertCircle color="var(--accent-danger)" size={20} />
              Risks & Blockers
            </h3>
            <button 
              onClick={() => setIsAddingRisk(!isAddingRisk)}
              style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
            >
              <Plus size={14} /> Add Risk
            </button>
          </div>

          {/* Form to add risk */}
          {isAddingRisk && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <input 
                 value={newRisk.title}
                 onChange={e => setNewRisk({...newRisk, title: e.target.value})}
                 placeholder="Risk title..."
                 style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)' }}
              />
              <input 
                 value={newRisk.description}
                 onChange={e => setNewRisk({...newRisk, description: e.target.value})}
                 placeholder="Risk description (optional)..."
                 style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <select 
                    value={newRisk.severity}
                    onChange={e => setNewRisk({...newRisk, severity: e.target.value})}
                    style={{ padding: '6px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)' }}
                 >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                 </select>
                 <div style={{ display: 'flex', gap: '8px' }}>
                   <button onClick={() => setIsAddingRisk(false)} style={{ padding: '6px 12px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                   <button onClick={handleAddRisk} style={{ padding: '6px 12px', background: 'var(--accent-primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                 </div>
              </div>
            </div>
          )}

          {/* System Risks */}
          {risks.map((risk, idx) => (
            <div key={`sys-${idx}`} className="pmo-risk-item" style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px', color: '#fff' }}>
                <span style={{ color: risk.level === 'High' ? 'var(--accent-danger)' : risk.level === 'Medium' ? 'var(--accent-warning)' : '#3B82F6' }}>
                  [{risk.level}]
                </span>{' '}
                {risk.description}{' '}
                <span style={{ color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.75rem', fontWeight: 'normal' }}>(Auto)</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowRight size={14} /> impact: {risk.impact} | Sugested: {risk.action}
              </div>
            </div>
          ))}

          {/* Manual Risks */}
          {manualRisks.map(risk => (
             <div key={`man-${risk.id}`} className="pmo-risk-item" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               {editingRiskId === risk.id ? (
                 <div style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                   <input 
                     value={editRisk.title}
                     onChange={e => setEditRisk({...editRisk, title: e.target.value})}
                     placeholder="Risk title..."
                     style={{ width: '100%', padding: '6px', marginBottom: '6px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                   />
                   <input 
                     value={editRisk.description}
                     onChange={e => setEditRisk({...editRisk, description: e.target.value})}
                     placeholder="Risk description (optional)..."
                     style={{ width: '100%', padding: '6px', marginBottom: '6px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                   />
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <select 
                        value={editRisk.severity}
                        onChange={e => setEditRisk({...editRisk, severity: e.target.value})}
                        style={{ padding: '4px 6px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                     >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                     </select>
                     <div style={{ display: 'flex', gap: '6px' }}>
                       <button onClick={() => setEditingRiskId(null)} style={{ padding: '4px 10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                       <button onClick={handleUpdateRisk} style={{ padding: '4px 10px', background: 'var(--accent-primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Update</button>
                     </div>
                   </div>
                 </div>
               ) : (
                 <>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px', color: '#fff' }}>
                        <span style={{ color: risk.severity === 'High' ? 'var(--accent-danger)' : risk.severity === 'Medium' ? 'var(--accent-warning)' : '#3B82F6' }}>
                          [{risk.severity}]
                        </span>{' '}
                        {risk.title}{' '}
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.75rem', fontWeight: 'normal' }}>(Manual)</span>
                      </div>
                      {risk.description && (
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <ArrowRight size={14} style={{ marginTop: '2px', color: 'var(--text-secondary)' }} /> {risk.description}
                        </div>
                      )}
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: risk.description ? '8px' : '4px' }}>
                        Created: {new Date(risk.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                   </div>
                   <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                     <button onClick={() => startEditRisk(risk)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                       <Edit2 size={15} />
                     </button>
                     <button onClick={() => handleDeleteRisk(risk.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </>
               )}
             </div>
          ))}
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle color="var(--accent-primary)" size={20} />
            Decisions Needed
          </h3>
          {decisions.length > 0 ? decisions.map((decision, idx) => (
            <div key={idx} className="pmo-decision-item">
              <CornerDownRight size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.9rem' }}>{decision}</span>
            </div>
          )) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
              No critical decisions required at this stage.
            </div>
          )}
        </div>
      </div>

      {/* 4. PMO Charts */}
      <div className="grid-charts">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '1rem' }}>Committed vs. Delivered</h3>
          <CommitmentChart data={charts.commitment} />
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '1rem' }}>Work Distribution (Planned vs Unplanned)</h3>
          <WorkDistributionChart data={charts.workDistribution} />
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '1rem' }}>Bugs Creation vs Resolution</h3>
          <BugTrendChart data={[
            { name: 'Start', created: 0, resolved: 0 },
            { name: 'Mid', created: Math.ceil(metrics[4].value.split('/')[0] / 2), resolved: Math.ceil(metrics[4].value.split('/')[1] / 2) },
            { name: 'End', created: parseInt(metrics[4].value.split('/')[0]), resolved: parseInt(metrics[4].value.split('/')[1]) }
          ]} />
        </div>
      </div>

      {/* 5. Classic Breakdown Charts */}
      {data.statusDistribution && (
        <div className="grid-charts fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="chart-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>Status Distribution</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <StatusPieChart data={data.statusDistribution} />
            </div>
          </div>

          <div className="chart-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>Priority Breakdown</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <PriorityPieChart data={data.priorityDistribution || {}} />
            </div>
          </div>
        </div>
      )}

      {/* 6. Team Analytics */}
      {data.teamAnalytics && projectName === 'Heart+ App Rewrite' && (
        <div className="glass-panel fade-in" style={{ padding: '32px', marginTop: '32px', animationDelay: '0.4s' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600 }}>Team Performance</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {Object.entries(data.teamAnalytics).map(([teamName, stats]) => {
              const percent = stats.totalSP > 0 ? Math.round((stats.completedSP / stats.totalSP) * 100) : 0;
              const isExpanded = expandedTeams[teamName];
              const techLead = TECH_LEADS[teamName] || '';

              // Sort engineers: Tech lead first, then others by completedSP descending
              const sortedEngineers = [...(stats.engineers || [])].sort((a, b) => {
                if (a.name === techLead) return -1;
                if (b.name === techLead) return 1;
                return b.completedSP - a.completedSP;
              });

              const memberCount = stats.engineers ? stats.engineers.length : 0;

              // Determine team colors matching the provided reference image
              const isHealthcare = teamName.includes('Healthcare');
              const isOperational = teamName.includes('Operational');
              const colorCode = isHealthcare ? '#0ea5e9' : isOperational ? '#10b981' : '#f59e0b';
              const bgCode = isHealthcare ? 'rgba(14, 165, 233, 0.1)' : isOperational ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';

              return (
                <div key={teamName} style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Top Color Bar */}
                  <div style={{
                    height: '4px',
                    width: '100%',
                    background: colorCode
                  }} />

                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Header: Icon + Name */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: bgCode,
                        color: colorCode,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Users size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.2', marginBottom: '4px' }}>
                          {teamName.replace(' Team', '')}
                        </h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{memberCount} members</span>
                      </div>
                    </div>

                    {/* Stats: Total vs Completed SP */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <span style={{ opacity: 0.5 }}>◎</span> Total SP
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalSP}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <CheckCircle size={12} style={{ opacity: 0.5 }} /> Completed SP
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.completedSP}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div
                          onClick={() => toggleTeam(teamName)}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                        >
                          Progress
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        </div>
                        <span style={{
                          fontWeight: 'bold', fontSize: '1.2rem',
                          color: percent >= 80 ? 'var(--accent-success)' : percent >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)'
                        }}>{percent}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${percent}%`,
                          background: percent >= 80 ? 'var(--accent-success)' : percent >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                          borderRadius: '4px', transition: 'width 0.5s ease-out'
                        }}></div>
                      </div>
                    </div>

                    {/* Drill-Down View */}
                    {isExpanded && (
                      <div className="fade-in-up" style={{ marginTop: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 500 }}>
                          Story Points by Engineer
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {sortedEngineers.map((eng, idx) => {
                            const isLead = eng.name === techLead;
                            const engPercent = eng.totalSP > 0 ? Math.round((eng.completedSP / eng.totalSP) * 100) : 0;
                            const displayName = eng.name;

                            return (
                              <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: isLead ? 600 : 500, color: 'var(--text-primary)' }}>
                                  <span>{displayName}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                  {isLead ? (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>Tech Lead</span>
                                  ) : (
                                    <>
                                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{eng.completedSP}/{eng.totalSP} SP</span>
                                      <span style={{
                                        fontWeight: 'bold', fontSize: '0.85rem', width: '36px', textAlign: 'right',
                                        color: engPercent >= 80 ? 'var(--accent-success)' : engPercent >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)'
                                      }}>{engPercent}%</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>


        </div>
      )}

      {/* 7. Team Members */}
      {data.teamMembers && (
        <div className="glass-panel fade-in" style={{ padding: '32px', marginTop: '32px', animationDelay: '0.5s' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600 }}>Team Members</h3>
          {data.teamMembers.length > 0 ? (
            <div className="team-grid">
              {data.teamMembers.map((member, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.displayName} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#60a5fa' }}>
                        {member.displayName.charAt(0)}
                      </div>
                    )}
                    <span style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{member.displayName}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-accent)' }}>
                    {member.storyPoints} SP
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No Data Available
            </div>
          )}
        </div>
      )}

    </div>
  );
};

const ActivityIcon = ({ name }) => {
  if (name.includes('Reliability')) return <TrendingUp size={12} />;
  if (name.includes('Scope')) return <Shield size={12} />;
  if (name.includes('Unplanned')) return <AlertCircle size={12} />;
  if (name.includes('Cycle')) return <Clock size={12} />;
  if (name.includes('Bugs')) return <Bug size={12} />;
  return <TrendingUp size={12} />;
};

export default PMOReport;
