# AOA Legacy Concepts

A high-level, responsive, and accessible application for **AOA Legacy
Concepts**, a construction & project management company.

Built as **two coordinated deliverables**:

1. **Desktop app** — Tauri 2 (Rust) + React + TypeScript. Public marketing
   site, plus a password-protected admin panel for viewing contact-form
   submissions and creating PDF invoices.
2. **Web version** — Same React/TypeScript frontend deployed as a static SPA
   to Netlify, with a small TypeScript serverless function handling the
   contact form via Gmail SMTP. This is what gets you a public live URL.

---

## Tech stack

| Layer       | Technology                                                           |
| ----------- | -------------------------------------------------------------------- |
| Desktop     | Tauri 2 (Rust 2021 edition)                                          |
| Backend     | Rust — `tauri`, `serde`, `lettre` (SMTP), `argon2`, `printpdf`        |
| Frontend    | React 18, TypeScript 5, Vite 5                                       |
| Web hosting | Netlify (static SPA + a `@netlify/functions` TypeScript function)    |
| Email       | Gmail SMTP via App Password (works for both desktop and web)         |
| Auth        | Local Argon2id-hashed admin password; in-memory session token        |
| Persistence | JSON files in the OS-specific app local data dir                     |

## Features

### Public site
- Hero, About, Services, Projects gallery (category filter, accessible modal),
  Team, Contact.
- Dark / light themes with OS preference + persisted choice.
- Fully responsive, mobile-first; `prefers-reduced-motion` honoured.
- Accessibility: semantic landmarks, skip link, ARIA labelling, keyboard
  navigation, focus-trapped modals, visible focus rings, 44px+ tap targets.
- Validated contact form with inline accessible errors and a honeypot.
- **Desktop**: submission persisted locally **and** emailed via SMTP.
- **Web**: submission emailed by the Netlify function.

### Admin panel (desktop only)
- Opened via the **Admin** link in the footer or **Ctrl+Shift+A** (Cmd+Shift+A
  on macOS), also reachable via the `#admin` URL hash.
- **First-run setup** prompts the user to create an Argon2id-hashed password.
- **Submissions view** — lists all contact-form messages, newest first, with
  a one-click `mailto:` reply.
- **Invoices** — line-item builder with live subtotal/tax/total, optional
  notes, multiple currencies (₦/$/€/£). Saves locally and exports a
  formatted **PDF** to disk via `printpdf`.

## Project structure

```
.
├── index.html
├── netlify.toml                    # Netlify build + SPA redirects + headers
├── netlify/
│   └── functions/
│       └── contact.ts              # Serverless contact form -> Gmail SMTP
├── .env.example                    # Copy to .env (desktop dev only)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── projects/                   # Project imagery
│   └── team/                       # Team photos
├── src/                            # Frontend (TS + React)
│   ├── main.tsx
│   ├── App.tsx                     # Hash routing + Ctrl+Shift+A admin shortcut
│   ├── components/                 # Header, Reveal
│   ├── sections/                   # Hero, About, Services, Projects, Team,
│   │                               # Contact, Footer, Admin
│   ├── hooks/                      # useTheme, useInView
│   ├── lib/api.ts                  # Typed bridge: Tauri commands or fetch()
│   └── styles/global.css           # Design tokens + responsive styles
└── src-tauri/                      # Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── icons/icon.png
    └── src/
        ├── main.rs                 # Binary entrypoint
        ├── lib.rs                  # Tauri builder + command registration
        ├── error.rs                # AppError (Serialize -> JSON)
        ├── contact.rs              # Public contact: validate, persist, email
        ├── email.rs                # Gmail SMTP via lettre
        ├── auth.rs                 # Argon2id password + session tokens
        ├── invoices.rs             # Invoice CRUD + PDF export (printpdf)
        └── projects.rs             # Static project + company info
```

## Tauri commands (Rust ⇄ TypeScript)

All commands have matching TypeScript types in `src/lib/api.ts`.

| Command                     | Auth?  | Purpose                                  |
| --------------------------- | ------ | ---------------------------------------- |
| `get_company_info`          | public | Brand, contact, stats                    |
| `list_projects`             | public | Featured project portfolio               |
| `submit_contact`            | public | Validate, persist locally, email via SMTP |
| `admin_status`              | public | Is an admin password set yet?            |
| `set_admin_password`        | mixed  | First run: free. After: requires current |
| `verify_admin_password`     | public | Returns a fresh session token            |
| `logout`                    | public | Clears the in-memory token               |
| `list_contact_submissions`  | token  | Read persisted contact submissions       |
| `list_invoices`             | token  | List stored invoices                     |
| `create_invoice`            | token  | Validate + persist a new invoice         |
| `delete_invoice`            | token  | Remove an invoice by id                  |
| `export_invoice_pdf`        | token  | Render PDF → returns absolute file path  |

