/**
 * Bridge between the React frontend and the Rust/Tauri backend.
 *
 * - In Tauri, commands are invoked through `@tauri-apps/api`.
 * - In a plain browser (e.g., `vite dev` without Tauri), we fall back to
 *   inline mock data so the marketing site is still fully usable for
 *   development and screenshotting.
 */

export interface Project {
  id: string;
  title: string;
  location: string;
  category: string;
  duration: string;
  size: string;
  completion: string;
  image: string;
  summary: string;
  highlights: string[];
}

export interface CompanyInfo {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  location: string;
  founded_year: number;
  years_experience: number;
  projects_delivered: number;
}

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  /** Honeypot — must be empty. */
  website?: string;
}

export interface SubmitResult {
  id: string;
  submitted_at: string;
  message: string;
}

declare global {
  interface Window {
    // Tauri injects this when running inside the desktop shell.
    __TAURI_INTERNALS__?: unknown;
  }
}

const isTauri = (): boolean =>
  typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

// --- Browser-mode fallback data (keeps frontend usable outside Tauri) ---

const FALLBACK_COMPANY: CompanyInfo = {
  name: "AOA Legacy Concepts",
  tagline:
    "Building lasting value across commercial, residential, and infrastructure projects.",
  email: "aoalegacyconcepts@gmail.com",
  phone: "+234 706 099 6703",
  location: "Lagos, Nigeria",
  founded_year: 2014,
  years_experience: 10,
  projects_delivered: 50,
};

const FALLBACK_PROJECTS: Project[] = [
  {
    id: "lazrid",
    title: "LAZRID Diagnostics Center",
    location: "Lagos, Nigeria",
    category: "Healthcare",
    duration: "24 Months",
    size: "4-Storey Building",
    completion: "October 2025",
    image: "/projects/IMG_9592.jpeg",
    summary:
      "State-of-the-art medical facility including diagnostic suites, emergency department, and patient towers.",
    highlights: [
      "Leading a team of 150+ workers across multiple trades.",
      "Advanced scheduling techniques to optimize workflow and reduce downtime.",
      "Coordinating civil, mechanical, and electrical works to healthcare specs.",
      "Project on track to complete two weeks ahead of schedule.",
    ],
  },
  {
    id: "egis",
    title: "EGIS Office Building",
    location: "Lagos, Nigeria",
    category: "Commercial",
    duration: "24 Months",
    size: "4-Storey Building",
    completion: "November 2025",
    image: "/projects/IMG_9593.jpeg",
    summary:
      "Upscale commercial development featuring high-end finishes, smart office technology, and sustainable design.",
    highlights: [
      "Coordinating 25+ subcontractors on a constrained urban site.",
      "Successfully navigating permit challenges and stakeholder relations.",
      "Innovative construction techniques for energy efficiency.",
    ],
  },
  {
    id: "infra-1",
    title: "Mixed-Use Development",
    location: "Lagos, Nigeria",
    category: "Commercial",
    duration: "20 Months",
    size: "Multi-Storey",
    completion: "2024",
    image: "/projects/IMG_9553.jpeg",
    summary: "Coordinated multi-trade construction across a complex mixed-use site.",
    highlights: [
      "Tight site logistics in a high-density urban context.",
      "Stakeholder management across investors and tenants.",
    ],
  },
  {
    id: "residential-2",
    title: "Premium Residential Build",
    location: "Lagos, Nigeria",
    category: "Residential",
    duration: "16 Months",
    size: "Multi-Unit",
    completion: "2024",
    image: "/projects/IMG_9590.jpeg",
    summary:
      "Premium finishes, structural integrity, and on-schedule delivery for a high-end residential client.",
    highlights: [
      "End-to-end project management.",
      "High-quality finishing and client satisfaction.",
    ],
  },
  {
    id: "infra-2",
    title: "Infrastructure Works",
    location: "Nigeria",
    category: "Infrastructure",
    duration: "12 Months",
    size: "Civil Works",
    completion: "2023",
    image: "/projects/2e9eff72-bdda-4dbb-aaaf-4751fa3d65a0.jpeg",
    summary: "Civil works package coordinating earthworks, drainage, and structural elements.",
    highlights: [
      "Strict adherence to safety management systems.",
      "Environmental compliance maintained throughout.",
    ],
  },
  {
    id: "commercial-2",
    title: "Commercial Fit-Out",
    location: "Lagos, Nigeria",
    category: "Commercial",
    duration: "8 Months",
    size: "Interior Build-Out",
    completion: "2023",
    image: "/projects/5db75809-feca-4515-8592-53456ab4f420.jpeg",
    summary: "Full commercial interior fit-out delivered on a compressed schedule.",
    highlights: [
      "Sequenced trades to minimize downtime.",
      "Delivered above client expectations on finish quality.",
    ],
  },
  {
    id: "residential-3",
    title: "Residential Renovation",
    location: "Lagos, Nigeria",
    category: "Residential",
    duration: "6 Months",
    size: "Whole-House",
    completion: "2022",
    image: "/projects/56f4bd3d-b36f-46d8-accb-89afce2b2cb6.jpeg",
    summary: "Full renovation including structural reinforcement and premium finishing.",
    highlights: [
      "Phased delivery while client remained partially in occupation.",
      "Strong cost control across the lifecycle.",
    ],
  },
];

