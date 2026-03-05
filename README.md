## SketchArena

[View Demo on Loom](https://www.loom.com/share/a46ee1ed62dd4061b53946a55aa7f01c)

Modern real‑time drawing and guessing game inspired by skribbl.io, built with a React/Vite frontend and a Node/Socket.IO backend.

### Tech Stack

- **Frontend**: React 19, Vite, TypeScript, React Router, Socket.IO client
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Real‑time transport**: WebSockets via Socket.IO

### Architecture Overview

- **Frontend (`frontend/`)**
  - SPA created with Vite.
  - Routes:
    - `Home` – create or join a room.
    - `Lobby` – waiting room listing players, host can start game.
    - `Game` – main board with player list, canvas, timer, hints, and chat.
  - Uses `socket/socket.ts` to create a single Socket.IO client instance, shared across pages.
  - Game view layout:
    - **Top bar**: room info, global timer, round indicator.
    - **Left sidebar**: leaderboard, highlights current drawer and “you”.
    - **Center**: word selection/banner + drawing canvas.
    - **Right sidebar**: modern chat with system and player messages.

- **Backend (`backend/`)**
  - `src/server.ts` sets up an Express HTTP server and attaches a Socket.IO server.
  - `GameManager` / `Game` classes coordinate rooms, players, rounds, and scoring.
  - Socket events (high level):
    - Room lifecycle: `create_room`, `join_room`, `room_data`, `player_joined`, `player_left`.
    - Game lifecycle: `start_game`, `game_started`, `game_state`, `round_start`, `round_ready`, `round_end`, `game_over`.
    - Drawing: `draw_start`, `draw_move`, `draw_end`, `draw_tool`, `draw_undo`, `canvas_clear`, `draw_data`, `tool_update`, `undo_stroke`, `clear_canvas`.
    - Guessing/chat: `guess`, `guess_correct`, `chat_message`, `hint_update`, `timer_update`.

### Local Development

#### Prerequisites

- Node.js 18+ and npm

#### 1. Clone and install

```bash
git clone <your-repo-url> sketcharena
cd sketcharena

cd backend
npm install

cd ../frontend
npm install
```

#### 2. Environment variables

Backend (`backend/.env` – optional but recommended):

```bash
PORT=3000
FRONTEND_URL=http://localhost:5173
```

Frontend (`frontend/.env`):

```bash
VITE_BACKEND_URL=http://localhost:3000
```

If these are omitted, the code falls back to the localhost defaults shown above.

#### 3. Run in development

In one terminal (backend):

```bash
cd backend
npm run dev
```

In another terminal (frontend):

```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in the browser and create/join a room from the home screen.

### Production Build & Deployment

#### Build the frontend

```bash
cd frontend
npm run build
```

This produces a static production bundle in `frontend/dist`.

#### Build and run the backend

```bash
cd backend
npm run build      # compiles TypeScript to dist/
npm start          # runs node dist/server.js
```

The backend uses:

- **`PORT`** – port to listen on (default `3000`).
- **`FRONTEND_URL`** – allowed origin for CORS and Socket.IO (e.g. `https://your-frontend-domain.com`).

The frontend uses:

- **`VITE_BACKEND_URL`** – base URL for the Socket.IO client (e.g. `https://your-backend-domain.com`).

Set these in your deployment environment (Render, Railway, Fly.io, Heroku‑like platforms, etc.) so that:

- `FRONTEND_URL` points to the deployed frontend URL.
- `VITE_BACKEND_URL` points to the deployed backend URL.

#### Minimal verification checklist

1. **Frontend build**
   - Run `npm run build` in `frontend/` and ensure it completes without errors.
2. **Backend start**
   - Run `npm run build && npm start` in `backend/` and confirm the log prints the chosen port and frontend URL.
3. **End‑to‑end test**
   - With both services running, open the frontend, create a room, join from another tab, play through several rounds, and reach the Game Over screen.
   - Use the **Return to Lobby** button from the Game Over overlay to confirm players can safely return to the lobby and start a new game.
4. **Responsive UI**
   - Resize the browser between mobile (~375px), tablet (~768px), and desktop widths and verify:
     - Game grid collapses into a vertical layout on smaller viewports.
     - Chat and canvas remain usable without horizontal scrolling.

### Notes on Game Flow

- From **Home**, players either create a new room or join an existing one with a room code.
- In the **Lobby**, the host (crown icon) can start the game once enough players are present.
- The **Game** view cycles through phases:
  - `round_start` – drawer receives word options, others see a waiting state.
  - `drawing` – canvas unlocked for the drawer, others guess via chat; timer and hints update in real time.
  - `round_end` – shows the correct word and updates scores.
  - After the configured number of rounds, the game transitions to `game_over` and a podium overlay appears.
- From the **Game Over** overlay, players can **Return to Lobby** to queue up another game with the same room.

