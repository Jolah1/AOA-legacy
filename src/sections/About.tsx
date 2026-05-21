import { Reveal } from "../components/Reveal";

const VALUES = [
  {
    title: "Proactive leadership",
    body: "We anticipate risks early and steer projects with transparent communication and meticulous planning.",
  },
  {
    title: "Quality &amp; safety",
    body: "Every site adheres to building codes and global EHS standards — no shortcuts on integrity.",
  },
  {
    title: "On time, on budget",
    body: "Optimized sequencing, tight cost control, and disciplined scheduling drive predictable delivery.",
  },
  {
    title: "Lasting client trust",
    body: "We don't just construct structures — we build the relationships and value that outlast them.",
  },
];

export function About() {
  return (
    <section id="about" className="section">
      <div className="container">
        <div className="about-grid">
          <Reveal>
            <span className="eyebrow">About AOA Legacy Concepts</span>
            <h2 className="section-title">
              Construction expertise grounded in 10+ years of delivery.
            </h2>
            <p>
              AOA Legacy Concepts is a construction and project management
              practice serving commercial, residential, and infrastructure
              clients across Nigeria. We coordinate multidisciplinary teams,
              manage stakeholders, and optimize processes for efficiency and
              cost-effectiveness — from breaking ground to handover.
            </p>
            <p>
              Our work spans healthcare, government, premium residential, and
              industrial plant upgrades — each delivered against the highest
              standards of structural integrity, finish quality, and regulatory
              compliance.
            </p>

            <div className="values">
              {VALUES.map((v) => (
                <div className="value" key={v.title}>
                  <h4 dangerouslySetInnerHTML={{ __html: v.title }} />
                  <p dangerouslySetInnerHTML={{ __html: v.body }} />
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="about-image">
              <img
                src="/projects/IMG_9593.jpeg"
                alt="An AOA Legacy Concepts project under construction."
                loading="lazy"
                decoding="async"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
