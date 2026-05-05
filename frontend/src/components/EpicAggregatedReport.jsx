import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  LayoutGrid,
  ExternalLink
} from 'lucide-react';

const EpicAggregatedReport = ({ data, projectKey }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEpics, setExpandedEpics] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('All Epics');

  if (!data || !data.epicsAggregated) return null;

  const epics = data.epicsAggregated;

  const stats = {
    total: epics.length,
    totalIssues: epics.reduce((acc, e) => acc + e.totalIssues, 0),
    completed: epics.filter(e => e.statusCategory === 'done' || e.completionPercentage === 100).length,
    completedIssues: epics.reduce((acc, e) => acc + e.completedIssues, 0),
    inProgress: epics.filter(e => e.statusCategory === 'indeterminate' || (e.completionPercentage > 0 && e.completionPercentage < 100)).length,
    avgCompletion: epics.length > 0 ? Math.round(epics.reduce((acc, e) => acc + e.completionPercentage, 0) / epics.length) : 0,
    overdue: epics.filter(e => e.isOverdue).length
  };

  const toggleEpic = (key) => {
    const newExpanded = new Set(expandedEpics);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEpics(newExpanded);
  };

  const filteredEpics = epics.filter(epic => {
    const matchesSearch = epic.epicName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          epic.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Epics' || 
                         (statusFilter === 'Completed' && (epic.statusCategory === 'done' || epic.completionPercentage === 100)) ||
                         (statusFilter === 'In Progress' && epic.statusCategory === 'indeterminate') ||
                         (statusFilter === 'Overdue' && epic.isOverdue);
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusStyle = (status, category) => {
    if (category === 'done') return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.2)' };
    if (category === 'indeterminate') return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' };
    if (status.toLowerCase().includes('overdue')) return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' };
    return { bg: 'rgba(107, 114, 128, 0.1)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.2)' };
  };

  return (
    <div className="epic-report-container fade-in">
      
      {/* Stats Cards */}
      <div className="grid-cards">
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-secondary font-medium">Total Epics</span>
            <div className="bg-blue-500/10 text-blue-400" style={{ padding: '8px', borderRadius: '8px' }}>
              <LayoutGrid size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm text-secondary mt-1">{stats.totalIssues} total issues</div>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-secondary font-medium">Completed</span>
            <div className="bg-green-500/10 text-green-400" style={{ padding: '8px', borderRadius: '8px' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-sm text-secondary mt-1">{stats.completedIssues} issues done</div>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-secondary font-medium">In Progress</span>
            <div className="bg-blue-500/10 text-blue-400" style={{ padding: '8px', borderRadius: '8px' }}>
              <Clock size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-400">{stats.inProgress}</div>
            <div className="text-sm text-secondary mt-1">{stats.avgCompletion}% avg. completion</div>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-secondary font-medium">Overdue</span>
            <div className="bg-amber-500/10 text-amber-400" style={{ padding: '8px', borderRadius: '8px' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{stats.overdue}</div>
            <div className="text-sm text-secondary mt-1">Requires attention</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="epic-toolbar">
        <div className="epic-search-wrapper">
          <Search className="text-secondary" size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input 
            type="text" 
            placeholder="Search epics..." 
            className="epic-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="epic-filter-wrapper">
            <select 
              className="epic-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Epics</option>
              <option>Completed</option>
              <option>In Progress</option>
              <option>Overdue</option>
            </select>
            <Filter className="text-secondary" size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
          </div>
          
          <button className="epic-export-btn">
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Epics Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table className="epic-table">
          <thead>
            <tr>
              <th style={{ width: '48px', textAlign: 'center' }}></th>
              <th>Key</th>
              <th>Epic Name</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Issues</th>
              <th>Start Date</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredEpics.map((epic) => {
              const isExpanded = expandedEpics.has(epic.key);
              const statusStyle = getStatusStyle(epic.status, epic.statusCategory);
              const overdue = epic.isOverdue;

              return (
                <React.Fragment key={epic.key}>
                  <tr 
                    className={`epic-row ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleEpic(epic.key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', margin: '0 auto' }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                        {epic.key}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ fontSize: '0.95rem' }}>{epic.epicName}</span>
                        {overdue && <AlertTriangle size={14} className="text-amber-400" />}
                      </div>
                    </td>
                    <td>
                      <span 
                        style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          padding: '4px 10px', 
                          borderRadius: '999px',
                          backgroundColor: overdue ? 'rgba(251, 191, 36, 0.1)' : statusStyle.bg, 
                          color: overdue ? '#fbbf24' : statusStyle.color, 
                          border: `1px solid ${overdue ? 'rgba(251, 191, 36, 0.2)' : statusStyle.border}` 
                        }}
                      >
                        {overdue ? 'Overdue' : epic.status}
                      </span>
                    </td>
                    <td>
                      <div className="progress-bar-container">
                        <div className="progress-bar-track">
                          <div 
                            className="progress-bar-fill"
                            style={{ 
                              width: `${epic.completionPercentage}%`, 
                              backgroundColor: epic.completionPercentage === 100 ? '#22c55e' : (overdue ? '#fbbf24' : '#3b82f6')
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold" style={{ width: '32px' }}>{epic.completionPercentage}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-secondary">
                        {epic.completedIssues}/{epic.totalIssues}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-secondary font-medium">
                        {formatDate(epic.startDate)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className={overdue ? 'text-amber-400' : 'text-secondary'} />
                        <span className={`text-xs font-bold ${overdue ? 'text-amber-400' : 'text-secondary'}`}>
                          {formatDate(epic.dueDate)}
                        </span>
                      </div>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr>
                      <td colSpan="8" style={{ padding: 0 }}>
                        <div className="child-issues-container">
                          <div style={{ display: 'grid', gap: '8px' }}>
                            {epic.children && epic.children.length > 0 ? (
                              epic.children.map(child => (
                                <div key={child.key} className="child-issue-item">
                                  <div className="flex items-center gap-4">
                                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(148, 163, 184, 0.6)', minWidth: '70px' }}>{child.key}</span>
                                    <div className="flex items-center gap-2">
                                       {child.issuetype === 'Story' && <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '2px' }}></div>}
                                       {child.issuetype === 'Task' && <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }}></div>}
                                       {child.issuetype === 'Bug' && <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }}></div>}
                                       <span className="text-xs font-medium">{child.summary}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: 'rgba(148, 163, 184, 0.7)' }}>{child.status}</span>
                                    <ExternalLink size={12} style={{ opacity: 0.3, cursor: 'pointer' }} />
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No child issues found for this epic.</div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filteredEpics.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No epics found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EpicAggregatedReport;
