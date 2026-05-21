import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "../lib/api";
import { Reveal } from "../components/Reveal";

function CategoryIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10l-9-7-9 7v11h6v-6h6v6h6V10z" />
    </svg>
  );
}
function LocIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

interface Props {
  projects: Project[];
}

export function Projects({ projects }: Props) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => set.add(p.category));
    return ["All", ...Array.from(set).sort()];
  }, [projects]);

  const [filter, setFilter] = useState<string>("All");
  const [active, setActive] = useState<Project | null>(null);

  const visible = useMemo(
    () => (filter === "All" ? projects : projects.filter((p) => p.category === filter)),
    [filter, projects],
  );

  return (
    <section id="projects" className="section">
      <div className="container">
        <Reveal>
          <span className="eyebrow">Featured work</span>
          <h2 className="section-title">Projects delivered with discipline.</h2>
          <p className="section-lede">
            A selection of healthcare, commercial, residential, industrial, and
            infrastructure projects we've led.
          </p>
        </Reveal>

        <div className="filter-bar" role="group" aria-label="Filter projects by category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className="filter-btn"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="projects-grid">
          {visible.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i * 50, 300)}>
              <button
                type="button"
                className="project-card"
                onClick={() => setActive(p)}
                aria-label={`Open details for ${p.title}`}
              >
                <div className="project-media">
                  <img
                    src={p.image}
                    alt={`${p.title} — ${p.category} project in ${p.location}`}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="chip">{p.category}</span>
                </div>
                <div className="project-body">
                  <h3>{p.title}</h3>
                  <div className="project-meta">
                    <span><LocIcon /> {p.location}</span>
                    <span><CategoryIcon /> {p.size}</span>
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", marginTop: 6 }}>
                    {p.summary}
                  </p>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      {active && (
        <ProjectDialog project={active} onClose={() => setActive(null)} />
      )}
    </section>
  );
}

function ProjectDialog({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    lastFocusRef.current = document.activeElement;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        // Simple focus trap.
        const root = dialogRef.current;
        if (!root) return;
        const focusable = root.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
      (lastFocusRef.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
        className="modal"
        style={{ position: "relative" }}
      >
        <div className="modal-media">
          <img src={project.image} alt={`${project.title} project photo`} />
        </div>
        <button
          ref={closeBtnRef}
          type="button"
          className="modal-close"
          aria-label="Close project details"
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="modal-body">
          <span className="chip chip--accent">{project.category}</span>
          <h2 id="project-dialog-title" style={{ marginTop: 12 }}>
            {project.title}
          </h2>
          <p style={{ color: "var(--text-muted)" }}>{project.summary}</p>

          <div className="modal-meta">
            <div>
              <strong>Location</strong>
              {project.location}
            </div>
            <div>
              <strong>Duration</strong>
              {project.duration}
            </div>
            <div>
              <strong>Size</strong>
              {project.size}
            </div>
            <div>
              <strong>Completion</strong>
              {project.completion}
            </div>
          </div>

          <h3 style={{ fontSize: "var(--fs-md)", marginBottom: 8 }}>Highlights</h3>
          <ul style={{ paddingLeft: "1.1rem", color: "var(--text-muted)" }}>
            {project.highlights.map((h) => (
              <li key={h} style={{ marginBottom: 6 }}>
                {h}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
