
import React from 'react';

export const TranscriptIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5"
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
    >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h12" />
  </svg>
);
