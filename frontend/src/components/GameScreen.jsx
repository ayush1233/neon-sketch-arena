import { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import DrawingCanvas from './DrawingCanvas';
import Confetti from './Confetti';

const AVATAR_COLORS = ['#a855f7', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#f97316', '#14b8a6'];
function getColor(name) {
  let h = 0;
  for (let c of (name || '?')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ---- Timer Ring Component ----
function TimerRing({ timeLeft, total }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / total;
  const offset = circumference * (1 - progress);

  // Color transitions: green → yellow → red
  let color = '#10b981';
  if (timeLeft <= total * 0.25) color = '#ff3333';
  else if (timeLeft <= total * 0.5) color = '#f59e0b';

  return (
    <div className="timer-ring" style={{ width: '64px', height: '64px' }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        {/* Background track */}
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        {/* Progress ring */}
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s',
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      <span className={`timer-ring-text ${timeLeft <= 10 ? 'timer-warn' : ''}`} style={{ color }}>
        {timeLeft}
      </span>
    </div>
  );
}

// ---- Letter Tiles Component ----
function LetterTiles({ hint, wordLength }) {
  if (!hint) return null;

  // hint is like "_ _ c _ t" — parse individual characters
  const letters = hint.split(' ');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '3px' }}>
      {letters.map((ch, i) => (
        <div
          key={i}
          className={`letter-tile ${ch !== '_' ? 'revealed' : ''} ${ch === ' ' ? 'space' : ''}`}
        >
          {ch === '_' ? '' : ch}
        </div>
      ))}
      {wordLength && (
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '7px',
          color: 'var(--text-muted)',
          alignSelf: 'center',
          marginLeft: '8px',
        }}>
          {wordLength}
        </div>
      )}
    </div>
  );
}

