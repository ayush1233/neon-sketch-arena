// game state manager - keeps track of rooms, players, turns
// ponytail: plain objects and maps, no class hierarchy needed

const { getRandom } = require('./words');

// rooms: Map<roomId, RoomState>
const rooms = new Map();

function makeRoomId() {
  // 6 char uppercase code, good enough for ~300M combos
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getHint(word, revealed) {
  // show revealed letters, hide the rest with underscores
  return word.split('').map((ch, i) => revealed.has(i) ? ch : '_').join(' ');
}

function createRoom(hostId, hostName, settings = {}) {
  const id = makeRoomId();
  rooms.set(id, {
    id,
    host: hostId,
    players: new Map([[hostId, { id: hostId, name: hostName, score: 0, ready: false }]]),
    settings: {
      maxPlayers: settings.maxPlayers || 8,
      rounds: settings.rounds || 3,
      drawTime: settings.drawTime || 80,
    },
    phase: 'lobby',  // lobby | choosing | drawing | results | ended
    round: 0,
    currentDrawer: null,
    word: null,
    wordOptions: [],
    revealedIndexes: new Set(),
    guessedPlayers: new Set(),
    drawHistory: [],  // store strokes so late joiners can see current state
    turnTimer: null,
    hintTimer: null,
  });
  return id;
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function addPlayer(roomId, playerId, playerName) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.players.size >= room.settings.maxPlayers) return { error: 'Room is full' };
  if (room.phase !== 'lobby') return { error: 'Game already started' };

  room.players.set(playerId, { id: playerId, name: playerName, score: 0, ready: false });
  return { ok: true };
}

function removePlayer(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.delete(playerId);
  room.guessedPlayers.delete(playerId);

  // if room empty, clean it up
  if (room.players.size === 0) {
    clearTimers(room);
    rooms.delete(roomId);
    return;
  }

  // if host left, pick a new one
  if (room.host === playerId) {
    room.host = room.players.keys().next().value;
  }
}

function getPublicState(room) {
  return {
    id: room.id,
    host: room.host,
    phase: room.phase,
    round: room.round,
    settings: room.settings,
    players: [...room.players.values()].map(p => ({
      ...p,
      guessed: room.guessedPlayers.has(p.id),
    })),
    currentDrawer: room.currentDrawer,
    wordHint: room.word ? getHint(room.word, room.revealedIndexes) : null,
    wordLength: room.word ? room.word.length : null,
    drawHistory: room.drawHistory,
  };
}

function clearTimers(room) {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  if (room.hintTimer) clearInterval(room.hintTimer);
  room.turnTimer = null;
  room.hintTimer = null;
}

module.exports = { createRoom, getRoom, addPlayer, removePlayer, getPublicState, clearTimers, getRandom };
