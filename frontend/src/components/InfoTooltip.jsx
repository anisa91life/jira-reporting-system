import React, { useState } from 'react';
import { Info } from 'lucide-react';

const InfoTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="tooltip-container"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <Info size={14} className="info-icon" />
      {isVisible && (
        <div className="tooltip-box fade-in">
          {text}
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
