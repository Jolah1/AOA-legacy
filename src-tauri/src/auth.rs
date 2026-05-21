//! Local password-based auth for the Admin panel.
//!
//! Strategy:
//! - On first launch, no password is set. The frontend prompts the user to
//!   create one. `set_admin_password` hashes it with Argon2id and writes the
//!   hash to `<app_local_data>/admin.json`.
//! - Subsequent launches call `verify_admin_password`, which compares against
//!   the stored hash. On success we mint a random session token kept in
//!   process memory and returned to the frontend; subsequent privileged
//!   commands require that token.
//!
//! This is "local-machine" authentication — appropriate for a single-user
//! desktop app. Tokens are not persisted; restarting the app logs out.

use crate::error::{AppError, AppResult};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Serialize, Deserialize)]
struct StoredAuth {
    password_hash: String,
}

/// In-memory session state. A non-empty `token` means a user is logged in.
#[derive(Default)]
pub struct AuthState {
    inner: Mutex<Option<String>>,
}

impl AuthState {
    pub fn new() -> Self {
        Self::default()
    }

    fn set(&self, token: String) {
        *self.inner.lock().unwrap_or_else(|p| p.into_inner()) = Some(token);
    }

    pub fn check(&self, token: &str) -> AppResult<()> {
        let guard = self.inner.lock().unwrap_or_else(|p| p.into_inner());
        match guard.as_deref() {
            Some(stored) if stored == token && !token.is_empty() => Ok(()),
            _ => Err(AppError::Unauthorized),
        }
    }
}

fn auth_path(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| AppError::NoAppDir)?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("admin.json"))
}

fn load_stored(app: &AppHandle) -> AppResult<Option<StoredAuth>> {
    let path = auth_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(&path)?;
    if raw.trim().is_empty() {
        return Ok(None);
    }
    Ok(Some(serde_json::from_str(&raw)?))
}

fn random_token() -> String {
    let mut rng = rand::thread_rng();
    let bytes: [u8; 24] = rng.gen();
    // hex without external dep
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn validate_password_strength(pw: &str) -> AppResult<()> {
    if pw.chars().count() < 8 {
        return Err(AppError::Validation(
            "Password must be at least 8 characters.".into(),
        ));
    }
    if pw.chars().count() > 256 {
        return Err(AppError::Validation("Password is too long.".into()));
    }
    Ok(())
}

#[tauri::command]
pub fn admin_status(app: AppHandle) -> AppResult<bool> {
    Ok(load_stored(&app)?.is_some())
}

#[tauri::command]
pub fn set_admin_password(
    app: AppHandle,
    state: State<AuthState>,
    new_password: String,
    current_password: Option<String>,
) -> AppResult<String> {
    validate_password_strength(&new_password)?;

    // If a password already exists, the caller must prove they know it.
    if let Some(stored) = load_stored(&app)? {
        let current = current_password.unwrap_or_default();
        let parsed = PasswordHash::new(&stored.password_hash)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Argon2::default()
            .verify_password(current.as_bytes(), &parsed)
            .map_err(|_| AppError::BadCredentials)?;
    }

    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(new_password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .to_string();

    let stored = StoredAuth { password_hash: hash };
    let path = auth_path(&app)?;
    std::fs::write(&path, serde_json::to_string_pretty(&stored)?)?;

    // Auto-login after set.
    let token = random_token();
    state.set(token.clone());
    Ok(token)
}

#[tauri::command]
pub fn verify_admin_password(
    app: AppHandle,
    state: State<AuthState>,
    password: String,
) -> AppResult<String> {
    let stored = load_stored(&app)?.ok_or(AppError::NotFound)?;
    let parsed = PasswordHash::new(&stored.password_hash)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .map_err(|_| AppError::BadCredentials)?;
    let token = random_token();
    state.set(token.clone());
    Ok(token)
}

#[tauri::command]
pub fn logout(state: State<AuthState>) -> AppResult<()> {
    *state.inner.lock().unwrap_or_else(|p| p.into_inner()) = None;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_short_password() {
        assert!(validate_password_strength("short").is_err());
    }

    #[test]
    fn accepts_normal_password() {
        assert!(validate_password_strength("hunter2!!").is_ok());
    }

    #[test]
    fn token_is_hex_and_long() {
        let t = random_token();
        assert_eq!(t.len(), 48);
        assert!(t.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
