import type { CompanyInfo } from "../lib/api";

export function Hero({ company }: { company: CompanyInfo | null }) {
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">Construction &amp; Project Management</span>
          <h1 id="hero-title">
            Building <span className="accent">lasting value</span>
            <br />
            from foundation to finish.
          </h1>
          <p className="hero-lede">
            {company?.tagline ??
              "We deliver commercial, residential and infrastructure projects on time, within budget, and to the highest quality and safety standards."}
          </p>

          <div className="hero-ctas">
            <a className="btn btn--accent" href="#projects">
              View our projects
            </a>
            <a className="btn btn--ghost" href="#contact">
              Talk to a project manager
            </a>
          </div>

          <div className="hero-stats" role="list">
            <div className="stat" role="listitem">
              <strong>{company?.years_experience ?? 10}+</strong>
              <span>Years experience</span>
            </div>
            <div className="stat" role="listitem">
              <strong>{company?.projects_delivered ?? 50}+</strong>
              <span>Projects delivered</span>
            </div>
            <div className="stat" role="listitem">
              <strong>100%</strong>
              <span>Safety compliance</span>
            </div>
          </div>
        </div>

        <div className="hero-collage" aria-hidden="true">
          <img
            src="/projects/IMG_9592.jpeg"
            alt=""
            loading="eager"
            decoding="async"
          />
          <span className="hero-badge">On-site &amp; on-schedule</span>
        </div>
      </div>
    </section>
  );
}
