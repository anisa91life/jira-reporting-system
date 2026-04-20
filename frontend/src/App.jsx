import React, { useState, useEffect } from 'react';
import { Layers, Activity, ActivitySquare, CheckCircle, Users, AlertTriangle } from 'lucide-react';
import * as api from './api/jiraApi';
import ReportCard from './components/ReportCard';
import { StatusPieChart, AssigneeBarChart, PriorityPieChart } from './components/Charts';
import DataTable from './components/DataTable';
import PMOReport from './components/PMOReport';

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  const [reportType, setReportType] = useState('overall'); // overall, sprint, epic

  // Dynamic lists
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);

  // Specific selections
  const [selectedSprint, setSelectedSprint] = useState('');
  const [selectedEpic, setSelectedEpic] = useState('');

  // Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Load Projects on Mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await api.getProjects();
        setProjects(data);
      } catch (err) {
        setError('Failed to load projects. Is the backend running?');
        console.error(err);
      }
    };
    fetchProjects();
  }, []);

  // 2. Fetch Sprints or Epics based on Project & Report Type selection
  useEffect(() => {
    if (!selectedProject) return;

    const fetchDropdownData = async () => {
      setLoading(true);
      try {
        if (reportType === 'sprint' || reportType === 'pmo') {
          const s = await api.getProjectSprints(selectedProject);
          setSprints(s);
          setSelectedSprint('');
        } else if (reportType === 'epic') {
          const e = await api.getProjectEpics(selectedProject);
          setEpics(e);
          setSelectedEpic('');
        } else {
          // Overall Report
          const d = await api.getOverallReport(selectedProject);
          setReportData(d);
        }
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, [selectedProject, reportType]);

  // 3. Fetch specific Sprint data
  useEffect(() => {
    if ((reportType === 'sprint' || reportType === 'pmo') && selectedProject && selectedSprint) {
      const getSprint = async () => {
        setLoading(true);
        try {
          let data;
          if (reportType === 'pmo') {
            data = await api.getPMOSprintReport(selectedProject, selectedSprint);
          } else {
            data = await api.getSprintReport(selectedProject, selectedSprint);
          }
          setReportData(data);
        } catch (e) {
          setError('Failed to fetch sprint report');
        } finally {
          setLoading(false);
        }
      };
      getSprint();
    }
  }, [selectedSprint, reportType, selectedProject]);

  // 4. Fetch specific Epic data
  useEffect(() => {
    if (reportType === 'epic' && selectedProject && selectedEpic) {
      const getEpic = async () => {
        setLoading(true);
        try {
          const data = await api.getEpicReport(selectedProject, selectedEpic);
          setReportData(data);
        } catch (e) {
          setError('Failed to fetch epic report');
        } finally {
          setLoading(false);
        }
      };
      getEpic();
    }
  }, [selectedEpic, reportType, selectedProject]);


  // Clean up selected data when switching main fields
  const handleProjectChange = (e) => {
    setSelectedProject(e.target.value);
    setReportData(null);
  };
  const handleReportTypeChange = (e) => {
    setReportType(e.target.value);
    setReportData(null);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header-section fade-in">
        <div>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
            Projects Report
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Advanced reporting and analytics dashboard</p>
        </div>
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--text-accent)', padding: '8px 16px', borderRadius: 'var(--radius-xl)', fontSize: '0.85rem', fontWeight: 600 }}>
          {selectedProject ? `ACTIVE PROJ: ${selectedProject}` : "SELECT A PROJECT"}
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="controls-section fade-in" style={{ animationDelay: '0.1s' }}>
        <div>
          <label className="label">Project</label>
          <div className="select-wrapper">
            <select className="select-field" value={selectedProject} onChange={handleProjectChange}>
              <option value="">-- Select Project --</option>
              {projects.map(p => (
                <option key={p.id} value={p.key}>{p.name} ({p.key})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Report Type</label>
          <div className="select-wrapper">
            <select className="select-field" value={reportType} onChange={handleReportTypeChange} disabled={!selectedProject}>
              <option value="overall">Overall Project Report</option>
              <option value="sprint">Sprint Analysis</option>
              <option value="pmo">PMO Sprint Report</option>
              <option value="epic">Epic Breakdown</option>
            </select>
          </div>
        </div>

        {(reportType === 'sprint' || reportType === 'pmo') && (
          <div>
            <label className="label">Select Sprint</label>
            <div className="select-wrapper">
              <select className="select-field" value={selectedSprint} onChange={e => setSelectedSprint(e.target.value)}>
                <option value="">-- Choose Sprint --</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.state})</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {reportType === 'epic' && (
          <div>
            <label className="label">Select Epic</label>
            <div className="select-wrapper">
              <select className="select-field" value={selectedEpic} onChange={e => setSelectedEpic(e.target.value)}>
                <option value="">-- Choose Epic --</option>
                {epics.map(e => (
                  <option key={e.id} value={e.key}>{e.name} ({e.key})</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && !reportData && (
        <div className="grid-cards" style={{ marginTop: '20px' }}>
          <div className="skeleton" style={{ height: '140px' }}></div>
          <div className="skeleton" style={{ height: '140px' }}></div>
          <div className="skeleton" style={{ height: '140px' }}></div>
        </div>
      )}

      {/* Content Rendering */}
      {reportData && !loading && (
        <div className="fade-in" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {reportType === 'pmo' ? (
            <PMOReport data={reportData} projectKey={selectedProject} sprintId={selectedSprint} />
          ) : (
            <>
              {/* Overall Mode Cards */}
              {reportType === 'overall' && (
                <div className="grid-cards">
                  <ReportCard title="Total Issues" value={reportData.totalIssues} icon={Layers} colorClass="text-accent" />
                  <ReportCard
                    title="Main Status"
                    value={Object.entries(reportData.statusDistribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                    icon={Activity} colorClass="accent-success"
                  />
                  <ReportCard
                    title="Highest Priority"
                    value={Object.entries(reportData.priorityDistribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                    icon={ActivitySquare} colorClass="accent-warning"
                  />
                </div>
              )}

              {/* Sprint Mode Cards */}
              {reportType === 'sprint' && (
                <div className="grid-cards">
                  <ReportCard title="Sprint Scope" value={reportData.totalIssues} subtitle="Total issues in sprint" icon={Layers} />
                  <ReportCard
                    title="Completion"
                    value={`${reportData.completionPercentage || 0}%`}
                    subtitle={`${reportData.doneIssues} Done / ${reportData.notDoneIssues} Remaining`}
                    icon={CheckCircle} colorClass="accent-success"
                  />
                  <ReportCard
                    title="Team Load"
                    value={Object.keys(reportData.assigneeDistribution || {}).length}
                    subtitle="Active Assignees"
                    icon={Users} colorClass="text-accent"
                  />
                </div>
              )}

              {/* Epic Mode Cards */}
              {reportType === 'epic' && (
                <div className="grid-cards">
                  <ReportCard title="Epic Scope" value={reportData.totalIssues} subtitle="Total planned tickets" icon={Layers} />
                  <ReportCard
                    title="Progress"
                    value={`${reportData.progressPercentage || 0}%`}
                    subtitle={`${reportData.doneIssues} Done / ${reportData.remainingIssues} Remaining`}
                    icon={CheckCircle} colorClass="accent-success"
                  />
                </div>
              )}

              {/* Charts Row */}
              <div className="grid-charts fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Status Distribution</h3>
                  <StatusPieChart data={reportData.statusDistribution || (reportType === 'sprint' ? { 'Done': reportData.doneIssues, 'In Progress / To Do': reportData.notDoneIssues } : {})} />
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} style={{ color: 'var(--accent-warning)' }} />
                    Priority Breakdown
                  </h3>
                  <PriorityPieChart data={reportData.priorityDistribution || {}} />
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
                    {reportType === 'overall' ? 'Assignees Load' : 'Team Members'}
                  </h3>
                  <AssigneeBarChart data={reportData.assigneeDistribution || {}} />
                </div>
              </div>

              <div className="fade-in" style={{ animationDelay: '0.4s' }}>
                <DataTable issues={reportData.recentIssues} />
              </div>
            </>
          )}

        </div>
      )}

      {/* Empty State */}
      {!loading && !reportData && !error && selectedProject && (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-secondary)' }} className="glass-panel fade-in">
          <ActivitySquare size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Waiting for parameters</h3>
          <p>Select the specific criteria above to generate your dynamic visual report.</p>
        </div>
      )}

    </div>
  );
}

export default App;
