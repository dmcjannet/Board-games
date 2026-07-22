import confetti from 'canvas-confetti';

// Player-colored palette so wins feel branded to the app.
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// Respect the user's motion preferences — some people find full-page confetti
// disorienting or nauseating, and it's rude to bypass that setting.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function fireWinConfetti(): void {
  if (prefersReducedMotion()) return;

  confetti({
    particleCount: 110,
    spread: 80,
    origin: { y: 0.65 },
    colors: COLORS,
    zIndex: 300,
  });

  // A second, wider burst 250ms later for the "cheer" moment.
  window.setTimeout(() => {
    confetti({
      particleCount: 70,
      spread: 130,
      origin: { y: 0.55 },
      colors: COLORS,
      zIndex: 300,
    });
  }, 250);
}
