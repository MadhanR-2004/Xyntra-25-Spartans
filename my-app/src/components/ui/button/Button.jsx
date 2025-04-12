import React from 'react';

const Button = ({ variant = 'default', className = '', children, ...props }) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50'
  };

  return (
    <button
      className={`px-4 py-2 rounded-md font-medium text-sm ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;