//! Invoice CRUD + PDF export.
//!
//! Invoices are stored in `<app_local_data>/invoices.json`. Each invoice
//! has line items (description, qty, unit price). Totals are computed
//! server-side so the PDF and stored record always agree.
//!
//! PDF rendering uses `printpdf` (pure Rust, no native deps).

use crate::auth::AuthState;
use crate::error::{AppError, AppResult};
use chrono::{DateTime, Utc};
use printpdf::{BuiltinFont, IndirectFontRef, Mm, PdfDocument, PdfDocumentReference};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

static FILE_LOCK: Mutex<()> = Mutex::new(());

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItem {
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
}

impl LineItem {
    fn total(&self) -> f64 {
        (self.quantity * self.unit_price * 100.0).round() / 100.0
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    pub number: String,
    pub client_name: String,
    pub client_email: Option<String>,
    pub client_address: Option<String>,
    pub project: Option<String>,
    pub currency: String,
    pub issue_date: String,
    pub due_date: String,
    pub items: Vec<LineItem>,
    pub notes: Option<String>,
    pub tax_rate: f64,
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceInput {
    pub number: String,
    pub client_name: String,
    #[serde(default)]
    pub client_email: Option<String>,
    #[serde(default)]
    pub client_address: Option<String>,
    #[serde(default)]
    pub project: Option<String>,
    #[serde(default = "default_currency")]
    pub currency: String,
    pub issue_date: String,
    pub due_date: String,
    pub items: Vec<LineItem>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub tax_rate: f64,
}

fn default_currency() -> String {
    "NGN".into()
}

fn invoices_path(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| AppError::NoAppDir)?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("invoices.json"))
}

fn load_all(app: &AppHandle) -> AppResult<Vec<Invoice>> {
    let path = invoices_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = std::fs::read_to_string(&path)?;
    if raw.trim().is_empty() {
        return Ok(Vec::new());
    }
    Ok(serde_json::from_str(&raw).unwrap_or_default())
}

fn save_all(app: &AppHandle, all: &[Invoice]) -> AppResult<()> {
    let path = invoices_path(app)?;
    std::fs::write(&path, serde_json::to_string_pretty(all)?)?;
    Ok(())
}

fn validate(input: &InvoiceInput) -> AppResult<()> {
    if input.number.trim().is_empty() {
        return Err(AppError::Validation("Invoice number is required.".into()));
    }
    if input.client_name.trim().is_empty() {
        return Err(AppError::Validation("Client name is required.".into()));
    }
    if input.issue_date.trim().is_empty() {
        return Err(AppError::Validation("Issue date is required.".into()));
    }
    if input.due_date.trim().is_empty() {
        return Err(AppError::Validation("Due date is required.".into()));
    }
    if input.items.is_empty() {
        return Err(AppError::Validation(
            "At least one line item is required.".into(),
        ));
    }
    for (i, it) in input.items.iter().enumerate() {
        if it.description.trim().is_empty() {
            return Err(AppError::Validation(format!(
                "Line {} is missing a description.",
                i + 1
            )));
        }
        if it.quantity <= 0.0 || it.quantity > 1_000_000.0 {
            return Err(AppError::Validation(format!(
                "Line {} has an invalid quantity.",
                i + 1
            )));
        }
        if it.unit_price < 0.0 || it.unit_price > 1_000_000_000.0 {
            return Err(AppError::Validation(format!(
                "Line {} has an invalid unit price.",
                i + 1
            )));
        }
    }
    if !(0.0..=100.0).contains(&input.tax_rate) {
        return Err(AppError::Validation(
            "Tax rate must be between 0 and 100.".into(),
        ));
    }
    Ok(())
}

fn compute_totals(items: &[LineItem], tax_rate: f64) -> (f64, f64, f64) {
    let subtotal: f64 = items.iter().map(|i| i.total()).sum();
    let subtotal = (subtotal * 100.0).round() / 100.0;
    let tax = (subtotal * tax_rate / 100.0 * 100.0).round() / 100.0;
    let total = ((subtotal + tax) * 100.0).round() / 100.0;
    (subtotal, tax, total)
}

fn generate_id() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("inv_{now:x}")
}

