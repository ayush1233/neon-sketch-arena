# Architecture Overview

This document outlines the high-level architecture and data flow for the **Neon Sketch Arena** application.

## 1. Core Technologies
- **Frontend Layer:** React.js handles the component state (game rooms, chat UI, canvas wrapper).
- **Canvas Layer:** HTML5 Canvas API captures mouse/touch movements to generate drawing strokes.
- **WebSocket Layer:** Socket.IO facilitates real-time bi-directional communication between clients and the server.
- **Backend Layer:** Node.js + Express maintains the in-memory game state and handles Socket.IO events.

---

## 2. Component Integration & Data Flow

### A. WebSockets (Socket.IO)
Socket.IO acts as the central nervous system. When a player connects, they are assigned a unique socket ID.
- **Rooms:** Players join specific "Rooms" (e.g., `socket.join(roomId)`). This allows the server to broadcast drawing strokes and chat messages only to the relevant players.
- **Event Listeners:** The backend listens for events like `draw_move`, `guess`, and `word_chosen`.

### B. The Drawing Pipeline (Canvas + WebSockets)
1. **Capture:** When the "Drawer" moves their mouse, the frontend HTML5 Canvas fires `onMouseMove` events.
2. **Emit:** The React component captures the coordinates (X, Y), color, and brush size, and emits a `draw_data` event to the server.
3. **Broadcast:** The server receives the `draw_data` and instantly broadcasts it via `io.to(roomId).emit('draw_data', strokeData)` to all other players in the room.
4. **Render:** The guessers' React apps receive the event and programmatically draw the line on their local Canvas using `context.lineTo(X, Y)`.

### C. Game Logic & State Management
The Node.js server acts as the single source of truth for the game state.
- **State Object:** The server holds an in-memory object mapping `roomId` to a game state object (players, current drawer, chosen word, timer, phase).
- **Phases:** The game cycles through phases: `lobby` ➔ `word_selection` ➔ `drawing` ➔ `round_end` ➔ `game_over`.
- **Word Matching:** When a guesser types in the chat, the server intercepts the `chat` event. It checks the text against the active word (using `.trim().toLowerCase()`).
- **Scoring:** If matched, the server awards points based on the time remaining, emits a `correct_guess` notification, and updates the leaderboard.

---

## 3. Deployment Flow (AWS Elastic Beanstalk)
The application is deployed using a unified approach to optimize for WebSockets without requiring a Redis adapter.
- The React frontend is compiled into a static `dist` bundle.
- The Node.js Express server acts as both the static file host (`app.use(express.static(...))`) and the WebSocket upgrade server (`new Server(httpServer)`).
- Deployed on **AWS Elastic Beanstalk (Single Instance)** to ensure all WebSockets route to the exact same server memory space, completely bypassing Load Balancer connection drops.
