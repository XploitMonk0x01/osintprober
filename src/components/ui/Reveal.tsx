import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '../../lib/motion.js';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Play on mount instead of waiting for the viewport. */
  immediate?: boolean;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  y = 14,
  immediate = false,
}) => {
  const reduce = useReducedMotion() ?? false;

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={immediate ? { opacity: 1, y: 0 } : undefined}
      whileInView={immediate ? undefined : { opacity: 1, y: 0 }}
      viewport={immediate ? undefined : { once: true, margin: '-8% 0px -8% 0px' }}
      transition={{ duration: 0.65, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};
