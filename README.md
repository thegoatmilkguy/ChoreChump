# ChoreChump 🧹✨

**ChoreChump** is a self-hosted, mobile-friendly Progressive Web App (PWA) for families to track chores organized by **rooms and what will make each room clean**.

## Key Features

- **Room-First Cleanliness Model**: Each room has a live **Room Cleanliness Meter (0–100%)** weighted by chore effort size (`Quick = 1x`, `Medium = 2x`, `Big = 3x`).
- **Continuous Chore Decay**: Every chore has its own decay rate (e.g., `24h` for making the bed, `168h` for weekly vacuuming/laundry).
  - **> 75% Health (Fresh / Cooldown)**: Recently completed (< 25% of decay time elapsed).
  - **50%–75% Health (Top-Up Eligible)**: Can be completed early for full points to top the room back up to 100%.
  - **≤ 50% Health (Actionable / Needs Attention)**: Highlighted under *"What will make this room clean"*. A room earns the **CLEAN!** badge whenever no chores in that room are ≤ 50% health.
- **Parent Manual Decay Override**: Parents can slide any chore's decay bar to any percentage (or tap presets like `Messy 0%`, `Needs Doing 35%`, `100% Fresh`, or `Not Done! Dock Last Points`).
- **Built-In Room Templates**: One-click add pre-built templates for *Kid's Bedroom*, *Kitchen*, *Living Room*, *Bathroom*, *Playroom*, *Master Bedroom*, and *Entryway & Yard*.
- **Flexible Chore Assignment**: Assign chores to a specific person, rotate automatically among selected kids, or leave them *Up for Grabs*.
- **Points, Streaks & Rewards Store**: Kids earn points and build daily streaks to redeem parent-defined rewards.
- **Netflix-Style Profile Switcher & Parent PIN**: Fast avatar switching on shared tablets or phones, with a 4-digit Parent PIN (default: `1234`).
- **Real-Time Multi-Device Sync**: Server-Sent Events (`/api/events`) keep wall tablets and parent phones in sync automatically.

---

## Quick Start with Docker Compose (Recommended)

```bash
docker compose up -d --build
```

Then open **`http://localhost:3000`** (or your server's LAN IP on phones/tablets).
- SQLite database is persisted in `./data/chorechump.db`.
- Default Parent PIN: **`1234`** (changeable in Parent Mode → Approvals & Family).

---

## Quick Start in an LXC Container (Proxmox / Linux)

Inside a Debian, Ubuntu, or Alpine LXC container:

```bash
chmod +x lxc-install.sh
sudo ./lxc-install.sh
```

This installs Node.js 20, builds the frontend and backend, stores the SQLite database in `/var/lib/chorechump/chorechump.db`, and enables the `chorechump` systemd service on port `3000`.

---

## Local Development

```bash
npm install
npm test
npm run dev
```
