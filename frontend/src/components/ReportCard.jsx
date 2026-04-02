import React from 'react';

const ReportCard = ({ title, value, subtitle, icon: Icon, colorClass = "accent-primary" }) => {
    return (
        <div className="glass-card fade-in">
            <div className="flex justify-between items-start" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        {title}
                    </h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>
                        {value}
                    </div>
                </div>
                {Icon && (
                    <div style={{ 
                        padding: '12px', 
                        borderRadius: '12px', 
                        background: `rgba(var(--${colorClass}-rgb), 0.1)`,
                        color: `var(--${colorClass})` 
                    }}>
                        <Icon size={24} style={{ color: `var(--${colorClass})` }} />
                    </div>
                )}
            </div>
            {subtitle && (
                <div style={{ marginTop: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {subtitle}
                </div>
            )}
        </div>
    );
};

export default ReportCard;