export async function fetchCompanyInfo(): Promise<CompanyInfo> {
  if (isTauri()) return tauriInvoke<CompanyInfo>("get_company_info");
  return FALLBACK_COMPANY;
}

export async function fetchProjects(): Promise<Project[]> {
  if (isTauri()) return tauriInvoke<Project[]>("list_projects");
  return FALLBACK_PROJECTS;
}

export async function submitContact(payload: ContactInput): Promise<SubmitResult> {
  if (isTauri()) {
    return tauriInvoke<SubmitResult>("submit_contact", { payload });
  }

  // Browser path: try the serverless contact endpoint (used in the deployed
  // web version). Falls back to a local mock if the endpoint is unavailable
  // (e.g. plain `vite dev`).
  const endpoint = "/.netlify/functions/contact";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 404) throw new Error("offline-dev");
    const data = (await res.json()) as { error?: string } & SubmitResult;
    if (!res.ok) throw new Error(data.error ?? "Submission failed.");
    return data;
  } catch (err) {
    if (err instanceof Error && err.message !== "offline-dev") throw err;
  }

  // Local-dev mock validation path.
  await new Promise((r) => setTimeout(r, 350));
  if (payload.website && payload.website.trim().length > 0) {
    throw new Error("invalid submission");
  }
  if (!payload.name?.trim()) throw new Error("Name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email))
    throw new Error("A valid email address is required.");
  if (!payload.subject?.trim()) throw new Error("Subject is required.");
  if ((payload.message ?? "").trim().length < 10)
    throw new Error("Message must be at least 10 characters.");
  return {
    id: `c_${Date.now().toString(16)}`,
    submitted_at: new Date().toISOString(),
    message: "Thank you. Your message has been received. We'll be in touch shortly.",
  };
}

// =================== Admin / Auth ===================

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  submitted_at: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Invoice {
  id: string;
  number: string;
  client_name: string;
  client_email?: string;
  client_address?: string;
  project?: string;
  currency: string;
  issue_date: string;
  due_date: string;
  items: LineItem[];
  notes?: string;
  tax_rate: number;
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
}

export interface InvoiceInput {
  number: string;
  client_name: string;
  client_email?: string;
  client_address?: string;
  project?: string;
  currency: string;
  issue_date: string;
  due_date: string;
  items: LineItem[];
  notes?: string;
  tax_rate: number;
}

export const isDesktop = isTauri;

export async function adminStatus(): Promise<{ initialized: boolean }> {
  if (!isTauri()) return { initialized: false };
  const initialized = await tauriInvoke<boolean>("admin_status");
  return { initialized };
}

export async function setAdminPassword(
  newPassword: string,
  currentPassword?: string,
): Promise<string> {
  return tauriInvoke<string>("set_admin_password", {
    newPassword,
    currentPassword: currentPassword ?? null,
  });
}

export async function verifyAdminPassword(password: string): Promise<string> {
  return tauriInvoke<string>("verify_admin_password", { password });
}

export async function logout(): Promise<void> {
  return tauriInvoke<void>("logout");
}

export async function listSubmissions(token: string): Promise<ContactSubmission[]> {
  return tauriInvoke<ContactSubmission[]>("list_contact_submissions", { token });
}

export async function listInvoices(token: string): Promise<Invoice[]> {
  return tauriInvoke<Invoice[]>("list_invoices", { token });
}

export async function createInvoice(
  token: string,
  payload: InvoiceInput,
): Promise<Invoice> {
  return tauriInvoke<Invoice>("create_invoice", { token, payload });
}

export async function deleteInvoice(token: string, id: string): Promise<void> {
  return tauriInvoke<void>("delete_invoice", { token, id });
}

export async function exportInvoicePdf(token: string, id: string): Promise<string> {
  return tauriInvoke<string>("export_invoice_pdf", { token, id });
}