#[tauri::command]
pub fn list_invoices(
    app: AppHandle,
    state: State<AuthState>,
    token: String,
) -> AppResult<Vec<Invoice>> {
    state.check(&token)?;
    load_all(&app)
}

#[tauri::command]
pub fn create_invoice(
    app: AppHandle,
    state: State<AuthState>,
    token: String,
    payload: InvoiceInput,
) -> AppResult<Invoice> {
    state.check(&token)?;
    validate(&payload)?;
    let (subtotal, tax, total) = compute_totals(&payload.items, payload.tax_rate);
    let invoice = Invoice {
        id: generate_id(),
        number: payload.number.trim().to_string(),
        client_name: payload.client_name.trim().to_string(),
        client_email: payload.client_email.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
        client_address: payload.client_address.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
        project: payload.project.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
        currency: payload.currency.trim().to_uppercase(),
        issue_date: payload.issue_date,
        due_date: payload.due_date,
        items: payload.items,
        notes: payload.notes.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
        tax_rate: payload.tax_rate,
        subtotal,
        tax,
        total,
        created_at: Utc::now(),
    };

    let _guard = FILE_LOCK.lock().unwrap_or_else(|p| p.into_inner());
    let mut all = load_all(&app)?;
    all.push(invoice.clone());
    save_all(&app, &all)?;
    Ok(invoice)
}

#[tauri::command]
pub fn delete_invoice(
    app: AppHandle,
    state: State<AuthState>,
    token: String,
    id: String,
) -> AppResult<()> {
    state.check(&token)?;
    let _guard = FILE_LOCK.lock().unwrap_or_else(|p| p.into_inner());
    let mut all = load_all(&app)?;
    let before = all.len();
    all.retain(|i| i.id != id);
    if all.len() == before {
        return Err(AppError::NotFound);
    }
    save_all(&app, &all)?;
    Ok(())
}

/// Renders the invoice to a PDF and returns the absolute path on disk.
/// Files are saved under `<app_local_data>/invoices/{number}.pdf`.
#[tauri::command]
pub fn export_invoice_pdf(
    app: AppHandle,
    state: State<AuthState>,
    token: String,
    id: String,
) -> AppResult<String> {
    state.check(&token)?;
    let all = load_all(&app)?;
    let invoice = all.into_iter().find(|i| i.id == id).ok_or(AppError::NotFound)?;

    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| AppError::NoAppDir)?
        .join("invoices");
    std::fs::create_dir_all(&dir)?;
    let safe_number: String = invoice
        .number
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let out_path = dir.join(format!("{safe_number}.pdf"));

    render_pdf(&invoice, &out_path)?;
    Ok(out_path.to_string_lossy().into_owned())
}

