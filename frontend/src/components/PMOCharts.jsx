import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const CommitmentChart = ({ data }) => (
    <div style={{ height: 300, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="points" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={60} />
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export const BugTrendChart = ({ data }) => (
    <div style={{ height: 300, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }} />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#ef4444" strokeWidth={2} name="Bugs Created" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Bugs Resolved" />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

export const WorkDistributionChart = ({ data }) => (
    <div style={{ height: 250, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
        </ResponsiveContainer>
    </div>
);
