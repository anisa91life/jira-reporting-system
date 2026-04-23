import React, { useState } from 'react';
import { Info } from 'lucide-react';

const InfoTooltip = ({ text, details, type = 'tooltip' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      // Small delay for popover types to allow moving mouse into the content
      if (type === 'popover') {
        setTimeout(() => setIsVisible(false), 300);
      } else {
        setIsVisible(false);
      }
    }
  };

  const togglePin = (e) => {
    if (type === 'popover') {
      e.stopPropagation();
      setIsPinned(!isPinned);
    }
  };

  const isShow = isPinned || isVisible;

  return (
    <div 
      className="tooltip-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={togglePin}
      style={{ cursor: type === 'popover' ? 'pointer' : 'help' }}
    >
      <Info size={14} className="info-icon" style={{ color: isPinned ? 'var(--text-accent)' : 'inherit' }} />
      {isShow && (
        <div 
          className="tooltip-box fade-in" 
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          onMouseEnter={() => type === 'popover' && setIsVisible(true)}
          onMouseLeave={() => type === 'popover' && !isPinned && setIsVisible(false)}
          style={{ 
            minWidth: details ? '320px' : '200px',
            maxHeight: details ? '300px' : 'auto',
            overflowY: details ? 'auto' : 'hidden',
            pointerEvents: 'auto', // Ensure mouse events work inside the box
            zIndex: 100,
            cursor: 'default'
          }}
        >
          <div style={{ marginBottom: details ? '12px' : '0', fontWeight: details ? '600' : 'normal', fontSize: '0.85rem' }}>
            {text}
          </div>
          {details && details.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                <span>Issues Included ({details.length})</span>
                {type === 'popover' && <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>Click icon to {isPinned ? 'unpin' : 'pin'}</span>}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {details.map((issue, idx) => (
                  <li key={idx} style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-accent)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{issue.key}</span>
                      <span style={{ opacity: 0.6, fontStyle: 'italic', fontSize: '0.7rem' }}>{issue.points} SP</span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', opacity: 0.9 }}>{issue.summary}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
