import React from 'react';

/** The mark: four scanner brackets around a single accent pip. */
export const Mark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
  >
    <path d="M8.5 3H5.5A2.5 2.5 0 0 0 3 5.5v3M15.5 3h3A2.5 2.5 0 0 1 21 5.5v3M8.5 21h-3A2.5 2.5 0 0 1 3 18.5v-3M15.5 21h3a2.5 2.5 0 0 0 2.5-2.5v-3" />
    <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
  </svg>
);
