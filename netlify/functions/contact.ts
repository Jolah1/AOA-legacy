/**
 * Netlify Function: POST /.netlify/functions/contact
 *
 * Receives a JSON contact-form payload from the public marketing site,
 * validates it server-side, and emails it to the configured inbox via
 * Gmail SMTP (using nodemailer).
 *
 * Required Netlify environment variables (set in the Netlify UI →
 * Site settings → Environment variables):
 *   SMTP_HOST         (default: smtp.gmail.com)
 *   SMTP_PORT         (default: 587)
 *   SMTP_USER         your Gmail address
 *   SMTP_PASS         a Gmail "App Password" (NOT your account password)
 *   MAIL_TO           recipient (default: aoalegacyconcepts@gmail.com)
 *   MAIL_FROM         from address (default: SMTP_USER)
 *   MAIL_FROM_NAME    optional display name
 */

import type { Handler } from "@netlify/functions";
import nodemailer from "nodemailer";

interface ContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  website?: string; // honeypot
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validate(p: ContactPayload): string | null {
  if (p.website && p.website.trim().length > 0) return "invalid submission";
  if (!p.name || !p.name.trim() || p.name.length > 120)
    return "Name is required (max 120 characters).";
  if (!p.email || !EMAIL_RE.test(p.email.trim()) || p.email.length > 254)
    return "A valid email address is required.";
  if (!p.subject || !p.subject.trim() || p.subject.length > 160)
    return "Subject is required (max 160 characters).";
  if (!p.message || p.message.trim().length < 10 || p.message.length > 5000)
    return "Message must be between 10 and 5000 characters.";
  if (p.phone && p.phone.length > 40) return "Phone number is too long.";
  if (p.company && p.company.length > 160) return "Company name is too long.";
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let payload: ContactPayload;
  try {
    payload = JSON.parse(event.body ?? "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const validationError = validate(payload);
  if (validationError) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: validationError }),
    };
  }

  const {
    SMTP_HOST = "smtp.gmail.com",
    SMTP_PORT = "587",
    SMTP_USER,
    SMTP_PASS,
    MAIL_TO = "aoalegacyconcepts@gmail.com",
    MAIL_FROM,
    MAIL_FROM_NAME,
  } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    // Fail loud server-side, but don't leak details to the client.
    console.error("SMTP_USER / SMTP_PASS not configured for contact function");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Mail server is not configured." }),
    };
  }

  const name = payload.name!.trim();
  const email = payload.email!.trim().toLowerCase();
  const subject = payload.subject!.trim();
  const message = payload.message!.trim();
  const phone = payload.phone?.trim() || undefined;
  const company = payload.company?.trim() || undefined;

  const fromAddress = MAIL_FROM || SMTP_USER;
  const fromHeader = MAIL_FROM_NAME
    ? `${MAIL_FROM_NAME} <${fromAddress}>`
    : fromAddress;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const plain =
    `New enquiry from the AOA Legacy Concepts site\n\n` +
    `Name: ${name}\nEmail: ${email}\nPhone: ${phone ?? "—"}\nCompany: ${company ?? "—"}\n\n` +
    `Subject: ${subject}\n\n${message}\n`;

  const html =
    `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.55;color:#11181c">` +
    `<h2 style="margin:0 0 12px;color:#0b1f3a">New enquiry</h2>` +
    `<p style="margin:0 0 16px;color:#4a5765">Received via aoalegacy.com contact form.</p>` +
    `<table style="border-collapse:collapse">` +
    `<tr><td style="padding:6px 12px 6px 0;color:#4a5765">Name</td><td><strong>${htmlEscape(name)}</strong></td></tr>` +
    `<tr><td style="padding:6px 12px 6px 0;color:#4a5765">Email</td><td><a href="mailto:${htmlEscape(email)}">${htmlEscape(email)}</a></td></tr>` +
    `<tr><td style="padding:6px 12px 6px 0;color:#4a5765">Phone</td><td>${htmlEscape(phone ?? "—")}</td></tr>` +
    `<tr><td style="padding:6px 12px 6px 0;color:#4a5765">Company</td><td>${htmlEscape(company ?? "—")}</td></tr>` +
    `<tr><td style="padding:6px 12px 6px 0;color:#4a5765">Subject</td><td>${htmlEscape(subject)}</td></tr>` +
    `</table>` +
    `<hr style="border:none;border-top:1px solid #e3e7ee;margin:16px 0"/>` +
    `<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px">${htmlEscape(message)}</pre>` +
    `</div>`;

  try {
    await transporter.sendMail({
      from: fromHeader,
      to: MAIL_TO,
      replyTo: `${name} <${email}>`,
      subject: `[AOA Legacy] ${subject}`,
      text: plain,
      html,
    });
  } catch (err) {
    console.error("Mail send failed", err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Could not send your message. Please try again later." }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: `c_${Date.now().toString(16)}`,
      submitted_at: new Date().toISOString(),
      message: "Thank you. Your message has been received. We'll be in touch shortly.",
    }),
  };
};
