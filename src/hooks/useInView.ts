import { useEffect, useRef, useState } from "react";

/**
 * IntersectionObserver hook for one-shot reveal animations.
 * Respects `prefers-reduced-motion` — reduced users get immediate "visible".
 */
export function useInView<T extends Element>(
  options: IntersectionObserverInit = { threshold: 0.15 },
): { ref: React.RefObject<T>; inView: boolean } {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
          break;
        }
      }
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);

  return { ref, inView };
}
