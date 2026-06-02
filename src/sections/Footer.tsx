import type { CompanyInfo } from "../lib/api";

export function Footer({
  company,
  onOpenAdmin,
}: {
  company: CompanyInfo | null;
  onOpenAdmin?: () => void;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          <div>
            <img
              src="/aoa-logo.jpg"
              alt={`${company?.name ?? "AOA Legacy Concepts"} logo`}
              width="1200"
              height="1200"
              loading="lazy"
              decoding="async"
              className="footer-logo"
            />
            <p style={{ maxWidth: "44ch" }}>
              {company?.tagline ??
                "Building lasting value across commercial, residential, and infrastructure projects."}
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#projects">Projects</a></li>
              <li><a href="#team">Team</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>
                <a href={`mailto:${company?.email ?? "aoalegacyconcepts@gmail.com"}`}>
                  {company?.email ?? "aoalegacyconcepts@gmail.com"}
                </a>
              </li>
              <li>
                <a href={`tel:${(company?.phone ?? "+2347060996703").replace(/\s/g, "")}`}>
                  {company?.phone ?? "+234 706 099 6703"}
                </a>
              </li>
              <li>{company?.location ?? "Lagos, Nigeria"}</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            &copy; {year} {company?.name ?? "AOA Legacy Concepts"}. All rights reserved.
          </span>
          <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                aria-label="Open admin panel"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  font: "inherit",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  opacity: 0.6,
                }}
              >
                Admin
              </button>
            )}
            <span>Crafted with Tauri, React &amp; Rust.</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