fn render_pdf(inv: &Invoice, out_path: &std::path::Path) -> AppResult<()> {
    let (doc, page1, layer1) =
        PdfDocument::new(format!("Invoice {}", inv.number), Mm(210.0), Mm(297.0), "Layer 1");
    let bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let regular = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::Pdf(e.to_string()))?;
    let layer = doc.get_page(page1).get_layer(layer1);

    // --- Header ---
    layer.use_text("AOA LEGACY CONCEPTS", 22.0, Mm(20.0), Mm(275.0), &bold);
    layer.use_text(
        "Construction & Project Management",
        10.0,
        Mm(20.0),
        Mm(269.0),
        &regular,
    );
    layer.use_text(
        "Lagos, Nigeria  ·  aoalegacyconcepts@gmail.com  ·  +234 706 099 6703",
        9.0,
        Mm(20.0),
        Mm(264.0),
        &regular,
    );

    // Right side: INVOICE label
    layer.use_text("INVOICE", 26.0, Mm(155.0), Mm(275.0), &bold);
    layer.use_text(format!("#{}", inv.number), 12.0, Mm(155.0), Mm(268.0), &regular);

    // Divider
    use printpdf::{Line, Point};
    let line = Line {
        points: vec![
            (Point::new(Mm(20.0), Mm(258.0)), false),
            (Point::new(Mm(190.0), Mm(258.0)), false),
        ],
        is_closed: false,
    };
    layer.add_line(line);

    // --- Bill to / dates ---
    layer.use_text("BILL TO", 9.0, Mm(20.0), Mm(248.0), &bold);
    layer.use_text(&inv.client_name, 11.0, Mm(20.0), Mm(242.0), &regular);
    let mut y = 236.0_f64;
    if let Some(addr) = &inv.client_address {
        for line in addr.lines().take(4) {
            layer.use_text(line, 10.0, Mm(20.0), Mm(y), &regular);
            y -= 5.0;
        }
    }
    if let Some(em) = &inv.client_email {
        layer.use_text(em, 10.0, Mm(20.0), Mm(y), &regular);
    }

    layer.use_text("ISSUE DATE", 9.0, Mm(130.0), Mm(248.0), &bold);
    layer.use_text(&inv.issue_date, 11.0, Mm(130.0), Mm(242.0), &regular);
    layer.use_text("DUE DATE", 9.0, Mm(165.0), Mm(248.0), &bold);
    layer.use_text(&inv.due_date, 11.0, Mm(165.0), Mm(242.0), &regular);

    if let Some(project) = &inv.project {
        layer.use_text("PROJECT", 9.0, Mm(130.0), Mm(232.0), &bold);
        layer.use_text(project, 11.0, Mm(130.0), Mm(226.0), &regular);
    }

    // --- Table header ---
    let table_top = 210.0_f64;
    let header_line = Line {
        points: vec![
            (Point::new(Mm(20.0), Mm(table_top + 6.0)), false),
            (Point::new(Mm(190.0), Mm(table_top + 6.0)), false),
        ],
        is_closed: false,
    };
    layer.add_line(header_line);
    layer.use_text("DESCRIPTION", 9.0, Mm(22.0), Mm(table_top), &bold);
    layer.use_text("QTY", 9.0, Mm(130.0), Mm(table_top), &bold);
    layer.use_text("UNIT", 9.0, Mm(148.0), Mm(table_top), &bold);
    layer.use_text("AMOUNT", 9.0, Mm(172.0), Mm(table_top), &bold);
    let underline = Line {
        points: vec![
            (Point::new(Mm(20.0), Mm(table_top - 2.0)), false),
            (Point::new(Mm(190.0), Mm(table_top - 2.0)), false),
        ],
        is_closed: false,
    };
    layer.add_line(underline);

    // --- Items ---
    let mut row_y = table_top - 8.0;
    for it in &inv.items {
        // wrap description softly at ~55 chars
        let chunks = wrap_text(&it.description, 55);
        for (i, line) in chunks.iter().enumerate() {
            layer.use_text(line, 10.0, Mm(22.0), Mm(row_y), &regular);
            if i == 0 {
                layer.use_text(
                    format_qty(it.quantity),
                    10.0,
                    Mm(130.0),
                    Mm(row_y),
                    &regular,
                );
                layer.use_text(
                    format_money(it.unit_price, &inv.currency),
                    10.0,
                    Mm(148.0),
                    Mm(row_y),
                    &regular,
                );
                layer.use_text(
                    format_money(it.total(), &inv.currency),
                    10.0,
                    Mm(172.0),
                    Mm(row_y),
                    &regular,
                );
            }
            row_y -= 5.0;
        }
        row_y -= 2.0;
        if row_y < 60.0 {
            // crude single-page guard; for production add a page break.
            layer.use_text(
                "(items truncated — too many to fit on one page)",
                9.0,
                Mm(22.0),
                Mm(row_y),
                &regular,
            );
            break;
        }
    }

    // --- Totals ---
    row_y -= 4.0;
    let tot_line = Line {
        points: vec![
            (Point::new(Mm(130.0), Mm(row_y)), false),
            (Point::new(Mm(190.0), Mm(row_y)), false),
        ],
        is_closed: false,
    };
    layer.add_line(tot_line);
    row_y -= 6.0;
    layer.use_text("Subtotal", 10.0, Mm(132.0), Mm(row_y), &regular);
    layer.use_text(
        format_money(inv.subtotal, &inv.currency),
        10.0,
        Mm(172.0),
        Mm(row_y),
        &regular,
    );
    row_y -= 6.0;
    layer.use_text(
        format!("Tax ({:.1}%)", inv.tax_rate),
        10.0,
        Mm(132.0),
        Mm(row_y),
        &regular,
    );
    layer.use_text(
        format_money(inv.tax, &inv.currency),
        10.0,
        Mm(172.0),
        Mm(row_y),
        &regular,
    );
    row_y -= 8.0;
    layer.use_text("TOTAL", 12.0, Mm(132.0), Mm(row_y), &bold);
    layer.use_text(
        format_money(inv.total, &inv.currency),
        12.0,
        Mm(172.0),
        Mm(row_y),
        &bold,
    );

    // --- Notes ---
    if let Some(notes) = &inv.notes {
        row_y -= 14.0;
        layer.use_text("Notes", 10.0, Mm(20.0), Mm(row_y), &bold);
        row_y -= 5.0;
        for line in wrap_text(notes, 95).iter().take(6) {
            layer.use_text(line, 9.5, Mm(20.0), Mm(row_y), &regular);
            row_y -= 5.0;
        }
    }

    // Footer
    layer.use_text(
        "Thank you for your business. Payment due on or before the due date above.",
        9.0,
        Mm(20.0),
        Mm(20.0),
        &regular,
    );

    save_pdf(&doc, out_path)
}

