import { useEffect, useState } from "react";
import {
  adminStatus,
  createInvoice,
  deleteInvoice,
  exportInvoicePdf,
  isDesktop,
  listInvoices,
  listSubmissions,
  logout as apiLogout,
  setAdminPassword,
  verifyAdminPassword,
  type ContactSubmission,
  type Invoice,
  type LineItem,
} from "../lib/api";

type View = "lock" | "setup" | "submissions" | "invoices" | "new-invoice";

interface Props {
  onClose: () => void;
}

export function Admin({ onClose }: Props) {
  const [view, setView] = useState<View>("lock");
  const [token, setToken] = useState<string>("");
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktop()) {
      setInitialized(false);
      return;
    }
    adminStatus()
      .then((s) => {
        setInitialized(s.initialized);
        setView(s.initialized ? "lock" : "setup");
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Escape closes the admin overlay (unless we're inside a form with unsaved data;
  // keep it simple — explicit close button is the safe path).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    setToken("");
    setView("lock");
  };

  if (!isDesktop()) {
    return (
      <AdminShell onClose={onClose} title="Admin">
        <div className="admin-card">
          <h2>Admin is desktop-only</h2>
          <p style={{ color: "var(--text-muted)" }}>
            The Admin panel — including submissions and invoices — runs only in
            the desktop application (Tauri + Rust). The web version exposes the
            public marketing site and contact form.
          </p>
          <button className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      onClose={onClose}
      title="Admin"
      authed={Boolean(token)}
      view={view}
      onNav={(v) => setView(v)}
      onLogout={handleLogout}
    >
      {error && (
        <div className="form-status" data-tone="error" role="alert">
          {error}
        </div>
      )}

      {initialized === null && <p>Loading…</p>}

      {view === "setup" && (
        <SetupForm
          onDone={(t) => {
            setToken(t);
            setInitialized(true);
            setView("submissions");
          }}
        />
      )}

      {view === "lock" && initialized && (
        <LockForm
          onUnlock={(t) => {
            setToken(t);
            setView("submissions");
          }}
        />
      )}

      {token && view === "submissions" && <SubmissionsView token={token} />}
      {token && view === "invoices" && (
        <InvoicesView token={token} onNew={() => setView("new-invoice")} />
      )}
      {token && view === "new-invoice" && (
        <NewInvoiceForm
          token={token}
          onDone={() => setView("invoices")}
          onCancel={() => setView("invoices")}
        />
      )}
    </AdminShell>
  );
}

function AdminShell({
  title,
  children,
  onClose,
  authed,
  view,
  onNav,
  onLogout,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  authed?: boolean;
  view?: View;
  onNav?: (v: View) => void;
  onLogout?: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
        className="admin-modal"
      >
        <header className="admin-header">
          <h2 id="admin-title">{title}</h2>
          {authed && onNav && (
            <nav className="admin-nav" aria-label="Admin sections">
              <button
                type="button"
                aria-pressed={view === "submissions"}
                onClick={() => onNav("submissions")}
              >
                Submissions
              </button>
              <button
                type="button"
                aria-pressed={view === "invoices" || view === "new-invoice"}
                onClick={() => onNav("invoices")}
              >
                Invoices
              </button>
            </nav>
          )}
          <div className="admin-actions">
            {authed && onLogout && (
              <button className="btn btn--ghost" type="button" onClick={onLogout}>
                Lock
              </button>
            )}
            <button
              className="modal-close"
              type="button"
              aria-label="Close admin"
              onClick={onClose}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>
        <div className="admin-body">{children}</div>
      </div>
    </div>
  );
}

// =================== Setup ===================

function SetupForm({ onDone }: { onDone: (token: string) => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setErr("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const t = await setAdminPassword(pw);
      onDone(t);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-card" onSubmit={submit}>
      <h3>Set up admin password</h3>
      <p style={{ color: "var(--text-muted)" }}>
        Choose a password to protect submissions and invoices. Stored locally,
        hashed with Argon2. You can change it later.
      </p>
      <div className="field">
        <label htmlFor="setup-pw">New password</label>
        <input
          id="setup-pw"
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          minLength={8}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="setup-pw2">Confirm password</label>
        <input
          id="setup-pw2"
          type="password"
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {err && (
        <div className="form-status" data-tone="error" role="alert">
          {err}
        </div>
      )}
      <button className="btn btn--accent" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Set password & continue"}
      </button>
    </form>
  );
}

// =================== Lock ===================

function LockForm({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const t = await verifyAdminPassword(pw);
      onUnlock(t);
    } catch (e) {
      setErr(
        e instanceof Error && /credentials|authentication/i.test(e.message)
          ? "Incorrect password."
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-card" onSubmit={submit}>
      <h3>Sign in</h3>
      <p style={{ color: "var(--text-muted)" }}>
        Enter your admin password to view submissions and invoices.
      </p>
      <div className="field">
        <label htmlFor="lock-pw">Password</label>
        <input
          id="lock-pw"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
      </div>
      {err && (
        <div className="form-status" data-tone="error" role="alert">
          {err}
        </div>
      )}
      <button className="btn btn--accent" type="submit" disabled={busy}>
        {busy ? "Unlocking…" : "Unlock"}
      </button>
    </form>
  );
}

// =================== Submissions ===================

function SubmissionsView({ token }: { token: string }) {
  const [rows, setRows] = useState<ContactSubmission[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listSubmissions(token)
      .then((r) =>
        setRows(
          [...r].sort(
            (a, b) =>
              new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
          ),
        ),
      )
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [token]);

  if (err)
    return (
      <div className="form-status" data-tone="error" role="alert">
        {err}
      </div>
    );
  if (!rows) return <p>Loading submissions…</p>;
  if (rows.length === 0)
    return (
      <div className="admin-card">
        <h3>No submissions yet</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Contact form submissions will appear here when received.
        </p>
      </div>
    );

  return (
    <div className="admin-list">
      {rows.map((s) => (
        <article key={s.id} className="admin-card submission">
          <header className="submission-head">
            <div>
              <h3>{s.subject}</h3>
              <p className="submission-meta">
                <strong>{s.name}</strong> &lt;{s.email}&gt;
                {s.phone && <> · {s.phone}</>}
                {s.company && <> · {s.company}</>}
              </p>
            </div>
            <time dateTime={s.submitted_at} className="submission-time">
              {new Date(s.submitted_at).toLocaleString()}
            </time>
          </header>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{s.message}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <a className="btn btn--ghost" href={`mailto:${s.email}?subject=Re: ${encodeURIComponent(s.subject)}`}>
              Reply
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

// =================== Invoices list ===================

function InvoicesView({ token, onNew }: { token: string; onNew: () => void }) {
  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastPath, setLastPath] = useState<string | null>(null);

  const load = () => {
    listInvoices(token)
      .then((r) =>
        setRows(
          [...r].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
        ),
      )
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  };

  useEffect(load, [token]);

  const onExport = async (id: string) => {
    setBusy(id);
    setErr(null);
    try {
      const p = await exportInvoicePdf(token, id);
      setLastPath(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    setBusy(id);
    try {
      await deleteInvoice(token, id);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (!rows && !err) return <p>Loading invoices…</p>;

  return (
    <>
      <div className="admin-toolbar">
        <h3 style={{ margin: 0 }}>Invoices</h3>
        <button className="btn btn--accent" type="button" onClick={onNew}>
          + New invoice
        </button>
      </div>

      {err && (
        <div className="form-status" data-tone="error" role="alert">
          {err}
        </div>
      )}
      {lastPath && (
        <div className="form-status" data-tone="success" role="status">
          PDF saved to: <code>{lastPath}</code>
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="admin-card">
          <p style={{ color: "var(--text-muted)" }}>
            No invoices yet. Click <strong>New invoice</strong> to create one.
          </p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="admin-list">
          {rows.map((inv) => (
            <article key={inv.id} className="admin-card">
              <div className="invoice-row">
                <div>
                  <h3>#{inv.number}</h3>
                  <p className="submission-meta">
                    {inv.client_name}
                    {inv.project && <> · {inv.project}</>}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
                    Issued {inv.issue_date} · Due {inv.due_date}
                  </p>
                </div>
                <div className="invoice-amount">
                  <strong>{formatMoney(inv.total, inv.currency)}</strong>
                  <span>
                    {inv.items.length} item{inv.items.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  className="btn btn--ghost"
                  type="button"
                  disabled={busy === inv.id}
                  onClick={() => onExport(inv.id)}
                >
                  {busy === inv.id ? "Exporting…" : "Export PDF"}
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  disabled={busy === inv.id}
                  onClick={() => onDelete(inv.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

// =================== New invoice form ===================

function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function NewInvoiceForm({
  token,
  onDone,
  onCancel,
}: {
  token: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [number, setNumber] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
  );
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [project, setProject] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(todayIso(30));
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateItem = (idx: number, patch: Partial<LineItem>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) =>
    setItems((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr));
  const addItem = () =>
    setItems((arr) => [...arr, { description: "", quantity: 1, unit_price: 0 }]);

  const subtotal = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0,
  );
  const tax = (subtotal * (Number(taxRate) || 0)) / 100;
  const total = subtotal + tax;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await createInvoice(token, {
        number,
        client_name: clientName,
        client_email: clientEmail || undefined,
        client_address: clientAddress || undefined,
        project: project || undefined,
        currency,
        issue_date: issueDate,
        due_date: dueDate,
        items: items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
        })),
        notes: notes || undefined,
        tax_rate: Number(taxRate) || 0,
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-card" onSubmit={submit}>
      <div className="admin-toolbar">
        <h3 style={{ margin: 0 }}>New invoice</h3>
        <button className="btn btn--ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className="form-row">
        <Field id="inv-number" label="Invoice number" value={number} onChange={setNumber} required />
        <Field
          id="inv-currency"
          label="Currency"
          value={currency}
          onChange={(v) => setCurrency(v.toUpperCase())}
          hint="e.g. NGN, USD, EUR, GBP"
          required
        />
      </div>
      <div className="form-row">
        <Field id="inv-client" label="Client name" value={clientName} onChange={setClientName} required />
        <Field
          id="inv-client-email"
          label="Client email"
          type="email"
          value={clientEmail}
          onChange={setClientEmail}
        />
      </div>
      <div className="form-row">
        <Field id="inv-project" label="Project (optional)" value={project} onChange={setProject} />
        <Field
          id="inv-address"
          label="Client address (optional)"
          value={clientAddress}
          onChange={setClientAddress}
        />
      </div>
      <div className="form-row">
        <Field id="inv-issue" label="Issue date" type="date" value={issueDate} onChange={setIssueDate} required />
        <Field id="inv-due" label="Due date" type="date" value={dueDate} onChange={setDueDate} required />
      </div>

      <h4 style={{ marginTop: 16, marginBottom: 8 }}>Line items</h4>
      <div className="items-table">
        <div className="items-head" aria-hidden="true">
          <span>Description</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Amount</span>
          <span></span>
        </div>
        {items.map((it, i) => {
          const amount = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
          return (
            <div className="items-row" key={i}>
              <label className="sr-only" htmlFor={`it-desc-${i}`}>
                Description
              </label>
              <input
                id={`it-desc-${i}`}
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="e.g. Site preparation works"
                required
              />
              <label className="sr-only" htmlFor={`it-qty-${i}`}>
                Quantity
              </label>
              <input
                id={`it-qty-${i}`}
                type="number"
                step="0.01"
                min="0.01"
                value={it.quantity}
                onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                required
              />
              <label className="sr-only" htmlFor={`it-unit-${i}`}>
                Unit price
              </label>
              <input
                id={`it-unit-${i}`}
                type="number"
                step="0.01"
                min="0"
                value={it.unit_price}
                onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
                required
              />
              <span className="items-amount">{formatMoney(amount, currency)}</span>
              <button
                type="button"
                className="items-remove"
                aria-label={`Remove line ${i + 1}`}
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn btn--ghost" onClick={addItem}>
        + Add line item
      </button>

      <div className="form-row" style={{ marginTop: 16 }}>
        <Field
          id="inv-tax"
          label="Tax rate (%)"
          type="number"
          value={String(taxRate)}
          onChange={(v) => setTaxRate(Number(v))}
        />
        <div className="totals">
          <div>
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal, currency)}</strong>
          </div>
          <div>
            <span>Tax</span>
            <strong>{formatMoney(tax, currency)}</strong>
          </div>
          <div className="totals-total">
            <span>Total</span>
            <strong>{formatMoney(total, currency)}</strong>
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="inv-notes">Notes (optional)</label>
        <textarea
          id="inv-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Payment terms, bank details, etc."
        />
      </div>

      {err && (
        <div className="form-status" data-tone="error" role="alert">
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn--accent" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save invoice"}
        </button>
        <button className="btn btn--ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// =================== Helpers ===================

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  hint?: string;
}
function Field({ id, label, value, onChange, required, type = "text", hint }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function formatMoney(n: number, currency: string): string {
  const symbol: Record<string, string> = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const sym = symbol[currency] ?? "";
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return sym ? `${sym}${formatted}` : `${formatted} ${currency}`;
}