---

## Getting started (desktop)

### Prerequisites

- **Rust** stable (1.77+) — `rustup install stable`
- **Node** 20+ and **npm**
- **Tauri 2 system dependencies** (Linux):
  ```bash
  sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
      libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev \
      build-essential curl wget file pkg-config
  ```
  See <https://tauri.app/start/prerequisites/> for macOS / Windows.

### Configure email (optional but recommended)

```bash
cp .env.example .env
# edit .env and set SMTP_USER + SMTP_PASS
```

Get a **Google App Password**:

1. Enable 2-Step Verification on the Google account.
2. Visit <https://myaccount.google.com/apppasswords>.
3. Generate a 16-character app password and paste it as `SMTP_PASS`.

If `.env` is missing or `SMTP_USER`/`SMTP_PASS` are unset, the desktop app
still works — contact submissions are persisted locally but no email is sent.

### Install & run

```bash
npm install
npm run tauri:dev          # standard
npm run tauri:dev:wsl      # WSL — silences Mesa/EGL warnings, forces software GL
```

### Build production binaries

```bash
npm run tauri:build
# bundles -> src-tauri/target/release/bundle/
```

### Tests

```bash
cargo test --manifest-path src-tauri/Cargo.toml   # contact + auth + invoices unit tests
npm run build                                     # tsc --noEmit && vite build
```

### Where data is stored

| File                              | Purpose                          |
| --------------------------------- | -------------------------------- |
| `<app_local>/contact_submissions.json` | All contact form messages   |
| `<app_local>/admin.json`          | Argon2id-hashed admin password   |
| `<app_local>/invoices.json`       | All saved invoices               |
| `<app_local>/invoices/*.pdf`      | Exported invoice PDFs            |

`<app_local>` resolves to:

- **Linux**: `~/.local/share/com.aoalegacy.app/`
- **macOS**: `~/Library/Application Support/com.aoalegacy.app/`
- **Windows**: `%LOCALAPPDATA%\com.aoalegacy.app\`

---

## Deploying the live web link (Netlify)

The repo is wired up so a single `git push` deploys the marketing site
**plus** a working contact form to a free `*.netlify.app` URL.

### One-time setup

1. Push the repo to GitHub (or GitLab/Bitbucket).
2. Sign in at <https://app.netlify.com> and click **Add new site → Import an
   existing project**, then connect this repository.
3. Netlify auto-detects from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions: `netlify/functions`
4. Click **Deploy site**. You'll get a URL like
   `https://aoa-legacy-concepts.netlify.app` (you can rename it under
   **Site settings → Change site name**).

### Configure SMTP on Netlify

Add these in **Site settings → Environment variables**:

| Name             | Value                                         |
| ---------------- | --------------------------------------------- |
| `SMTP_USER`      | `aoalegacyconcepts@gmail.com`                |
| `SMTP_PASS`      | Your Google App Password (16 chars, no spaces)|
| `MAIL_TO`        | `aoalegacyconcepts@gmail.com`                |
| `MAIL_FROM_NAME` | `AOA Legacy Concepts` (optional)              |

Then **Deploys → Trigger deploy → Deploy site** so the function picks up
the new env vars.

### Custom domain (optional)

In **Site settings → Domain management → Add a custom domain**, point your
DNS at Netlify (they walk you through it). HTTPS is free and automatic.

### Local development for the web build

```bash
npm install -g netlify-cli           # one-time
netlify dev                          # serves Vite + functions on http://localhost:8888
```

`netlify dev` reads variables from `.env` automatically — the same file used
by the desktop app — so the contact form works end-to-end locally.

---

## Deploying desktop installers (optional)

If you want users to download a `.deb` / `.dmg` / `.msi`, the simplest path
is GitHub Releases:

1. `npm run tauri:build` on each target OS (or use the
   [`tauri-action`](https://github.com/tauri-apps/tauri-action) GitHub Action
   to cross-build via CI).
2. Upload the produced bundles from `src-tauri/target/release/bundle/` to a
   GitHub Release. Users download from the release page.

---

## Security notes

- **`.env` is gitignored.** Never commit SMTP credentials.
- Gmail App Passwords scope only to mail and can be revoked at any time
  from your Google account.
- The admin password is hashed with **Argon2id**; only the hash is stored.
- Session tokens are random, kept **in process memory only**, and reset on
  app restart.
- The Netlify function only sends mail via SMTP; it never returns SMTP
  errors verbatim to the client.

## License

Proprietary — © AOA Legacy Concepts. All rights reserved.
