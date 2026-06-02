import { useId, useState } from "react";
import { submitContact, type CompanyInfo, type ContactInput } from "../lib/api";
import { Reveal } from "../components/Reveal";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface Props {
  company: CompanyInfo | null;
}

export function Contact({ company }: Props) {
  const idBase = useId();
  const [form, setForm] = useState<ContactInput>({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    message: "",
    website: "", // honeypot
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const update = <K extends keyof ContactInput>(key: K, value: ContactInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof ContactInput, string>> = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Please enter a valid email.";
    if (!form.subject.trim()) next.subject = "Please add a subject.";
    if (form.message.trim().length < 10)
      next.message = "Message must be at least 10 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setStatus({ kind: "error", message: "Please correct the highlighted fields." });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const res = await submitContact(form);
      setStatus({ kind: "success", message: res.message });
      setForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        subject: "",
        message: "",
        website: "",
      });
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <section id="contact" className="section section--brand">
      <div className="container">
        <div className="contact-grid">
          <Reveal>
            <div className="contact-info">
              <span className="eyebrow" style={{ color: "var(--brand-gold-2)" }}>
                Get in touch
              </span>
              <h2 className="section-title" style={{ color: "#fff" }}>
                Start your next project with us.
              </h2>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "var(--fs-md)" }}>
                Tell us about your build — commercial, residential, infrastructure, or
                renovation. We'll respond within one business day.
              </p>

              <div style={{ marginTop: 16 }}>
                <div className="contact-detail">
                  <div className="icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 4h16v16H4z" />
                      <path d="M22 6l-10 7L2 6" />
                    </svg>
                  </div>
                  <div>
                    <strong>Email</strong>
                    <a href={`mailto:${company?.email ?? "aoalegacyconcepts@gmail.com"}`}>
                      {company?.email ?? "aoalegacyconcepts@gmail.com"}
                    </a>
                  </div>
                </div>
                <div className="contact-detail">
                  <div className="icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92V21a1 1 0 01-1.11 1A19 19 0 012 4.11 1 1 0 013 3h4.09a1 1 0 011 .75l1 4a1 1 0 01-.27 1L7 10.5a16 16 0 006.5 6.5l1.75-1.82a1 1 0 011-.27l4 1a1 1 0 01.75 1z" />
                    </svg>
                  </div>
                  <div>
                    <strong>Phone</strong>
                    <a href={`tel:${(company?.phone ?? "+2347060996703").replace(/\s/g, "")}`}>
                      {company?.phone ?? "+234 706 099 6703"}
                    </a>
                  </div>
                </div>
                <div className="contact-detail">
                  <div className="icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </div>
                  <div>
                    <strong>Location</strong>
                    <span>{company?.location ?? "Lagos, Nigeria"}</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <form
              className="contact-form"
              onSubmit={onSubmit}
              noValidate
              aria-describedby={status.kind !== "idle" ? `${idBase}-status` : undefined}
            >
              <div className="form-row">
                <Field
                  id={`${idBase}-name`}
                  label="Full name"
                  required
                  value={form.name}
                  onChange={(v) => update("name", v)}
                  error={errors.name}
                  autoComplete="name"
                />
                <Field
                  id={`${idBase}-email`}
                  label="Email address"
                  required
                  type="email"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                  error={errors.email}
                  autoComplete="email"
                />
              </div>
              <div className="form-row">
                <Field
                  id={`${idBase}-phone`}
                  label="Phone (optional)"
                  type="tel"
                  value={form.phone ?? ""}
                  onChange={(v) => update("phone", v)}
                  autoComplete="tel"
                />
                <Field
                  id={`${idBase}-company`}
                  label="Company (optional)"
                  value={form.company ?? ""}
                  onChange={(v) => update("company", v)}
                  autoComplete="organization"
                />
              </div>
              <Field
                id={`${idBase}-subject`}
                label="Subject"
                required
                value={form.subject}
                onChange={(v) => update("subject", v)}
                error={errors.subject}
                hint="e.g. New residential build in Lekki"
              />
              <div className="field">
                <label htmlFor={`${idBase}-message`}>
                  Message <span className="required" aria-hidden="true">*</span>
                  <span className="sr-only"> required</span>
                </label>
                <textarea
                  id={`${idBase}-message`}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  aria-invalid={Boolean(errors.message) || undefined}
                  aria-describedby={errors.message ? `${idBase}-message-err` : undefined}
                  required
                  minLength={10}
                  maxLength={5000}
                />
                {errors.message ? (
                  <span className="error" id={`${idBase}-message-err`}>
                    {errors.message}
                  </span>
                ) : (
                  <span className="hint">Tell us about your project, location and timeline.</span>
                )}
              </div>

              {/* Honeypot — hidden from real users + screen readers */}
              <div className="honeypot" aria-hidden="true">
                <label htmlFor={`${idBase}-website`}>Website</label>
                <input
                  id={`${idBase}-website`}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website ?? ""}
                  onChange={(e) => update("website", e.target.value)}
                />
              </div>

              <div role="status" aria-live="polite" id={`${idBase}-status`}>
                {status.kind === "success" && (
                  <div className="form-status" data-tone="success">
                    {status.message}
                  </div>
                )}
                {status.kind === "error" && (
                  <div className="form-status" data-tone="error">
                    {status.message}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--accent"
                disabled={status.kind === "submitting"}
              >
                {status.kind === "submitting" ? "Sending…" : "Send message"}
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type = "text",
  error,
  hint,
  autoComplete,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> required</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
      />
      {hint && !error && (
        <span className="hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="error" id={errId}>
          {error}
        </span>
      )}
    </div>
  );
}
