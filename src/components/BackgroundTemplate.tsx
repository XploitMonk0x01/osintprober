import React from 'react';

interface BackgroundTemplateProps {
  variant?: 'default' | 'dashboard';
}

/**
 * The whole environment is painted here: a near-black field, a single cool
 * accent wash bleeding from the top edge, a masked hairline grid, and grain.
 * Nothing animated on the critical path — one slow drift, transform only.
 */
export const BackgroundTemplate: React.FC<BackgroundTemplateProps> = ({
  variant = 'default',
}) => {
  const isDash = variant === 'dashboard';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden bg-ink"
    >
      {/* Base vignette so the corners fall away into ink */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -10%, #101216 0%, #0a0b0d 34%, #07080a 68%)',
        }}
      />

      {/* Single cool accent wash from the top edge */}
      <div
        className="absolute inset-x-0 -top-[240px] h-[620px]"
        style={{
          background: isDash
            ? 'radial-gradient(ellipse 55% 60% at 68% 0%, rgba(143,184,255,0.11) 0%, rgba(143,184,255,0.03) 42%, transparent 72%)'
            : 'radial-gradient(ellipse 52% 62% at 50% 0%, rgba(143,184,255,0.13) 0%, rgba(143,184,255,0.035) 45%, transparent 74%)',
        }}
      />

      {/* Second, far quieter wash — slow drift keeps the field alive */}
      <div
        className="absolute -bottom-48 -right-32 h-[520px] w-[620px] opacity-70 blur-[2px]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(143,184,255,0.06) 0%, transparent 68%)',
          animation: 'drift 34s cubic-bezier(0.45, 0, 0.55, 1) infinite',
          willChange: 'transform',
        }}
      />

      {/* Hairline grid, masked to a soft ellipse */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.042) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.042) 1px, transparent 1px)',
          backgroundSize: '68px 68px',
          maskImage:
            'radial-gradient(ellipse 62% 52% at 50% 12%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 48%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 62% 52% at 50% 12%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.35) 48%, transparent 78%)',
        }}
      />

      {/* Hairline horizon: the only hard edge in the field */}
      <div
        className="absolute inset-x-0 top-[64px] h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.09) 22%, rgba(255,255,255,0.09) 78%, transparent)',
        }}
      />

      {/* Grain */}
      <div className="bg-noise absolute inset-0 opacity-[0.022] mix-blend-soft-light" />
    </div>
  );
};
