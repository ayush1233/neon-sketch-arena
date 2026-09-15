const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createRoom, getRoom, addPlayer, removePlayer, getPublicState, clearTimers, getRandom } = require('./game');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
  cors: { origin: '*' },
});

const path = require('path');

// simple health check so the frontend can ping before connecting
app.get('/health', (_, res) => res.json({ ok: true }));

// Always serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// ---- helpers ----

function broadcastRoom(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  io.to(roomId).emit('room_state', getPublicState(room));
}

function nextTurn(roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  clearTimers(room);
  room.guessedPlayers.clear();
  room.drawHistory = [];
  room.revealedIndexes.clear();
  room.word = null;
  room.phase = 'choosing';

  // figure out who draws next (round-robin by insertion order)
  const playerIds = [...room.players.keys()];
  const curIndex = playerIds.indexOf(room.currentDrawer);
  const nextIndex = (curIndex + 1) % playerIds.length;

  // if we've looped back to the first player, it's a new round
  if (nextIndex === 0) {
    room.round++;
    if (room.round > room.settings.rounds) {
      room.phase = 'ended';
      broadcastRoom(roomId);
      return;
    }
  }

  room.currentDrawer = playerIds[nextIndex];

  if (room.customWords && room.customWords.length > 0) {
    const shuffled = [...room.customWords].sort(() => Math.random() - 0.5);
    room.wordOptions = shuffled.slice(0, 3);
    if (room.wordOptions.length < 3) {
      // pad with standard words if they didn't provide at least 3 custom words
      room.wordOptions.push(...getRandom(3 - room.wordOptions.length));
    }
  } else {
    room.wordOptions = getRandom(3);
  }

  broadcastRoom(roomId);

  // tell the drawer their word choices privately
  io.to(room.currentDrawer).emit('pick_word', { options: room.wordOptions });
}

function startDrawing(roomId, word) {
  const room = getRoom(roomId);
  if (!room) return;

  room.word = word;
  room.phase = 'drawing';
  room.drawHistory = [];
  room.revealedIndexes.clear();

  broadcastRoom(roomId);

  // hint reveal: show one random unrevealed letter every ~15s
  room.hintTimer = setInterval(() => {
    if (!room.word) return;
    const hidden = room.word.split('').reduce((acc, _, i) => {
      if (!room.revealedIndexes.has(i)) acc.push(i);
      return acc;
    }, []);
    if (hidden.length > 1) {
      const pick = hidden[Math.floor(Math.random() * hidden.length)];
      room.revealedIndexes.add(pick);
      // send updated hint to non-drawer players
      broadcastRoom(roomId);
    }
  }, 15000);

  // turn timer
  room.turnTimer = setTimeout(() => {
    endTurn(roomId);
  }, room.settings.drawTime * 1000);
}

function endTurn(roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  clearTimers(room);
  const revealedWord = room.word;
  room.phase = 'results';
  broadcastRoom(roomId);

  const allGuessed = room.players.size > 1 && room.guessedPlayers.size >= room.players.size - 1;

  // tell everyone the word
  io.to(roomId).emit('turn_ended', { 
    word: revealedWord, 
    reason: allGuessed ? 'all_guessed' : 'time_up' 
  });

  // wait 3s then go to next turn
  setTimeout(() => nextTurn(roomId), 3000);
}

// ---- socket events ----

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  socket.on('create_room', ({ playerName, settings }) => {
    const roomId = createRoom(socket.id, playerName, settings);
    socket.join(roomId);
    socket.emit('room_created', { roomId });
    broadcastRoom(roomId);
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    const result = addPlayer(roomId, socket.id, playerName);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }
    socket.join(roomId);
    socket.emit('room_joined', { roomId });
    broadcastRoom(roomId);
  });

  socket.on('start_game', ({ roomId, customWords }) => {
    const room = getRoom(roomId);
    if (!room || room.host !== socket.id || room.players.size < 1) return;

    if (customWords) {
      room.customWords = customWords.split(',').map(w => w.trim()).filter(w => w.length > 0);
    }

    room.phase = 'playing';
    room.round = 0;

    // kick off first turn - nextTurn increments round so start at 0
    const playerIds = [...room.players.keys()];
    room.currentDrawer = playerIds[playerIds.length - 1]; // nextTurn will move to index 0
    nextTurn(roomId);
  });

  socket.on('word_chosen', ({ roomId, word }) => {
    const room = getRoom(roomId);
    if (!room || room.currentDrawer !== socket.id) return;
    if (!room.wordOptions.includes(word)) return; // don't let them send arbitrary words

    startDrawing(roomId, word);
  });

  socket.on('draw_start', ({ roomId, x, y, color, size }) => {
    const room = getRoom(roomId);
    if (!room || room.currentDrawer !== socket.id || room.phase !== 'drawing') return;

    const stroke = { type: 'start', x, y, color, size };
    room.drawHistory.push(stroke);
    socket.to(roomId).emit('draw_start', stroke);
  });

  socket.on('draw_move', ({ roomId, x, y }) => {
    const room = getRoom(roomId);
    if (!room || room.currentDrawer !== socket.id || room.phase !== 'drawing') return;

    const stroke = { type: 'move', x, y };
    room.drawHistory.push(stroke);
    socket.to(roomId).emit('draw_move', stroke);
  });

  socket.on('draw_end', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || room.currentDrawer !== socket.id) return;
    room.drawHistory.push({ type: 'end' });
    socket.to(roomId).emit('draw_end');
  });

  socket.on('clear_canvas', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || room.currentDrawer !== socket.id) return;
    room.drawHistory = [];
    io.to(roomId).emit('clear_canvas');
  });

  socket.on('guess', ({ roomId, text }) => {
    const room = getRoom(roomId);
    if (!room || room.phase !== 'drawing') return;
    if (socket.id === room.currentDrawer) return; // drawer can't guess

    const isCorrect = text.trim().toLowerCase() === room.word.toLowerCase();

    if (isCorrect && !room.guessedPlayers.has(socket.id)) {
      room.guessedPlayers.add(socket.id);

      // score: more points for guessing early (based on remaining guessers)
      const remaining = room.players.size - 1 - room.guessedPlayers.size;
      const points = 100 + remaining * 20;
      room.players.get(socket.id).score += points;

      // drawer also gets points per correct guess
      room.players.get(room.currentDrawer).score += 30;

      // broadcast the correct guess as a system chat message (don't reveal word)
      io.to(roomId).emit('chat', {
        type: 'system',
        text: `${room.players.get(socket.id).name} guessed it! (+${points})`,
      });

      broadcastRoom(roomId);

      // if everyone guessed, end the turn early
      if (room.guessedPlayers.size === room.players.size - 1) {
        endTurn(roomId);
      }
    } else {
      // broadcast guess as chat for everyone to see (except the actual word if close)
      const displayText = isCorrect ? '...' : text; // already handled above if correct
      io.to(roomId).emit('chat', {
        type: 'player',
        playerId: socket.id,
        playerName: room.players.get(socket.id)?.name,
        text: displayText,
      });
    }
  });

  socket.on('chat', ({ roomId, text }) => {
    const room = getRoom(roomId);
    if (!room) return;
    // during drawing phase, chat doubles as guessing - handled above
    // this handles lobby/results chat
    if (room.phase !== 'drawing') {
      io.to(roomId).emit('chat', {
        type: 'player',
        playerId: socket.id,
        playerName: room.players.get(socket.id)?.name,
        text,
      });
    }
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      removePlayer(roomId, socket.id);
      broadcastRoom(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log('disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});
