import { Reveal } from "../components/Reveal";

const FACILITIES = [
  {
    title: "Residential portfolio",
    location: "Banana Island & Oniru",
    body: "15 residential apartments under active facility management, delivering upkeep, safety, and tenant services across two premium Lagos addresses.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    title: "Commercial property",
    location: "Awolowo Road, Ikoyi",
    body: "A commercial property managed end to end — maintenance, compliance, and operations — on one of Ikoyi's most prominent business corridors.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M6 21V4h9v17M15 8h3v13M9 8h.01M9 12h.01M9 16h.01M12 8h.01M12 12h.01M12 16h.01" />
      </svg>
    ),
  },
];

export function Facilities() {
  return (
    <section id="facilities" className="section section--soft">
      <div className="container">
        <Reveal>
          <span className="eyebrow">Facility management</span>
          <h2 className="section-title">Properties under our management</h2>
          <p className="section-lede">
            Beyond construction, we manage a growing portfolio of residential
            and commercial properties across Lagos — keeping every asset
            well-maintained, compliant, and running smoothly.
          </p>
        </Reveal>

        <div className="services-grid">
          {FACILITIES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="service">
                <div className="service-icon" aria-hidden="true">{f.icon}</div>
                <h3>{f.title}</h3>
                <p className="facility-location">{f.location}</p>
                <p>{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
