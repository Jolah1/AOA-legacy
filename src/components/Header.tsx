import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../hooks/useTheme";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#facilities", label: "Facilities" },
  { href: "#projects", label: "Projects" },
  { href: "#team", label: "Team" },
  { href: "#contact", label: "Contact" },
];

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
    </svg>
  );
}
function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function Header(_props: { onOpenAdmin?: () => void }) {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstDrawerLinkRef = useRef<HTMLAnchorElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sections = NAV_LINKS.map((l) => document.querySelector(l.href)).filter(
      (el): el is Element => el !== null,
    );
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit?.target.id) setActive(`#${hit.target.id}`);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = drawerRef.current;
    if (el) {
      if (open) el.removeAttribute("inert");
      else el.setAttribute("inert", "");
    }
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => firstDrawerLinkRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(id);
    };
  }, [open]);

  const closeDrawer = () => setOpen(false);

  return (
    <>
      <header className="site-header" role="banner">
        <div className="container header-inner">
          <a href="#top" className="brand" aria-label="AOA Legacy Concepts home">
            <img
              className="brand-lockup"
              src="/aoa-lockup.jpg"
              alt="AOA Legacy Concepts"
              width="800"
              height="800"
              fetchPriority="high"
            />
            <img
              className="brand-mark-img"
              src="/aoa-mark.jpg"
              alt="AOA Legacy Concepts"
              width="320"
              height="320"
              fetchPriority="high"
            />
          </a>

          <nav className="nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                aria-current={active === l.href ? "true" : undefined}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <a href="#contact" className="btn btn--accent header-cta">
              Start a project
            </a>
            <button
              ref={menuButtonRef}
              type="button"
              className="menu-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <MenuIcon open={open} />
            </button>
          </div>
        </div>
      </header>

      {createPortal(
        <>
          <div
            className="mobile-nav-backdrop"
            data-open={open}
            aria-hidden="true"
            onClick={closeDrawer}
          />
          <div
            ref={drawerRef}
            id="mobile-nav"
            className="mobile-nav"
            data-open={open}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            aria-hidden={!open}
          >
            <nav aria-label="Mobile primary">
              {NAV_LINKS.map((l, i) => (
                <a
                  key={l.href}
                  href={l.href}
                  ref={i === 0 ? firstDrawerLinkRef : undefined}
                  onClick={closeDrawer}
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <a
              href="#contact"
              className="btn btn--accent mobile-nav-cta"
              onClick={closeDrawer}
            >
              Start a project
            </a>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
