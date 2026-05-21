// Tauri requires a binary entrypoint. Real logic lives in the library crate.
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    aoa_legacy_lib::run();
}
