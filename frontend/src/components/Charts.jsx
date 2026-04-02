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
        <div className="chart-container fade-in">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{paddingTop: '20px'}}/>
                </PieChart>
            </ResponsiveContainer>
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

    // High/Medium/Low matching colors
    const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

    return (
        <div className="chart-container fade-in">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{paddingTop: '20px'}}/>
                </PieChart>
            </ResponsiveContainer>
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
