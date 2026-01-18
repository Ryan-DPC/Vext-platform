# Vext Launcher Auto-Update Guide

This guide explains how to fully enable the auto-update system for the Vext Launcher. The code integration is already done, but you need to generate security keys and set up the backend endpoints to serve the updates.

## 1. Generate Security Keys (One-Time Setup)

Tauri requires Ed25519 keys to sign updates. This ensures clients only install valid updates from you.

1.  Run the generation command inside `apps/frontend/src-tauri`:
    ```bash
    cd apps/frontend/src-tauri
    npm run tauri signer generate -w tauri.conf.json
    ```
    *(Or using cargo directly: `cargo tauri signer generate -w tauri.conf.json`)*

2.  **Output**:
    - It will automatically update `tauri.conf.json` with the **Public Key**.
    - It will assume you have the **Private Key** saved safely (usually in `~/.tauri/myapp.key` or environment variables).
    - **KEEP THE PRIVATE KEY SECRET!** It is used to sign your releases.

## 2. Backend Endpoint (`/updater/...`)

The launcher is configured to check:
`https://vext-backend-gur7.onrender.com/updater/{{target}}/{{current_version}}`

### Request Parameters
- `target`: The platform architecture (e.g., `windows-x86_64`, `darwin-aarch64`).
- `current_version`: The current version of the launcher (e.g., `0.1.0`).

### Expected Response (JSON)
Your backend must return a JSON response.
- **If up to date**: Return status `204 No Content`.
- **If update available**: Return status `200 OK` with this JSON body:

```json
{
  "version": "1.0.0",
  "notes": "Display-ready release notes (e.g., 'Fixed login bug').",
  "pub_date": "2026-01-19T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "CONTENT_OF_THE_SIG_FILE",
      "url": "https://your-cdn.com/releases/vext-1.0.0-setup.exe"
    }
  }
}
```

## 3. Building & Publishing a Release

When you are ready to ship version `1.0.0`:

1.  **Update Version**: Change `"version": "1.0.0"` in `apps/frontend/src-tauri/tauri.conf.json`.
2.  **Build**:
    ```bash
    npm run tauri build
    ```
    This will generate:
    - `VEXT_1.0.0_x64_en-US.msi` (Installer)
    - `VEXT_1.0.0_x64_en-US.msi.zip` (Update artifact)
    - `VEXT_1.0.0_x64_en-US.msi.zip.sig` (Signature file)

3.  **Upload**:
    - Upload the `.msi.zip` and `.sig` files to your hosting server (S3, Cloudinary, GitHub Releases, etc.).

4.  **Update Backend**:
    - Update your backend database/logic to serve the new version JSON.
    - Put the content of `.sig` file into the `signature` field of the JSON.
    - Put the URL of the `.zip` file into the `url` field.

## 4. Testing

1.  Run the app locally with `npm run tauri dev`.
2.  Ensure your backend returns a version *higher* than `0.1.0`.
3.  The "Update Available" popup should appear on startup.
