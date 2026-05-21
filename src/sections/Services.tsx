import { Reveal } from "../components/Reveal";

const SERVICES = [
  {
    title: "Project Management",
    items: [
      "Schedule development & management",
      "Budget planning & cost control",
      "Risk assessment & mitigation",
      "Resource allocation",
      "Change order management",
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3h18v18H3z" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: "Construction Delivery",
    items: [
      "Commercial buildings",
      "Residential developments",
      "Infrastructure & civil works",
      "Industrial plant upgrades",
      "Renovations & fit-outs",
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    title: "Technical Expertise",
    items: [
      "Construction methods & materials",
      "Building codes & regulations",
      "Blueprint reading & interpretation",
      "Safety management systems",
      "Environmental compliance",
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l9 4-9 4-9-4 9-4zM3 10l9 4 9-4M3 14l9 4 9-4" />
      </svg>
    ),
  },
  {
    title: "Quality &amp; Safety",
    items: [
      "Quality assurance & control",
      "Stakeholder management",
      "Contract negotiation",
      "Conflict resolution",
      "Reporting & dashboards",
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

export function Services() {
  return (
    <section id="services" className="section section--soft">
      <div className="container">
        <Reveal>
          <span className="eyebrow">What we do</span>
          <h2 className="section-title">Services across the project lifecycle</h2>
          <p className="section-lede">
            From feasibility and design coordination through construction and
            handover, we bring deep technical expertise and disciplined
            execution to every project.
          </p>
        </Reveal>

        <div className="services-grid">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <div className="service">
                <div className="service-icon" aria-hidden="true">{s.icon}</div>
                <h3 dangerouslySetInnerHTML={{ __html: s.title }} />
                <ul>
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
