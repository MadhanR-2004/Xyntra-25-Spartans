import React from 'react';

const CardTitle = ({ className = '', children }) => {
  return (
    <h3 className={`text-lg font-semibold ${className}`}>
      {children}
    </h3>
  );
};

export default CardTitle;