import React from 'react';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Clock, Bug, Shield, ArrowRight, CornerDownRight, Calendar, Info } from 'lucide-react';
import { CommitmentChart, BugTrendChart, WorkDistributionChart } from './PMOCharts';
import InfoTooltip from './InfoTooltip';

const PMOReport = ({ data }) => {
  if (!data) return null;

  // Handle case where API returned an error object instead of the report
  if (data.error) {
    return (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>Error: {data.error}</p>
        <p>There was a problem generating the PMO report. Check the server logs for more details.</p>
      </div>
    );
  }

  // Final fallback if data structure is missing
  if (!data.summary || !data.metrics) {
    return (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <p>No report data available for this sprint.</p>
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

      {/* 1. Executive Summary */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Executive Summary</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>{summary.summaryText}</p>
          </div>
          <div className="pmo-health-indicator">
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
                <InfoTooltip text={metric.description} />
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
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle color="var(--accent-danger)" size={20} />
            Risks & Blockers
          </h3>
          {risks.map((risk, idx) => (
            <div key={idx} className="pmo-risk-item">
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>[{risk.level}] {risk.description}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowRight size={14} /> impact: {risk.impact} | Sugested: {risk.action}
              </div>
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
