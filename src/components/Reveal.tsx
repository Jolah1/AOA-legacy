import type { ReactNode } from "react";
import { useInView } from "../hooks/useInView";

/**
 * Wraps content with a scroll-reveal animation that respects
 * `prefers-reduced-motion` (the hook returns inView=true immediately).
 */
export function Reveal({
  children,
  as: As = "div",
  delay = 0,
  className,
}: {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const Tag = As as any;
  return (
    <Tag
      ref={ref}
      className={`reveal${inView ? " in-view" : ""}${className ? " " + className : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
