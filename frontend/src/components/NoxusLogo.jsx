import React from 'react';

// Logo Vectorial Personalizado creado 100% en código SVG
const NoxusLogo = ({ className, style }) => (
  <svg 
    viewBox="0 0 48 48" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
    width="1.25em"
    height="1.25em"
    style={{ transform: 'translateY(-2px)', ...style }}
  >
    <defs>
      <linearGradient id="noxus-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="50%" stopColor="#d946ef" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <g filter="url(#logo-glow)">
      {/* La letra N minimalista y fluida */}
      <path 
        d="M 12 36 L 12 12 L 32 36 L 32 12" 
        stroke="url(#noxus-grad)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />
      {/* Chispa de magia (formato mágico) */}
      <path 
        d="M 38 10 L 41 6 L 44 10 L 41 14 Z" 
        fill="url(#noxus-grad)" 
      />
      <path 
        d="M 6 38 L 8 36 L 10 38 L 8 40 Z" 
        fill="url(#noxus-grad)" 
      />
    </g>
  </svg>
);

export default NoxusLogo;
