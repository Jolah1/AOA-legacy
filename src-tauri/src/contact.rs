//! Contact form handling.
//!
//! Submissions are validated, normalized, timestamped and appended to a
//! JSON file in the app's local data directory. In production you would
//! swap the file sink for an email/CRM integration — the command signature
//! stays the same.

use crate::auth::AuthState;
use crate::email;
use crate::error::{AppError, AppResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

/// Inbound payload from the frontend.
#[derive(Debug, Deserialize)]
pub struct ContactInput {
    pub name: String,
    pub email: String,
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default)]
    pub company: Option<String>,
    pub subject: String,
    pub message: String,
    /// Honeypot field — must be empty for a real submission.
    #[serde(default)]
    pub website: Option<String>,
}

/// Stored, validated submission.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactSubmission {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub subject: String,
    pub message: String,
    pub submitted_at: DateTime<Utc>,
}

/// Result returned to the frontend after a successful submission.
#[derive(Debug, Serialize)]
pub struct SubmitResult {
    pub id: String,
    pub submitted_at: DateTime<Utc>,
    pub message: String,
}

/// Process-wide guard so concurrent submissions don't corrupt the JSON file.
static FILE_LOCK: Mutex<()> = Mutex::new(());

fn submissions_path(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| AppError::NoAppDir)?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("contact_submissions.json"))
}

fn validate(input: &ContactInput) -> AppResult<()> {
    // Honeypot — silently reject bots.
    if input.website.as_deref().map(str::trim).unwrap_or("").is_empty() {
        // empty is good
    } else {
        return Err(AppError::Validation("invalid submission".into()));
    }

    let name = input.name.trim();
    if name.is_empty() || name.len() > 120 {
        return Err(AppError::Validation(
            "Name is required (max 120 characters).".into(),
        ));
    }

    let email = input.email.trim();
    // Lightweight email sanity check: one '@', at least one '.' after it,
    // no spaces. Avoids pulling a regex dependency.
    let at = email.find('@');
    let valid_email = match at {
        Some(idx) if idx > 0 && idx < email.len() - 3 => {
            let (_, rest) = email.split_at(idx + 1);
            !email.contains(' ') && rest.contains('.') && !rest.ends_with('.')
        }
        _ => false,
    };
    if !valid_email || email.len() > 254 {
        return Err(AppError::Validation(
            "A valid email address is required.".into(),
        ));
    }

    let subject = input.subject.trim();
    if subject.is_empty() || subject.len() > 160 {
        return Err(AppError::Validation(
            "Subject is required (max 160 characters).".into(),
        ));
    }

    let message = input.message.trim();
    if message.len() < 10 || message.len() > 5000 {
        return Err(AppError::Validation(
            "Message must be between 10 and 5000 characters.".into(),
        ));
    }

    if let Some(phone) = input.phone.as_deref() {
        if phone.len() > 40 {
            return Err(AppError::Validation("Phone number is too long.".into()));
        }
    }
    if let Some(company) = input.company.as_deref() {
        if company.len() > 160 {
            return Err(AppError::Validation("Company name is too long.".into()));
        }
    }
    Ok(())
}

/// Generate a short, sortable, lexicographic ID. Uses timestamp + a small
/// counter from the system time to stay dependency-light.
fn generate_id() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("c_{now:x}")
}

#[tauri::command]
pub async fn submit_contact(
    app: AppHandle,
    payload: ContactInput,
) -> AppResult<SubmitResult> {
    validate(&payload)?;

    let submission = ContactSubmission {
        id: generate_id(),
        name: payload.name.trim().to_string(),
        email: payload.email.trim().to_lowercase(),
        phone: payload
            .phone
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()),
        company: payload
            .company
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()),
        subject: payload.subject.trim().to_string(),
        message: payload.message.trim().to_string(),
        submitted_at: Utc::now(),
    };

    // 1. Persist locally first — never lose a message even if email fails.
    {
        let path = submissions_path(&app)?;
        let _guard = FILE_LOCK.lock().unwrap_or_else(|p| p.into_inner());

        let mut existing: Vec<ContactSubmission> = if path.exists() {
            let raw = std::fs::read_to_string(&path)?;
            if raw.trim().is_empty() {
                Vec::new()
            } else {
                serde_json::from_str(&raw).unwrap_or_default()
            }
        } else {
            Vec::new()
        };
        existing.push(submission.clone());
        let serialized = serde_json::to_string_pretty(&existing)?;
        std::fs::write(&path, serialized)?;
    }

    // 2. Best-effort email. If SMTP is not configured we still report success.
    let email_sent = match email::send_contact_email(
        &submission.name,
        &submission.email,
        submission.phone.as_deref(),
        submission.company.as_deref(),
        &submission.subject,
        &submission.message,
    )
    .await
    {
        Ok(sent) => sent,
        Err(e) => {
            eprintln!("[contact] email send failed: {e}");
            false
        }
    };

    let message = if email_sent {
        "Thank you. Your message has been received and emailed to our team."
    } else {
        "Thank you. Your message has been received. We'll be in touch shortly."
    };

    Ok(SubmitResult {
        id: submission.id,
        submitted_at: submission.submitted_at,
        message: message.into(),
    })
}

#[tauri::command]
pub fn list_contact_submissions(
    app: AppHandle,
    state: State<AuthState>,
    token: String,
) -> AppResult<Vec<ContactSubmission>> {
    state.check(&token)?;
    let path = submissions_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = std::fs::read_to_string(&path)?;
    if raw.trim().is_empty() {
        return Ok(Vec::new());
    }
    Ok(serde_json::from_str(&raw).unwrap_or_default())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> ContactInput {
        ContactInput {
            name: "Ada Lovelace".into(),
            email: "ada@example.com".into(),
            phone: None,
            company: None,
            subject: "Project enquiry".into(),
            message: "We're planning a 5-storey building in Lekki.".into(),
            website: None,
        }
    }

    #[test]
    fn accepts_valid_input() {
        assert!(validate(&base()).is_ok());
    }

    #[test]
    fn rejects_empty_name() {
        let mut i = base();
        i.name = "  ".into();
        assert!(validate(&i).is_err());
    }

    #[test]
    fn rejects_bad_email() {
        let mut i = base();
        i.email = "not-an-email".into();
        assert!(validate(&i).is_err());
    }

    #[test]
    fn rejects_short_message() {
        let mut i = base();
        i.message = "hi".into();
        assert!(validate(&i).is_err());
    }

    #[test]
    fn rejects_honeypot() {
        let mut i = base();
        i.website = Some("http://spam".into());
        assert!(validate(&i).is_err());
    }
}
