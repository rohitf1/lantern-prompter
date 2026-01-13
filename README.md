# Lantern Prompter

<p align="center">
  <strong>Local-network teleprompter with a real-time remote controller.</strong>
</p>

<p align="center">
  <video src="public/demo.mp4" controls muted playsinline style="max-width: 100%; border-radius: 16px;"></video>
</p>

## Why I built this
I tried a bunch of teleprompter apps online. I wanted to control one phone with another, but most tools were bloated and many required subscriptions. So I built a fast, local-only prompter that works on the same Wi‑Fi with no logins or cloud.

## Features
- **Script Library**: create, edit, duplicate, delete, search, import/export JSON.
- **Prompter View**: smooth auto-scroll, play/pause, speed, font size, mirror mode, alignment and nudging, manual scroll.
- **Remote Controller**: big buttons, haptics + beep, live state sync.
- **Multi-remote**: multiple remotes can control the same prompter session.
- **Local-first**: scripts + settings persist in IndexedDB on the host device.

## Getting Started
### Requirements
- Node.js 18+ (recommended)
- npm

### Install
```bash
npm install
```

### Run (dev)
```bash
npm run dev
```
If port 3000 is busy:
```bash
PORT=3001 npm run dev
```

Open the app:
- `http://localhost:3000` (or `http://localhost:3001`)

## How to Use
### 1) Choose mode
Open `/` and choose:
- **Teleprompter** → goes to `/library`
- **Remote** → goes to `/remote`

### 2) Create a script
In **Library**:
- Create or paste your script
- It auto‑saves (and persists after refresh)
- Click **Open in Prompter** for the selected script

### 3) Connect the remote
In **Prompter**:
- A session ID is generated automatically
- You can open the remote link or scan the QR code
- Example:
  - `http://<LAN-IP>:3001/remote?session=ABC123`

In **Remote**:
- Paste the session link or session ID and tap **Join**
- You can connect **multiple remotes** to the same session

> Tip: If the remote won’t connect, check that both devices are on the same Wi‑Fi (some routers isolate devices).

## Remote Controls
- **Play/Pause**
- **Speed +/‑**
- **Go to Top**
- **Nudge Up/Down** (pauses playback before nudging)
- **Text tools** (dropdown):
  - Font family (5 fast common fonts)
  - Text color picker
  - Alignment left/center/right + fine nudge
  - Mirror toggle

## Persistence & Storage
- Scripts and settings are saved in **IndexedDB** on the host device.
- Data survives refresh/restart (unless you clear site data).
- You can **export/import scripts** via JSON in the Library.

## Networking & Sessions
- Works on the same LAN/Wi‑Fi.
- The app auto-detects the host LAN IP for remote links.
- **One prompter per session** (if two prompters open the same session, the latest one takes control).
- **Multiple remotes per session** are allowed.

## Tech Stack
- Next.js (App Router) + TypeScript
- Socket.IO for real-time control
- IndexedDB for local storage
- requestAnimationFrame-based scrolling engine

## Project Structure
```
app/               # routes: /, /library, /prompter, /remote
app/api/host-ip    # returns host LAN IP
modules/storage    # IndexedDB access
modules/sync       # Socket.IO client
types/             # shared message types
server.mjs         # custom Next.js + Socket.IO server
```

## Scripts
```bash
npm run dev     # start dev server (Socket.IO + Next.js)
npm run build   # build for production
npm start       # start production server
npm run lint    # lint
```

## Notes
- Remote haptics + beep require user interaction to unlock audio on some mobile browsers.
- iOS Safari does not support vibration.

---
Built for clean, local control without subscriptions.
