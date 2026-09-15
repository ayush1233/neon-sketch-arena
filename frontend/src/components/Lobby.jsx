import { useState } from 'react';
import socket from '../socket';

// avatar color pool
const AVATAR_COLORS = ['#a855f7', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#f97316', '#14b8a6'];

function getColor(name) {
  let hash = 0;
  for (let c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Lobby({ room, myId }) {
  const isHost = room.host === myId;
  const maxSlots = room.settings.maxPlayers;
  const [customWords, setCustomWords] = useState('');

  function start() {
    socket.emit('start_game', { roomId: room.id, customWords: customWords.trim() });
  }

  function copyCode() {
    navigator.clipboard?.writeText(room.id);
  }

  // generate empty slots
  const emptySlots = Math.max(0, maxSlots - room.players.length);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        position: 'relative',
      }}>

        {/* ===== ROOM CODE BANNER ===== */}
        <div style={{
          textAlign: 'center',
          marginBottom: '28px',
          animation: 'pixelFadeIn 0.4s ease-out',
        }}>
          <div className="game-label" style={{
            fontSize: '8px',
            marginBottom: '8px',
            letterSpacing: '0.2em',
          }}>
            ◆ GAME LOBBY ◆
          </div>

          {/* Room code marquee */}
          <div
            onClick={copyCode}
            style={{
              display: 'inline-block',
              background: 'var(--surface-2)',
              border: '3px solid var(--purple)',
              padding: '12px 32px',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.3), inset 2px 2px 0 rgba(255,255,255,0.06), inset -2px -2px 0 rgba(0,0,0,0.4)',
              position: 'relative',
            }}
            title="Click to copy"
          >
            <div style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '24px',
              letterSpacing: '0.3em',
              color: 'var(--purple-light)',
              textShadow: '0 0 15px rgba(168, 85, 247, 0.6), 3px 3px 0 rgba(0,0,0,0.5)',
            }}>
              {room.id}
            </div>
          </div>

          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            color: 'var(--text-muted)',
            marginTop: '10px',
            letterSpacing: '0.05em',
          }}>
            CLICK CODE TO COPY • SHARE WITH FRIENDS
          </div>
        </div>

        {/* ===== GAME SETTINGS STATS ===== */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          justifyContent: 'center',
        }}>
          {[
            { icon: '🔄', label: 'ROUNDS', value: room.settings.rounds },
            { icon: '⏱️', label: 'TIME', value: `${room.settings.drawTime}s` },
            { icon: '👥', label: 'SLOTS', value: `${room.players.length}/${maxSlots}` },
          ].map(s => (
            <div key={s.label} style={{
              flex: '1 1 0',
              background: 'var(--surface-1)',
              border: '2px solid rgba(255, 255, 255, 0.08)',
              padding: '10px 12px',
              textAlign: 'center',
              boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.05), inset -1px -1px 0 rgba(0,0,0,0.3)',
            }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>{s.icon}</div>
              <div className="game-label" style={{ fontSize: '7px', marginBottom: '4px' }}>{s.label}</div>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '14px',
                color: 'var(--cyan)',
                textShadow: '0 0 8px rgba(6, 182, 212, 0.4)',
              }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ===== PLAYER SLOTS GRID ===== */}
        <div className="game-label" style={{ marginBottom: '10px', textAlign: 'center' }}>
          PLAYERS
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '8px',
          marginBottom: '24px',
        }}>
          {/* Filled slots */}
          {room.players.map((p, i) => {
            const color = getColor(p.name);
            return (
              <div key={p.id} style={{
                background: 'var(--surface-2)',
                border: `2px solid ${p.id === room.host ? 'var(--xp-gold)' : 'rgba(255,255,255,0.1)'}`,
                padding: '14px 10px',
                textAlign: 'center',
                boxShadow: p.id === room.host
                  ? '0 0 15px rgba(255,215,0,0.2), inset 1px 1px 0 rgba(255,215,0,0.1)'
                  : 'inset 1px 1px 0 rgba(255,255,255,0.05), inset -1px -1px 0 rgba(0,0,0,0.3)',
                animation: `slotAppear 0.3s ease-out ${i * 0.05}s both`,
                position: 'relative',
              }}>
                {/* Crown for host */}
                {p.id === room.host && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '16px',
                    animation: 'bob 2s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.5))',
                  }}>
                    👑
                  </div>
                )}

                {/* Avatar */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  margin: '0 auto 8px',
                  background: color + '33',
                  color: color,
                  border: `2px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '16px',
                  boxShadow: `0 0 12px ${color}44`,
                }}>
                  {p.name[0].toUpperCase()}
                </div>

                {/* Name */}
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: p.id === myId ? 'var(--cyan)' : 'var(--text)',
                  textShadow: p.id === myId ? '0 0 8px rgba(6,182,212,0.4)' : 'none',
                }}>
                  {p.name}
                </div>

                {/* You badge */}
                {p.id === myId && (
                  <div style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '6px',
                    color: 'var(--cyan)',
                    marginTop: '4px',
                    opacity: 0.7,
                  }}>
                    (YOU)
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} style={{
              border: '2px dashed rgba(255, 255, 255, 0.08)',
              padding: '14px 10px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100px',
              animation: `slotAppear 0.3s ease-out ${(room.players.length + i) * 0.05}s both`,
            }}>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '20px',
                color: 'var(--text-muted)',
                opacity: 0.3,
                animation: 'glowPulse 3s ease-in-out infinite',
              }}>
                ?
              </div>
              <div className="game-label" style={{ fontSize: '6px', marginTop: '6px', opacity: 0.3 }}>
                EMPTY
              </div>
            </div>
          ))}
        </div>

        {/* ===== WAITING / START ===== */}
        {isHost ? (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label className="game-label" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>
                CUSTOM WORDS (OPTIONAL, COMMA-SEPARATED)
              </label>
              <textarea
                value={customWords}
                onChange={(e) => setCustomWords(e.target.value)}
                placeholder="e.g. naruto, sasuke, rasengan, pokemon..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--surface-1)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '14px',
                  resize: 'none',
                  minHeight: '60px',
                }}
              />
            </div>
            <button
              className="pixel-btn pixel-btn-primary"
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '15px',
                animation: room.players.length >= 2 ? 'glowPulse 2s ease-in-out infinite' : 'none',
              }}
              onClick={start}
            >
              ⚔️ START GAME {room.players.length === 1 ? '(SOLO)' : ''}
            </button>
            {room.players.length === 1 && (
              <p style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '7px',
                color: 'var(--cyan)',
                marginTop: '10px',
                textAlign: 'center',
                lineHeight: 1.8,
              }}>
                💡 OPEN ANOTHER TAB AT localhost:5173
                <br />AND ENTER CODE {room.id} TO JOIN
              </p>
            )}
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '10px',
            color: 'var(--text-muted)',
            padding: '18px',
            background: 'var(--surface-1)',
            border: '2px solid rgba(255, 255, 255, 0.06)',
            boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.04), inset -1px -1px 0 rgba(0,0,0,0.3)',
          }}>
            ⏳ WAITING FOR HOST...
          </div>
        )}
      </div>
    </div>
  );
}
