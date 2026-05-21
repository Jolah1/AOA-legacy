//! AOA Legacy Concepts — Tauri backend library.
//!
//! Modules:
//! - `contact`: public contact form (persist locally + best-effort email).
//! - `email`:   Gmail SMTP transport (env-configured).
//! - `auth`:    admin password (argon2) + in-process session token.
//! - `invoices`: line-item invoices + PDF export (printpdf).
//! - `projects`: static project + company info.
//! - `error`:   shared, serializable error type.

mod auth;
mod contact;
mod email;
mod error;
mod invoices;
mod projects;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env if present (next to the binary, the cwd, or the project root).
    // This is how SMTP_* credentials reach the process in development.
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(auth::AuthState::new())
        .setup(|app| {
            let dir = app
                .path()
                .app_local_data_dir()
                .expect("app local data dir should be resolvable");
            std::fs::create_dir_all(&dir).ok();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Public
            contact::submit_contact,
            projects::list_projects,
            projects::get_company_info,
            // Auth
            auth::admin_status,
            auth::set_admin_password,
            auth::verify_admin_password,
            auth::logout,
            // Admin-protected
            contact::list_contact_submissions,
            invoices::list_invoices,
            invoices::create_invoice,
            invoices::delete_invoice,
            invoices::export_invoice_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AOA Legacy Concepts");
}
