import { Reveal } from "../components/Reveal";

const TEAM = [
  {
    name: "Abayomi Akanbi",
    role: "Principal Project Manager",
    bio: "10+ years leading commercial, residential and infrastructure delivery.",
    photo: "/team/abayomi-akanbi.jpeg",
  },
  {
    name: "Construction Lead",
    role: "Site Operations",
    bio: "Day-to-day site management, sequencing trades and safety compliance.",
    photo: "",
  },
  {
    name: "QS & Cost Control",
    role: "Commercial Management",
    bio: "Budget planning, cost reporting, change orders, and procurement.",
    photo: "",
  },
];

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, var(--brand-navy), var(--brand-navy-2))",
        color: "var(--brand-gold)",
        fontWeight: 800,
        fontSize: 24,
      }}
    >
      {initials}
    </div>
  );
}

export function Team() {
  return (
    <section id="team" className="section section--soft">
      <div className="container">
        <Reveal>
          <span className="eyebrow">Leadership</span>
          <h2 className="section-title">The team behind the build.</h2>
          <p className="section-lede">
            Multidisciplinary leaders covering project, technical, commercial,
            and safety management.
          </p>
        </Reveal>

        <div className="team-grid">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 60}>
              <div className="team-card">
                <div className="team-photo">
                  {m.photo ? (
                    <img src={m.photo} alt={`Portrait of ${m.name}`} loading="lazy" />
                  ) : (
                    <Initials name={m.name} />
                  )}
                </div>
                <div>
                  <h3>{m.name}</h3>
                  <p style={{ color: "var(--brand-gold)", fontWeight: 600, fontSize: "var(--fs-sm)" }}>
                    {m.role}
                  </p>
                  <p>{m.bio}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
