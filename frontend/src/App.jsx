import React, { useState, useEffect, useRef } from 'react';
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
  const [isSprintDropdownOpen, setIsSprintDropdownOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isReportTypeDropdownOpen, setIsReportTypeDropdownOpen] = useState(false);

  // Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sprintDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);
  const reportTypeDropdownRef = useRef(null);

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
  const handleReportTypeSelect = (type) => {
    setReportType(type);
    setReportData(null);
    setIsReportTypeDropdownOpen(false);
  };
  const handleProjectSelect = (projectKey) => {
    setSelectedProject(projectKey);
    setReportData(null);
    setIsProjectDropdownOpen(false);
  };
  const reportTypeOptions = [
    { value: 'overall', label: 'Overall Project Report' },
    { value: 'sprint', label: 'Sprint Analysis' },
    { value: 'pmo', label: 'PMO Sprint Report' },
    { value: 'epic', label: 'Epic Breakdown' }
  ];
  const selectedReportTypeOption = reportTypeOptions.find(option => option.value === reportType);

  const sortedSprints = [...sprints].sort((a, b) => {
    if (a.state === 'active' && b.state !== 'active') return -1;
    if (a.state !== 'active' && b.state === 'active') return 1;
    return 0;
  });
  const selectedProjectOption = projects.find(p => p.key === selectedProject);
  const activeSprints = sortedSprints.filter(s => s.state === 'active');
  const nonActiveSprints = sortedSprints.filter(s => s.state !== 'active');
  const selectedSprintOption = sortedSprints.find(s => String(s.id) === String(selectedSprint));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sprintDropdownRef.current && !sprintDropdownRef.current.contains(event.target)) {
        setIsSprintDropdownOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setIsProjectDropdownOpen(false);
      }
      if (reportTypeDropdownRef.current && !reportTypeDropdownRef.current.contains(event.target)) {
        setIsReportTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <div className="project-dropdown" ref={projectDropdownRef}>
            <button
              type="button"
              className="sprint-dropdown-trigger"
              onClick={() => setIsProjectDropdownOpen(prev => !prev)}
            >
              <span>{selectedProjectOption ? `${selectedProjectOption.name} (${selectedProjectOption.key})` : '-- Select Project --'}</span>
              <span className={`sprint-dropdown-chevron ${isProjectDropdownOpen ? 'open' : ''}`}>▼</span>
            </button>

            {isProjectDropdownOpen && (
              <div className="sprint-dropdown-panel">
                <div className="sprint-dropdown-heading">Projects</div>
                <div className="sprint-option-list">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`sprint-option ${selectedProject === p.key ? 'selected' : ''}`}
                      onClick={() => handleProjectSelect(p.key)}
                    >
                      <span>{`${p.name} (${p.key})`}</span>
                      {selectedProject === p.key && <span className="sprint-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="label">Report Type</label>
          <div className="reporttype-dropdown" ref={reportTypeDropdownRef}>
            <button
              type="button"
              className="sprint-dropdown-trigger"
              onClick={() => selectedProject && setIsReportTypeDropdownOpen(prev => !prev)}
              disabled={!selectedProject}
              style={{ opacity: selectedProject ? 1 : 0.6, cursor: selectedProject ? 'pointer' : 'not-allowed' }}
            >
              <span>{selectedReportTypeOption?.label || 'Overall Project Report'}</span>
              <span className={`sprint-dropdown-chevron ${isReportTypeDropdownOpen ? 'open' : ''}`}>▼</span>
            </button>

            {isReportTypeDropdownOpen && (
              <div className="sprint-dropdown-panel">
                <div className="sprint-dropdown-heading">Report Type</div>
                <div className="sprint-option-list">
                  {reportTypeOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`sprint-option ${reportType === option.value ? 'selected' : ''}`}
                      onClick={() => handleReportTypeSelect(option.value)}
                    >
                      <span>{option.label}</span>
                      {reportType === option.value && <span className="sprint-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {(reportType === 'sprint' || reportType === 'pmo') && (
          <div>
            <label className="label">Select Sprint</label>
            <div className="sprint-dropdown" ref={sprintDropdownRef}>
              <button
                type="button"
                className="sprint-dropdown-trigger"
                onClick={() => setIsSprintDropdownOpen(prev => !prev)}
              >
                <span>{selectedSprintOption ? selectedSprintOption.name : '-- Choose Sprint --'}</span>
                <span className={`sprint-dropdown-chevron ${isSprintDropdownOpen ? 'open' : ''}`}>▼</span>
              </button>

              {isSprintDropdownOpen && (
                <div className="sprint-dropdown-panel">
                  {activeSprints.length > 0 && (
                    <div className="sprint-dropdown-section">
                      <div className="sprint-dropdown-heading">Active Sprint</div>
                      {activeSprints.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          className={`sprint-option sprint-option-active ${String(selectedSprint) === String(s.id) ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedSprint(s.id);
                            setIsSprintDropdownOpen(false);
                          }}
                        >
                          <span className="sprint-active-mark">⚡</span>
                          <span>{s.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {nonActiveSprints.length > 0 && (
                    <div className="sprint-dropdown-section">
                      <div className="sprint-dropdown-heading">Other Sprints</div>
                      <div className="sprint-option-list">
                        {nonActiveSprints.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className={`sprint-option ${String(selectedSprint) === String(s.id) ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedSprint(s.id);
                              setIsSprintDropdownOpen(false);
                            }}
                          >
                            <span>{s.name}</span>
                            {String(selectedSprint) === String(s.id) && <span className="sprint-check">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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

              <div className={`grid-charts fade-in ${reportType === 'overall' ? 'overview-charts' : ''}`} style={{ animationDelay: '0.3s' }}>
                <div className="chart-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>Status Distribution</h3>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <StatusPieChart data={reportData.statusDistribution || (reportType === 'sprint' ? { 'Done': reportData.doneIssues, 'In Progress / To Do': reportData.notDoneIssues } : {})} />
                  </div>
                </div>

                <div className="chart-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Priority Breakdown
                  </h3>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <PriorityPieChart data={reportData.priorityDistribution || {}} />
                  </div>
                </div>

                {reportType !== 'overall' && (
                  <div className="chart-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>
                      Team Members
                    </h3>
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                      {reportType === 'epic' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {reportData.teamMembers && reportData.teamMembers.length > 0 ? (
                            reportData.teamMembers.map((member, idx) => (
                              <div key={member.accountId || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {member.avatarUrl ? (
                                  <img src={member.avatarUrl} alt={member.displayName} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                ) : (
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                                    {member.displayName.charAt(0)}
                                  </div>
                                )}
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{member.displayName}</div>
                                </div>
                                <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--text-accent)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                                  {member.ticketCount} {member.ticketCount === 1 ? 'ticket' : 'tickets'}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}>No Data Available</div>
                          )}
                        </div>
                      ) : (
                        <AssigneeBarChart data={reportData.assigneeDistribution || {}} />
                      )}
                    </div>
                  </div>
                )}
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
