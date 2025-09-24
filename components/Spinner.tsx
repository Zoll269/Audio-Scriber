import React from 'react';

const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;