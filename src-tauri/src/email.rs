//! Gmail SMTP email sender.
//!
//! Configured entirely via environment variables read at process start
//! (and `.env` if present, via `dotenvy`):
//!
//!   SMTP_HOST       (default: smtp.gmail.com)
//!   SMTP_PORT       (default: 587)
//!   SMTP_USER       required to enable sending
//!   SMTP_PASS       required to enable sending (Gmail App Password)
//!   MAIL_FROM       defaults to SMTP_USER
//!   MAIL_TO         defaults to "aolanrewaju.akanbi@gmail.com"
//!   MAIL_FROM_NAME  optional display name
//!
//! If `SMTP_USER` / `SMTP_PASS` are not set we treat email as disabled
//! (the contact form still persists locally and returns success) so the
//! app remains usable out-of-the-box.

use crate::error::{AppError, AppResult};
use lettre::message::{header::ContentType, Mailbox, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use std::env;

#[derive(Debug, Clone)]
pub struct MailerConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub pass: String,
    pub from: Mailbox,
    pub to: Mailbox,
}

impl MailerConfig {
    /// Resolve config from environment. Returns `Ok(None)` when SMTP creds
    /// are missing (email disabled). Returns `Err` only for *malformed*
    /// values (so the user gets a meaningful message).
    pub fn from_env() -> AppResult<Option<Self>> {
        let user = match env::var("SMTP_USER").ok().filter(|s| !s.is_empty()) {
            Some(u) => u,
            None => return Ok(None),
        };
        let pass = match env::var("SMTP_PASS").ok().filter(|s| !s.is_empty()) {
            Some(p) => p,
            None => return Ok(None),
        };
        let host = env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".into());
        let port: u16 = env::var("SMTP_PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(587);
        let from_addr = env::var("MAIL_FROM").unwrap_or_else(|_| user.clone());
        let from_name = env::var("MAIL_FROM_NAME").ok();
        let to_addr =
            env::var("MAIL_TO").unwrap_or_else(|_| "aolanrewaju.akanbi@gmail.com".into());

        let from: Mailbox = match from_name {
            Some(name) => format!("{name} <{from_addr}>").parse(),
            None => from_addr.parse(),
        }
        .map_err(|e| AppError::Email(format!("invalid MAIL_FROM: {e}")))?;
        let to: Mailbox = to_addr
            .parse()
            .map_err(|e| AppError::Email(format!("invalid MAIL_TO: {e}")))?;

        Ok(Some(Self {
            host,
            port,
            user,
            pass,
            from,
            to,
        }))
    }
}

/// Send a plain + HTML contact-form notification. Returns `Ok(true)` if
/// SMTP is configured and the message was accepted; `Ok(false)` if SMTP
/// is disabled (no credentials). Errors mean SMTP was configured but
/// rejected the message.
pub async fn send_contact_email(
    name: &str,
    email: &str,
    phone: Option<&str>,
    company: Option<&str>,
    subject: &str,
    message: &str,
) -> AppResult<bool> {
    let cfg = match MailerConfig::from_env()? {
        Some(c) => c,
        None => return Ok(false),
    };

    let plain = format!(
        "New enquiry from the AOA Legacy Concepts site\n\
         \nName: {name}\nEmail: {email}\nPhone: {phone}\nCompany: {company}\n\n\
         Subject: {subject}\n\n{message}\n",
        phone = phone.unwrap_or("—"),
        company = company.unwrap_or("—"),
    );
    let html = format!(
        "<div style=\"font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.55;color:#11181c\">\
         <h2 style=\"margin:0 0 12px;color:#0b1f3a\">New enquiry</h2>\
         <p style=\"margin:0 0 16px;color:#4a5765\">Received via aoalegacy.com contact form.</p>\
         <table style=\"border-collapse:collapse\">\
         <tr><td style=\"padding:6px 12px 6px 0;color:#4a5765\">Name</td><td><strong>{name}</strong></td></tr>\
         <tr><td style=\"padding:6px 12px 6px 0;color:#4a5765\">Email</td><td><a href=\"mailto:{email}\">{email}</a></td></tr>\
         <tr><td style=\"padding:6px 12px 6px 0;color:#4a5765\">Phone</td><td>{phone}</td></tr>\
         <tr><td style=\"padding:6px 12px 6px 0;color:#4a5765\">Company</td><td>{company}</td></tr>\
         <tr><td style=\"padding:6px 12px 6px 0;color:#4a5765\">Subject</td><td>{subject}</td></tr>\
         </table>\
         <hr style=\"border:none;border-top:1px solid #e3e7ee;margin:16px 0\"/>\
         <pre style=\"white-space:pre-wrap;font-family:inherit;font-size:14px\">{msg}</pre>\
         </div>",
        name = html_escape(name),
        email = html_escape(email),
        phone = html_escape(phone.unwrap_or("—")),
        company = html_escape(company.unwrap_or("—")),
        subject = html_escape(subject),
        msg = html_escape(message),
    );

    let reply_to: Mailbox = format!("{name} <{email}>")
        .parse()
        .or_else(|_| email.parse())
        .map_err(|e: lettre::address::AddressError| AppError::Email(e.to_string()))?;

    let email_msg = Message::builder()
        .from(cfg.from.clone())
        .reply_to(reply_to)
        .to(cfg.to.clone())
        .subject(format!("[AOA Legacy] {subject}"))
        .multipart(
            MultiPart::alternative()
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_PLAIN)
                        .body(plain),
                )
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_HTML)
                        .body(html),
                ),
        )
        .map_err(|e| AppError::Email(e.to_string()))?;

    let creds = Credentials::new(cfg.user.clone(), cfg.pass.clone());
    let mailer: AsyncSmtpTransport<Tokio1Executor> =
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&cfg.host)
            .map_err(|e| AppError::Email(e.to_string()))?
            .port(cfg.port)
            .credentials(creds)
            .build();

    mailer
        .send(email_msg)
        .await
        .map_err(|e| AppError::Email(e.to_string()))?;
    Ok(true)
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
