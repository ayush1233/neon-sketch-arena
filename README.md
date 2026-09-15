# Neon Sketch Arena (skribbl.io Clone)

A full-stack, real-time multiplayer drawing and guessing game inspired by skribbl.io. 
Built as an end-to-end web application featuring live canvas synchronization, Socket.IO rooms, and real-time chat.

## 🚀 Live Demo
**Play the game here:** [http://neonsketch.ap-south-1.elasticbeanstalk.com/](http://neonsketch.ap-south-1.elasticbeanstalk.com/)

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite
- **Canvas:** HTML5 Canvas API
- **Backend:** Node.js + Express
- **Real-Time Sync:** Socket.IO (WebSockets)
- **Deployment:** AWS Elastic Beanstalk (Amazon Linux 2023 / Node.js 22)

---

## 🎮 Features

### Core Requirements
* ✅ **Multiplayer Rooms:** Host and join private or public rooms. Configurable max players, rounds, and draw time.
* ✅ **Turn-Based Gameplay:** Rotate drawer and guessers each round seamlessly.
* ✅ **Real-time Canvas Sync:** 1-to-1 stroke broadcasting so everyone sees drawing instantly via WebSockets.
* ✅ **Word System:** Drawer picks 1 of 3 words; guessers see blank tile hints and attempt to guess in the chat.
* ✅ **Scoring System:** Points awarded for correct guesses based on time. Leaderboard shown at game end.
* ✅ **WebSockets:** Real-time sync for drawing, guesses, chat, and game state.

### Drawing Tools & UX
* ✅ **Complete Toolset:** Brush size, color picker, eraser, undo, and clear canvas (TNT).
* ✅ **Mobile Support:** Touch-screen drawing support (`onTouchMove`) with a fully responsive layout that stacks on mobile devices.
* ✅ **Chat System:** General chat + correct guess notifications that filter out the answer.

---

## 💻 Local Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- npm

### 1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd web3task
\`\`\`

### 2. Install dependencies & Run Development Servers
The project is split into two folders: `frontend` and `backend`.

**Start the Backend (Port 3001)**
\`\`\`bash
cd backend
npm install
npm start
\`\`\`

**Start the Frontend (Port 5173)**
Open a new terminal window:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

### 3. Open in Browser
Visit `http://localhost:5173` to play locally. Open multiple tabs to simulate multiple players!

---

## ☁️ Deployment Architecture
The application is unified into a single Node.js process for production to minimize infrastructure costs while maximizing WebSocket performance.

1. **Static Build:** The React frontend is compiled into static assets (`frontend/dist`) using Vite.
2. **Unified Server:** Express serves the static React build while simultaneously handling Socket.IO WebSocket upgrades on the exact same HTTP port.
3. **AWS Elastic Beanstalk:** Deployed as a single EC2 instance, avoiding ALB costs while retaining high-performance WebSocket persistence.
