import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-panel" style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{`${payload[0].name}: ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

const CustomStatusLegend = ({ payload }) => {
    return (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px 16px' }}>
            {payload.map((entry, index) => (
                <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, borderRadius: '50%', marginRight: '8px', flexShrink: 0 }}></span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.value}</span>
                </li>
            ))}
        </ul>
    );
};

const CustomPriorityLegend = ({ payload }) => {
    return (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {payload.map((entry, index) => (
                <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: entry.color, borderRadius: '50%', marginRight: '8px', flexShrink: 0 }}></span>
                    <span>{entry.value}</span>
                </li>
            ))}
        </ul>
    );
};

export const StatusPieChart = ({ data }) => {
    // Convert object to array for Recharts
    const chartData = Object.keys(data).map(key => ({
        name: key,
        value: data[key]
    }));

    if (chartData.length === 0) {
        return <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'}}>No Data Available</div>;
    }

    return (
        <div className="chart-container fade-in" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', height: '280px' }}>
            <div style={{ width: '40%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={105}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div style={{ width: '60%', paddingLeft: '24px' }}>
                <CustomStatusLegend payload={chartData.map((d, i) => ({ value: d.name, color: COLORS[i % COLORS.length] }))} />
            </div>
        </div>
    );
};

export const PriorityPieChart = ({ data }) => {
    const chartData = Object.keys(data).map(key => ({
        name: key,
        value: data[key]
    }));

    if (chartData.length === 0) {
        return <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'}}>No Data Available</div>;
    }

    const getPriorityColor = (priorityName) => {
        const normalized = String(priorityName || '').toLowerCase();
        if (normalized.includes('urgent')) return '#dc2626';
        if (normalized.includes('high')) return '#ef4444';
        if (normalized.includes('medium')) return '#f59e0b';
        if (normalized.includes('low')) return '#3b82f6';
        return '#8b5cf6';
    };

    return (
        <div className="chart-container fade-in" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', height: '280px' }}>
            <div style={{ width: '40%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={105}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getPriorityColor(entry.name)} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div style={{ width: '60%', paddingLeft: '24px' }}>
                <CustomPriorityLegend payload={chartData.map(d => ({ value: d.name, color: getPriorityColor(d.name) }))} />
            </div>
        </div>
    );
};

export const AssigneeBarChart = ({ data }) => {
    const chartData = Object.keys(data).map(key => ({
        name: key,
        Issues: data[key]
    }));

    if (chartData.length === 0) {
        return <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'}}>No Data Available</div>;
    }

    return (
        <div className="chart-container fade-in">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 11, fill: 'var(--text-secondary)'}} interval={0} angle={-40} textAnchor="end" height={70} />
                    <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                    <Bar dataKey="Issues" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