export default function GameScreen({ room, myId, wordOptions, setWordOptions }) {
  const [messages, setMessages] = useState([]);
  const [guess, setGuess] = useState('');
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [scoreFloats, setScoreFloats] = useState([]);
  const [timeLeft, setTimeLeft] = useState(room.settings.drawTime);
  const [showFlash, setShowFlash] = useState(false);
  const chatBottomRef = useRef(null);
  const timerRef = useRef(null);

  const isDrawer = room.currentDrawer === myId;

  // local countdown timer
  useEffect(() => {
    clearInterval(timerRef.current);
    if (room.phase === 'drawing') {
      setTimeLeft(room.settings.drawTime);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [room.phase, room.currentDrawer, room.settings.drawTime]);

  // socket event listeners
  useEffect(() => {
    function onChat(msg) {
      setMessages(prev => [...prev.slice(-99), msg]);
      if (msg.type === 'system' && msg.text.includes('guessed')) {
        const me = room.players.find(p => p.id === myId);
        if (me && msg.text.includes(me.name)) {
          setConfettiTrigger(t => t + 1);
          // screen flash
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 200);
        }
        const match = msg.text.match(/\+(\d+)/);
        if (match) {
          const pts = match[0];
          const id = Date.now();
          setScoreFloats(prev => [...prev, { id, pts }]);
          setTimeout(() => setScoreFloats(prev => prev.filter(f => f.id !== id)), 2000);
        }
      }
    }

    function onTurnEnded({ word, reason }) {
      const text = reason === 'all_guessed' 
        ? `EVERYONE GUESSED IT! WORD: "${word.toUpperCase()}"`
        : `TIME UP! WORD: "${word.toUpperCase()}"`;
        
      setMessages(prev => [...prev, {
        type: 'system',
        text,
        style: 'amber',
      }]);
    }

    socket.on('chat', onChat);
    socket.on('turn_ended', onTurnEnded);

    return () => {
      socket.off('chat', onChat);
      socket.off('turn_ended', onTurnEnded);
    };
  }, [myId, room.players]);

  // auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendGuess(e) {
    e.preventDefault();
    if (!guess.trim()) return;
    if (room.phase === 'drawing') {
      socket.emit('guess', { roomId: room.id, text: guess.trim() });
    } else {
      socket.emit('chat', { roomId: room.id, text: guess.trim() });
    }
    setGuess('');
  }

  function chooseWord(word) {
    socket.emit('word_chosen', { roomId: room.id, word });
    setWordOptions(null);
  }

  function leaveGame() {
    socket.disconnect();
    window.location.reload();
  }

  const drawerName = room.players.find(p => p.id === room.currentDrawer)?.name || '?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-deep)' }}>
      <Confetti trigger={confettiTrigger} />
      {showFlash && <div className="screen-flash" />}

      {/* Red vignette warning when timer is low */}
      {room.phase === 'drawing' && timeLeft <= 10 && timeLeft > 0 && (
        <div className="vignette-warn" />
      )}

      {/* ===== TOP HUD BAR ===== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '8px 16px',
        background: 'var(--surface-1)',
        borderBottom: '3px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Logo */}
        <span style={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: '16px',
          color: '#fff',
          textShadow: '0 0 10px rgba(168, 85, 247, 0.5), 2px 2px 0 rgba(0,0,0,0.5)',
          flexShrink: 0,
        }}>
          ✏️ SKRIBBL
        </span>

        {/* Center area */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Round */}
          <div style={{ textAlign: 'center' }}>
            <div className="game-label" style={{ fontSize: '7px' }}>ROUND</div>
            <div style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '14px',
              color: 'var(--cyan)',
              textShadow: '0 0 8px rgba(6, 182, 212, 0.4)',
            }}>
              {room.round}/{room.settings.rounds}
            </div>
          </div>

          {/* Timer Ring */}
          {room.phase === 'drawing' && (
            <TimerRing timeLeft={timeLeft} total={room.settings.drawTime} />
          )}

          {/* Word hint as letter tiles */}
          {room.wordHint && !isDrawer && (
            <LetterTiles hint={room.wordHint} wordLength={room.wordLength} />
          )}

          {/* Drawer's word (shown to drawer) */}
          {isDrawer && room.phase === 'drawing' && (
            <div style={{ textAlign: 'center' }}>
              <div className="game-label" style={{ fontSize: '7px', marginBottom: '4px' }}>YOUR WORD</div>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '16px',
                color: 'var(--xp-gold)',
                textShadow: '0 0 12px rgba(255, 215, 0, 0.5), 2px 2px 0 rgba(0,0,0,0.5)',
              }}>
                {/* The word is in wordHint for the drawer - reconstruct from hint */}
                {room.wordHint?.replace(/ /g, '')}
              </div>
            </div>
          )}

          {/* Who's drawing */}
          {room.phase === 'drawing' && (
            <div style={{ textAlign: 'center' }}>
              <div className="game-label" style={{ fontSize: '7px' }}>
                {isDrawer ? '🖌️ YOU DRAW' : `🖌️ ${drawerName.toUpperCase()}`}
              </div>
            </div>
          )}
        </div>

        {/* Leave button */}
        <button className="btn-danger" onClick={leaveGame} style={{ flexShrink: 0, fontSize: '9px', padding: '8px 12px' }}>
          ✕ QUIT
        </button>
      </div>

      {/* ===== MAIN GAME AREA ===== */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT: LEADERBOARD */}
        <div style={{
          width: '200px',
          flexShrink: 0,
          padding: '12px',
          overflow: 'auto',
          background: 'var(--surface-1)',
          borderRight: '3px solid rgba(255, 255, 255, 0.06)',
          boxShadow: 'inset -2px 0 0 rgba(0,0,0,0.3)',
        }}>
          <div className="game-label" style={{
            fontSize: '8px',
            marginBottom: '12px',
            textAlign: 'center',
            color: 'var(--xp-gold)',
            textShadow: '0 0 8px rgba(255,215,0,0.3)',
          }}>
            🏆 LEADERBOARD
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
            {/* Score floats */}
            {scoreFloats.map(f => (
              <div key={f.id} className="score-float" style={{ top: '50%', left: '50%' }}>{f.pts}</div>
            ))}
            {[...room.players]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div
                  key={p.id}
                  className={`leaderboard-row ${p.id === room.currentDrawer ? 'is-drawer' : ''} ${p.guessed ? 'guessed' : ''}`}
                >
                  <span style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '10px',
                    width: '20px',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <div style={{
                    width: '24px', height: '24px',
                    background: getColor(p.name) + '33', color: getColor(p.name),
                    border: `2px solid ${getColor(p.name)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '10px', flexShrink: 0,
                  }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: p.id === myId ? 'var(--cyan)' : 'var(--text)',
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '8px',
                      color: 'var(--xp-gold)',
                      textShadow: '0 0 6px rgba(255,215,0,0.3)',
                    }}>
                      {p.score}
                    </div>
                  </div>
                  {p.id === room.currentDrawer && <span style={{ fontSize: '12px' }} title="Drawing">🖌️</span>}
                  {p.guessed && p.id !== room.currentDrawer && (
                    <span style={{ color: 'var(--rare-green)', fontSize: '12px', textShadow: '0 0 6px rgba(85,255,85,0.5)' }} title="Guessed!">✓</span>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* CENTER: CANVAS */}
        <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'auto', minWidth: 0 }}>
          {/* Word selection overlay */}
          {room.phase === 'choosing' && room.currentDrawer === myId && wordOptions && (
            <div className="modal-overlay">
              <div className="modal-box" style={{ textAlign: 'center', maxWidth: '600px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
                <h2 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '24px',
                  fontWeight: 800,
                  marginBottom: '6px',
                  textShadow: '0 0 15px rgba(168,85,247,0.5), 3px 3px 0 rgba(0,0,0,0.5)',
                }}>
                  CHOOSE YOUR WORD!
                </h2>
                <p className="game-label" style={{ marginBottom: '24px' }}>
                  PICK ONE TO DRAW
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {wordOptions.map((w, i) => (
                    <button key={i} className="word-card" onClick={() => chooseWord(w)}
                      style={{ flex: '1 1 140px', maxWidth: '180px' }}>
                      {w.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Waiting for word choice */}
          {room.phase === 'choosing' && room.currentDrawer !== myId && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: 1,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '12px',
              color: 'var(--text-muted)',
              gap: '10px',
            }}>
              <span style={{ fontSize: '20px', animation: 'bob 1.5s ease-in-out infinite' }}>⏳</span>
              {drawerName.toUpperCase()} IS CHOOSING...
            </div>
          )}

          {/* Drawing canvas */}
          {(room.phase === 'drawing' || room.phase === 'results') && (
            <DrawingCanvas
              roomId={room.id}
              isDrawer={isDrawer}
              drawHistory={room.drawHistory}
            />
          )}
        </div>

        {/* RIGHT: CHAT */}
        <div style={{
          width: '260px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-1)',
          borderLeft: '3px solid rgba(255, 255, 255, 0.06)',
          boxShadow: 'inset 2px 0 0 rgba(0,0,0,0.3)',
        }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '2px solid rgba(255, 255, 255, 0.06)',
          }}>
            <span className="game-label" style={{ fontSize: '8px', color: 'var(--cyan)', textShadow: '0 0 6px rgba(6,182,212,0.3)' }}>
              💬 CHAT
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {messages.map((msg, i) => (
              <div key={i} className="chat-message">
                {msg.type === 'system' ? (
                  <div className="chat-system" style={
                    msg.style === 'amber'
                      ? { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: 'var(--amber)', textShadow: '0 0 6px rgba(245,158,11,0.4)' }
                      : {}
                  }>
                    {msg.text}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                    <span style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontWeight: 700,
                      color: getColor(msg.playerName),
                      fontSize: '8px',
                      flexShrink: 0,
                      textShadow: `0 0 6px ${getColor(msg.playerName)}66`,
                    }}>
                      {msg.playerName === room.players.find(p => p.id === myId)?.name ? 'YOU' : msg.playerName}:
                    </span>
                    <span style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '8px',
                      color: 'var(--text)',
                      wordBreak: 'break-word',
                      lineHeight: 1.6,
                    }}>
                      {msg.text}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>
          <form onSubmit={sendGuess} style={{
            padding: '8px',
            borderTop: '2px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: '4px',
          }}>
            <input
              className="input"
              type="text"
              placeholder={isDrawer ? "YOU'RE DRAWING..." : 'TYPE GUESS...'}
              value={guess}
              onChange={e => setGuess(e.target.value)}
              disabled={isDrawer}
              style={{ flex: 1, padding: '8px 10px', fontSize: '9px' }}
            />
            <button className="btn-primary" type="submit" disabled={isDrawer}
              style={{ padding: '8px 12px', fontSize: '12px', minWidth: '36px' }}>
              →
            </button>
          </form>
        </div>
      </div>

      {/* ===== GAME OVER OVERLAY ===== */}
      {room.phase === 'ended' && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center', maxWidth: '550px' }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '8px',
              filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))',
              animation: 'float 2s ease-in-out infinite',
            }}>
              🏆
            </div>
            <h2 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '32px',
              fontWeight: 800,
              marginBottom: '4px',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 4px 4px 0 rgba(0,0,0,0.5)',
              color: 'var(--xp-gold)',
            }}>
              GAME OVER
            </h2>
            <div className="game-label" style={{ marginBottom: '24px' }}>
              FINAL STANDINGS
            </div>

            {/* Podium */}
            <div className="podium">
              {[...room.players].sort((a, b) => b.score - a.score).slice(0, 3).map((p, i) => {
                const order = i === 0 ? 1 : i === 1 ? 0 : 2; // visual order: 2nd, 1st, 3rd
                return (
                  <div key={p.id} className={`podium-slot ${i === 0 ? 'first' : i === 1 ? 'second' : 'third'}`}
                    style={{ order, animation: `slotAppear 0.4s ease-out ${i * 0.15}s both` }}>
                    <div style={{ fontSize: '24px' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </div>
                    <div style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '10px',
                      color: i === 0 ? 'var(--xp-gold)' : 'var(--text)',
                    }}>
                      {p.name}
                    </div>
                    <div style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '14px',
                      color: 'var(--xp-gold)',
                      textShadow: '0 0 10px rgba(255,215,0,0.5)',
                    }}>
                      {p.score}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Remaining players */}
            {room.players.length > 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                {[...room.players].sort((a, b) => b.score - a.score).slice(3).map((p, i) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: 'var(--text-muted)' }}>
                      {i + 4}.
                    </span>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', flex: 1 }}>{p.name}</span>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: 'var(--xp-gold)' }}>{p.score}</span>
                  </div>
                ))}
              </div>
            )}

            <button className="pixel-btn pixel-btn-primary" style={{ width: '100%', marginTop: '24px', padding: '16px', fontSize: '13px' }}
              onClick={() => window.location.reload()}>
              🔁 PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