fn save_pdf(doc: &PdfDocumentReference, out_path: &std::path::Path) -> AppResult<()> {
    use std::fs::File;
    use std::io::BufWriter;
    let file = File::create(out_path)?;
    let mut writer = BufWriter::new(file);
    doc.save(&mut writer).map_err(|e| AppError::Pdf(e.to_string()))?;
    Ok(())
}

fn wrap_text(s: &str, width: usize) -> Vec<String> {
    let mut out = Vec::new();
    for paragraph in s.split('\n') {
        let mut cur = String::new();
        for word in paragraph.split_whitespace() {
            if cur.is_empty() {
                cur.push_str(word);
            } else if cur.chars().count() + 1 + word.chars().count() <= width {
                cur.push(' ');
                cur.push_str(word);
            } else {
                out.push(std::mem::take(&mut cur));
                cur.push_str(word);
            }
        }
        if !cur.is_empty() {
            out.push(cur);
        } else if paragraph.is_empty() {
            out.push(String::new());
        }
    }
    if out.is_empty() {
        out.push(String::new());
    }
    out
}

fn format_qty(q: f64) -> String {
    if (q - q.round()).abs() < f64::EPSILON {
        format!("{}", q as i64)
    } else {
        format!("{q:.2}")
    }
}

fn format_money(n: f64, currency: &str) -> String {
    let sym = match currency {
        "NGN" => "₦",
        "USD" => "$",
        "EUR" => "€",
        "GBP" => "£",
        _ => "",
    };
    let abs = n.abs();
    let int_part = abs.trunc() as u64;
    let frac = ((abs - int_part as f64) * 100.0).round() as u64;
    // simple thousands separator
    let int_str = {
        let s = int_part.to_string();
        let bytes: Vec<char> = s.chars().collect();
        let mut out = String::new();
        for (i, c) in bytes.iter().enumerate() {
            if i > 0 && (bytes.len() - i) % 3 == 0 {
                out.push(',');
            }
            out.push(*c);
        }
        out
    };
    let sign = if n < 0.0 { "-" } else { "" };
    if sym.is_empty() {
        format!("{sign}{int_str}.{frac:02} {currency}")
    } else {
        format!("{sign}{sym}{int_str}.{frac:02}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn totals_basic() {
        let items = vec![
            LineItem { description: "A".into(), quantity: 2.0, unit_price: 100.0 },
            LineItem { description: "B".into(), quantity: 1.5, unit_price: 200.0 },
        ];
        let (sub, tax, total) = compute_totals(&items, 7.5);
        assert!((sub - 500.0).abs() < 0.001);
        assert!((tax - 37.5).abs() < 0.001);
        assert!((total - 537.5).abs() < 0.001);
    }

    #[test]
    fn format_money_ngn() {
        assert_eq!(format_money(1234567.5, "NGN"), "₦1,234,567.50");
    }

    #[test]
    fn validation_requires_items() {
        let bad = InvoiceInput {
            number: "INV-1".into(),
            client_name: "Acme".into(),
            client_email: None,
            client_address: None,
            project: None,
            currency: "NGN".into(),
            issue_date: "2025-01-01".into(),
            due_date: "2025-01-31".into(),
            items: vec![],
            notes: None,
            tax_rate: 0.0,
        };
        assert!(validate(&bad).is_err());
    }
}
