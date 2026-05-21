import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./sections/Hero";
import { About } from "./sections/About";
import { Services } from "./sections/Services";
import { Projects } from "./sections/Projects";
import { Team } from "./sections/Team";
import { Contact } from "./sections/Contact";
import { Footer } from "./sections/Footer";
import { Admin } from "./sections/Admin";
import {
  fetchCompanyInfo,
  fetchProjects,
  type CompanyInfo,
  type Project,
} from "./lib/api";

export default function App() {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState<boolean>(
    () => typeof window !== "undefined" && window.location.hash === "#admin",
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, p] = await Promise.all([fetchCompanyInfo(), fetchProjects()]);
        if (cancelled) return;
        setCompany(c);
        setProjects(p);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load content.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Ctrl+Shift+A (or Cmd+Shift+A on macOS) opens the admin overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setShowAdmin(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sync open/close with the URL hash so the admin route is shareable
  // within the app and survives reloads.
  useEffect(() => {
    if (showAdmin && window.location.hash !== "#admin") {
      history.replaceState(null, "", "#admin");
    } else if (!showAdmin && window.location.hash === "#admin") {
      history.replaceState(null, "", " ");
    }
  }, [showAdmin]);

  useEffect(() => {
    const onHash = () => setShowAdmin(window.location.hash === "#admin");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <Header onOpenAdmin={() => setShowAdmin(true)} />
      <main id="main" role="main">
        <Hero company={company} />
        <About />
        <Services />
        {loadError && (
          <div
            className="container"
            role="alert"
            style={{
              padding: 16,
              margin: "0 auto",
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "var(--bg-soft)",
            }}
          >
            Could not load latest project data: {loadError}
          </div>
        )}
        <Projects projects={projects} />
        <Team />
        <Contact company={company} />
      </main>
      <Footer company={company} onOpenAdmin={() => setShowAdmin(true)} />
      {showAdmin && <Admin onClose={() => setShowAdmin(false)} />}
    </>
  );
}
