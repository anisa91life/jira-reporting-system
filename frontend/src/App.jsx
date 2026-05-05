import React, { useState, useEffect, useRef } from 'react';
import { Layers, Activity, ActivitySquare, CheckCircle, Users, AlertTriangle, Sun, Moon } from 'lucide-react';
import * as api from './api/jiraApi';
import ReportCard from './components/ReportCard';
import { StatusPieChart, PriorityPieChart } from './components/Charts';
import DataTable from './components/DataTable';
import PMOReport from './components/PMOReport';
import ReleaseReport from './components/ReleaseReport';
import EpicAggregatedReport from './components/EpicAggregatedReport';

const getInitialState = (key, defaultVal) => {
  const params = new URLSearchParams(window.location.search);
  if (params.has(key)) return params.get(key);
  const saved = localStorage.getItem(`dashboard_${key}`);
  return saved || defaultVal;
};

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(() => getInitialState('project', ''));

  const [reportType, setReportType] = useState(() => getInitialState('reportType', 'overall')); // overall, sprint, epic

  // Dynamic lists
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);

  // Specific selections
  const [selectedSprint, setSelectedSprint] = useState(() => getInitialState('sprintId', ''));
  const [selectedEpic, setSelectedEpic] = useState(() => getInitialState('epicId', ''));
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isSprintDropdownOpen, setIsSprintDropdownOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isReportTypeDropdownOpen, setIsReportTypeDropdownOpen] = useState(false);

  // Sync theme to document and localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sprintDropdownRef = useRef(null);
  const projectDropdownRef = useRef(null);
  const reportTypeDropdownRef = useRef(null);

  // Sync state to URL and localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const updates = {
      project: selectedProject,
      reportType: reportType,
      sprintId: selectedSprint,
      epicId: selectedEpic
    };

    let urlChanged = false;
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        if (params.get(key) !== value) {
          params.set(key, value);
          urlChanged = true;
        }
        localStorage.setItem(`dashboard_${key}`, value);
      } else {
        if (params.has(key)) {
          params.delete(key);
          urlChanged = true;
        }
        localStorage.removeItem(`dashboard_${key}`);
      }
    });

    if (urlChanged) {
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [selectedProject, reportType, selectedSprint, selectedEpic]);

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
        if (reportType === 'pmo') {
          const s = await api.getProjectSprints(selectedProject);
          setSprints(s);
          setSelectedSprint(prev => {
            if (prev && s.some(sprint => String(sprint.id) === String(prev))) return prev;
            return '';
          });
        } else if (reportType === 'epic') {
          const e = await api.getProjectEpics(selectedProject);
          setEpics(e);
          setSelectedEpic(prev => {
            if (prev && e.some(epic => String(epic.key) === String(prev))) return prev;
            return '';
          });
        } else if (reportType === 'releases') {
          const d = await api.getReleasesReport(selectedProject);
          setReportData(d);
        } else {
          // Overall Report
          const [overall, epicsAgg] = await Promise.all([
            api.getOverallReport(selectedProject),
            api.getEpicsAggregatedReport(selectedProject)
          ]);
          setReportData({ ...overall, epicsAggregated: epicsAgg });
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
    if (reportType === 'pmo' && selectedProject && selectedSprint) {
      const getSprint = async () => {
        setLoading(true);
        try {
          const data = await api.getPMOSprintReport(selectedProject, selectedSprint);
          setReportData(data);
        } catch (e) {
          setError('Failed to fetch PMO sprint report');
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
    { value: 'pmo', label: 'PMO Sprint Report' },
    { value: 'epic', label: 'Epic Breakdown' },
    { value: 'releases', label: 'Releases' }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={toggleTheme}
            className="theme-toggle"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--text-accent)', padding: '8px 16px', borderRadius: 'var(--radius-xl)', fontSize: '0.85rem', fontWeight: 600 }}>
            {selectedProject ? `ACTIVE PROJ: ${selectedProject}` : "SELECT A PROJECT"}
          </div>
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

        {reportType === 'pmo' && (
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
            <PMOReport data={reportData} projectKey={selectedProject} sprintId={selectedSprint} projectName={selectedProjectOption?.name} />
          ) : reportType === 'releases' ? (
            <ReleaseReport data={reportData} projectKey={selectedProject} />
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

              <div className={`grid-charts fade-in ${reportType === 'overall' || reportType === 'epic' ? 'overview-charts' : ''}`} style={{ animationDelay: '0.3s' }}>
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
              </div>

              {reportType === 'overall' && (
                <EpicAggregatedReport data={reportData} projectKey={selectedProject} />
              )}

              {reportType === 'epic' && (
                <div className="chart-panel fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', animationDelay: '0.35s' }}>
                  <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 600 }}>
                    Team Members
                  </h3>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <div className="team-grid">
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
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.ticketCount} {member.ticketCount === 1 ? 'ticket' : 'tickets'}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0', gridColumn: 'span 4' }}>No Data Available</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
