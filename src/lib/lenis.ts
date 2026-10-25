import Lenis from 'lenis';

let instance: Lenis | null = null;
let frame = 0;

/**
 * Boots the Lenis smooth-scroll loop. Returns a cleanup function.
 * Respects prefers-reduced-motion by doing nothing at all.
 */
export function startSmoothScroll(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  if (instance) return () => {};

  const lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.4,
  });
  instance = lenis;

  const raf = (time: number) => {
    lenis.raf(time);
    frame = requestAnimationFrame(raf);
  };
  frame = requestAnimationFrame(raf);

  return () => {
    cancelAnimationFrame(frame);
    lenis.destroy();
    instance = null;
  };
}

/** Instant jump used by the router so Lenis does not fight the route change. */
export function scrollToTop() {
  if (instance) {
    instance.scrollTo(0, { immediate: true });
    return;
  }
  window.scrollTo(0, 0);
}
