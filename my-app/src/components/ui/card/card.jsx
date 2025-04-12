import React from 'react';

const Card = ({ className = '', children }) => {
  return (
    <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
};

export default Card;