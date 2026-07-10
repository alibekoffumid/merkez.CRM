import React from 'react';

export const FlagAZ = ({ className = "w-[24px] h-[16px] rounded-[2px] shadow-sm border border-white/10" }) => (
  <span className={`inline-flex items-center shrink-0 overflow-hidden ${className}`}>
    <svg viewBox="0 0 1200 600" className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="600" fill="#509e2f" />
      <rect width="1200" height="400" fill="#ef3340" />
      <rect width="1200" height="200" fill="#00b5e2" />
      
      {/* Crescent */}
      <mask id="crescent-mask">
        <rect width="1200" height="600" fill="#fff" />
        <circle cx="612.5" cy="300" r="72" fill="#000" />
      </mask>
      <circle cx="590" cy="300" r="90" fill="#fff" mask="url(#crescent-mask)" />
      
      {/* 8-pointed Star */}
      <g fill="#fff" transform="translate(685, 300)">
        <rect x="-24" y="-24" width="48" height="48" transform="rotate(0)" />
        <rect x="-24" y="-24" width="48" height="48" transform="rotate(45)" />
      </g>
    </svg>
  </span>
);

export const FlagRU = ({ className = "w-[24px] h-[16px] rounded-[2px] shadow-sm border border-white/10" }) => (
  <span className={`inline-flex items-center shrink-0 overflow-hidden ${className}`}>
    <svg viewBox="0 0 900 600" className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="600" fill="#d52b1e" />
      <rect width="900" height="400" fill="#0039a6" />
      <rect width="900" height="200" fill="#fff" />
    </svg>
  </span>
);

export const FlagGB = ({ className = "w-[24px] h-[16px] rounded-[2px] shadow-sm border border-white/10" }) => (
  <span className={`inline-flex items-center shrink-0 overflow-hidden ${className}`}>
    <svg viewBox="0 0 1200 600" className="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="gb-clip">
        <path d="M0,0 L1200,600 M1200,0 L0,600" />
      </clipPath>
      <rect width="1200" height="600" fill="#012169" />
      <path d="M0,0 L1200,600 M1200,0 L0,600" stroke="#fff" strokeWidth="120" />
      <path d="M0,0 L1200,600 M1200,0 L0,600" stroke="#C8102E" strokeWidth="80" clipPath="url(#gb-clip)" />
      <path d="M600,0 L600,600 M0,300 L1200,300" stroke="#fff" strokeWidth="200" />
      <path d="M600,0 L600,600 M0,300 L1200,300" stroke="#C8102E" strokeWidth="120" />
    </svg>
  </span>
);
