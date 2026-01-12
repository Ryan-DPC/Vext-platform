# 🎮 Vext Game Integration Standards

This document outlines the **Standard Operating Procedures (SOP)** for integrating a game into the Vext ecosystem.
By following these standards, your game will be automatically compatible with our import tools and launcher.

## 1. Repository Structure

Your GitHub repository must follow this structure:

```
my-cool-game/
├── vext.json           # [REQUIRED] Game Manifest
├── README.md           # [OPTIONAL] GitHub Readme
├── GAME_GUIDE.md       # [OPTIONAL] Gameplay guide visible in launcher
├── assets/
│   ├── banner.jpg      # [REQUIRED] Game Cover (800x600 recommended)
│   └── background.jpg  # [OPTIONAL] Hero background
└── src/                # Source code
```

## 2. The Manifest (`vext.json`)

Place a `vext.json` file at the **root** of your repository. This file is the source of truth for your game's metadata.

**Template:**
```json
{
  "name": "My Cool Game",
  "folder_name": "my_cool_game",
  "description": "An epic adventure using the Vext engine.",
  "type": "rust", // [DEPRECATED] Optional, ignored.
  "genre": "RPG", // [REQUIRED] Defined by developer (e.g., RPG, FPS, Strategy)
  "price": 0,    // [REQUIRED] Price in Vext Coins (0 for Free)
  "developer": "Your Name",
  "version": "1.0.0", // [OPTIONAL] The source of truth is the GitHub Release Tag.
  "executable": "Game.exe",
  "is_multiplayer": false,
  "max_players": 1,
  "image_url": "https://raw.githubusercontent.com/YourUser/YourRepo/main/assets/banner.jpg"
}
```

**Key Fields:**
*   `folder_name`: **CRITICAL**. Must be unique, lowercase, no spaces (use underscores). This is the ID used in our database and local installation folder.
*   `executable`: The name of your main game file (e.g., `MyGame.exe`).
*   `image_url`: Direct link to your banner image. We recommend committing the image to your repo and using the `raw.githubusercontent.com` link.

## 3. Releasing Your Game

To make your game installable, you **must create a GitHub Release**.

1.  **Build your game**: Compile it to a single executable or folder.
2.  **Zip it**: Compress your game files into a `.zip` archive.
    *   **Naming Convention**: `[folder_name]_v[version]_[platform].zip`
    *   Example: `my_cool_game_v1.0.0_windows_x64.zip`
3.  **Create Release**:
    *   Go to GitHub -> Releases -> Draft a new release.
    *   **Tag version**: `v1.0.0` (Must match `vext.json` version).
    *   **Title**: `Release v1.0.0`.
    *   **Attach the Zip**: Drag and drop your zip file.
    *   **Publish**.

## 4. How to Import

Once your repo is set up and a release is published, simply provide the GitHub Repository URL to the Vext Administrator.

**Admin Command:**
```bash
bun run import <GITHUB_URL>
```

The system will:
1.  Fetch `vext.json`.
2.  Find the latest Release.
3.  Link the Zip download to the Installer.
4.  Update the Database & Storefront immediately.

---
**Checklist for Developers:**
- [ ] `vext.json` is at the root.
- [ ] `folder_name` is snake_case and unique.
- [ ] Image link in `vext.json` is valid (test it in a browser).
- [ ] GitHub Release exists with a `.zip` asset attached.
