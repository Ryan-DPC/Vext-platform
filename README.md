# VEXT Platform & Game Studio

![Vext Banner](https://via.placeholder.com/800x200.png?text=Vext+Platform+%26+Game+Studio)

**The Next-Gen Decentralized Gaming Platform & 2D MMORPG**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Tauri](https://img.shields.io/badge/Tauri-2.0-blue)
![Unity](https://img.shields.io/badge/Unity-6-black)
![Bun](https://img.shields.io/badge/Bun-1.0-orange)
![Vue 3](https://img.shields.io/badge/Vue-3.0-green)

## 🚀 Overview

Vext is a dual-purpose project:

1.  **Vext Platform**: A modern game distribution and social platform (Tauri/Vue).
2.  **Vext MMORPG**: A 2D Top-Down Multiplayer RPG (Unity) currently in development.

## 📂 Project Structure

| Directory           | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| **`apps/frontend`** | The Desktop Launcher & Platform (Tauri + Vue 3).                 |
| **`apps/backend`**  | REST API for Authentication, Marketplace, and Users (Elysia.js). |
| **`apps/server`**   | WebSocket Server for Chat and Lobbies (Elysia.js).               |
| **`apps/web`**      | Web Portal (Next.js/Vue).                                        |
| **`games/`**        | Contains the Unity Project for the MMORPG.                       |

## 🕹️ Vext MMORPG (In Development)

A 2D Top-Down MMORPG featuring:

- Real-time multiplayer combat.
- Class-based system (Warrior, Mage, Ranger, etc.).
- Open world exploration.
- Built with **Unity**.

## 🛠️ Getting Started

### Prerequisites

- **Bun** (Latest version) - For Platform & Backend.
- **Rust** (Required for Tauri).
- **Unity Hub & Editor** - For the MMORPG.

### Running the Platform (Launcher)

1.  **Install Dependencies**

    ```bash
    bun install
    ```

2.  **Start Frontend (Tauri)**
    ```bash
    cd apps/frontend
    bun run tauri dev
    ```

### Running the Game

Open the `games/[ProjectName]` folder in **Unity Hub**.

## 🤝 Contributing

We welcome contributions! Please check the `docs/` folder for guidelines.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
