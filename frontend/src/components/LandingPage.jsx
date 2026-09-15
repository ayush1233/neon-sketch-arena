import { useState } from 'react';
import socket from '../socket';

export default function LandingPage() {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [createName, setCreateName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [avatar, setAvatar] = useState('👽');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function connect(cb) {
    if (!socket.connected) {
      socket.connect();
      socket.once('connect', cb);
    } else {
      cb();
    }
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return setError('Enter your name!');
    setError('');
    setLoading(true);
    connect(() => {
      socket.emit('create_room', { playerName: createName.trim(), avatar });
    });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!joinName.trim()) return setError('Enter your name!');
    if (!roomCode.trim()) return setError('Enter the room code!');
    setError('');
    setLoading(true);
    connect(() => {
      socket.emit('join_room', { roomId: roomCode.trim().toUpperCase(), playerName: joinName.trim(), avatar });
    });
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      zIndex: 1,
      padding: '24px',
      gap: '0',
    }}>

      {/* ===== GAME TITLE ===== */}
      <div style={{
        textAlign: 'center',
        marginBottom: '48px',
        animation: 'float 3s ease-in-out infinite',
      }}>
        {/* Pixel pencil icon */}
        <div style={{
          fontSize: '56px',
          marginBottom: '12px',
          filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.6))',
        }}>
          ✏️
        </div>

        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 800,
          color: '#fff',
          textShadow: `
            0 0 10px rgba(168, 85, 247, 0.6),
            0 0 30px rgba(168, 85, 247, 0.4),
            0 0 60px rgba(6, 182, 212, 0.3),
            4px 4px 0 rgba(0, 0, 0, 0.5)
          `,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: '12px',
        }}>
          SKRIBBL
        </h1>

        <p style={{
          fontFamily: "'Press Start 2P', monospace",
          color: 'var(--text-muted)',
          fontSize: '10px',
          letterSpacing: '0.15em',
          animation: 'glowPulse 3s ease-in-out infinite',
        }}>
          DRAW • GUESS • WIN
        </p>
      </div>

      {/* ===== MENU BUTTONS ===== */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* CREATE ROOM BUTTON */}
        {mode !== 'join' && (
          <>
            {mode !== 'create' ? (
              <button
                className="pixel-btn pixel-btn-primary"
                style={{ width: '100%', padding: '18px 28px', fontSize: '14px' }}
                onClick={() => setMode('create')}
              >
                ▶ CREATE ROOM
              </button>
            ) : (
              <div style={{
                animation: 'pixelFadeIn 0.3s ease-out',
              }}>
                <div style={{
                  background: 'var(--surface-2)',
                  border: '3px solid rgba(168, 85, 247, 0.3)',
                  padding: '20px',
                  boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.06), inset -2px -2px 0 rgba(0,0,0,0.4), 0 0 20px rgba(168,85,247,0.15)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    <span style={{ fontSize: '18px' }}>🎨</span>
                    <span className="game-label" style={{ color: 'var(--purple-light)', fontSize: '10px' }}>
                      CREATE NEW ROOM
                    </span>
                    <button
                      onClick={() => { setMode(null); setError(''); }}
                      style={{
                        marginLeft: 'auto',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: "'Press Start 2P', monospace",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="game-label" style={{ display: 'block', marginBottom: '6px' }}>
                        YOUR NAME
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select 
                          value={avatar}
                          onChange={e => setAvatar(e.target.value)}
                          className="input"
                          style={{ width: '60px', padding: '0', textAlign: 'center', fontSize: '24px' }}
                        >
                          <option value="👽">👽</option>
                          <option value="👻">👻</option>
                          <option value="🤖">🤖</option>
                          <option value="👾">👾</option>
                          <option value="🤡">🤡</option>
                        </select>
                        <input
                          className="input"
                          type="text"
                          placeholder="Enter nickname..."
                          maxLength={20}
                          value={createName}
                          onChange={e => setCreateName(e.target.value)}
                          autoFocus
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                    <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '14px' }}>
                      {loading ? 'CREATING...' : '🚀 CREATE'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* JOIN ROOM BUTTON */}
        {mode !== 'create' && (
          <>
            {mode !== 'join' ? (
              <button
                className="pixel-btn pixel-btn-cyan"
                style={{ width: '100%', padding: '18px 28px', fontSize: '14px' }}
                onClick={() => setMode('join')}
              >
                ▶ JOIN ROOM
              </button>
            ) : (
              <div style={{
                animation: 'pixelFadeIn 0.3s ease-out',
              }}>
                <div style={{
                  background: 'var(--surface-2)',
                  border: '3px solid rgba(6, 182, 212, 0.3)',
                  padding: '20px',
                  boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.06), inset -2px -2px 0 rgba(0,0,0,0.4), 0 0 20px rgba(6,182,212,0.15)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    <span style={{ fontSize: '18px' }}>🔑</span>
                    <span className="game-label" style={{ color: 'var(--cyan-light)', fontSize: '10px' }}>
                      JOIN EXISTING ROOM
                    </span>
                    <button
                      onClick={() => { setMode(null); setError(''); }}
                      style={{
                        marginLeft: 'auto',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: "'Press Start 2P', monospace",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="game-label" style={{ display: 'block', marginBottom: '6px' }}>
                        YOUR NAME
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Enter nickname..."
                        maxLength={20}
                        value={joinName}
                        onChange={e => setJoinName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="game-label" style={{ display: 'block', marginBottom: '6px' }}>
                        ROOM CODE
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="e.g. AB12CD"
                        maxLength={6}
                        value={roomCode}
                        onChange={e => setRoomCode(e.target.value.toUpperCase())}
                        style={{ fontSize: '16px', letterSpacing: '0.3em', textAlign: 'center' }}
                      />
                    </div>
                    <button className="btn-primary" type="submit" disabled={loading}
                      style={{ width: '100%', padding: '14px', background: 'linear-gradient(180deg, #0891b2, #0e7490, #155e75)', borderColor: '#0c4a5e' }}>
                      {loading ? 'JOINING...' : '⚡ JOIN'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* Back button when in a mode */}
        {mode && (
          <button
            className="pixel-btn"
            style={{ width: '100%', padding: '12px', fontSize: '10px', opacity: 0.7 }}
            onClick={() => { setMode(null); setError(''); }}
          >
            ← BACK
          </button>
        )}
      </div>

      {/* ===== ERROR MESSAGE ===== */}
      {error && (
        <p style={{
          color: 'var(--health-red)',
          marginTop: '16px',
          fontSize: '10px',
          textAlign: 'center',
          fontFamily: "'Press Start 2P', monospace",
          textShadow: '0 0 8px rgba(255, 51, 51, 0.5)',
        }}>
          ⚠ {error}
        </p>
      )}

      {/* ===== HOW TO PLAY ===== */}
      {!mode && (
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '48px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          {[
            { icon: '📝', step: '1', text: 'Pick a word' },
            { icon: '🖌️', step: '2', text: 'Draw it fast' },
            { icon: '💬', step: '3', text: 'Guess & score' },
          ].map((s, i) => (
            <div key={s.step} style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: '160px',
              background: 'var(--surface-1)',
              border: '2px solid rgba(255, 255, 255, 0.08)',
              boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.05), inset -1px -1px 0 rgba(0,0,0,0.3)',
              animation: `slotAppear 0.4s ease-out ${i * 0.1}s both`,
            }}>
              <span style={{ fontSize: '20px' }}>{s.icon}</span>
              <div>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8px',
                  color: 'var(--purple)',
                  letterSpacing: '0.1em',
                  textShadow: '0 0 8px rgba(168,85,247,0.4)',
                }}>
                  STEP {s.step}
                </div>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '9px',
                  marginTop: '4px',
                }}>
                  {s.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== VERSION BADGE ===== */}
      <div style={{
        position: 'fixed',
        bottom: '12px',
        right: '16px',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '7px',
        color: 'var(--text-muted)',
        opacity: 0.4,
      }}>
        v1.0 NEON SKETCH ARENA
      </div>
    </div>
  );
}
