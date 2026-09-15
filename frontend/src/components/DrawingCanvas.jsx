import { useEffect, useRef, useCallback, useState } from 'react';
import socket from '../socket';

// drawing constants
const DEFAULT_COLOR = '#111111';
const DEFAULT_SIZE = 6;

const COLORS = [
  { hex: '#111111', name: 'Black' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#f59e0b', name: 'Gold' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#78350f', name: 'Brown' },
  { hex: '#166534', name: 'Forest' },
  { hex: '#1e40af', name: 'Navy' },
  { hex: '#6d28d9', name: 'Violet' },
  { hex: '#be123c', name: 'Crimson' },
  { hex: '#9ca3af', name: 'Gray' },
  { hex: '#374151', name: 'Dark' },
];

const SIZES = [
  { value: 3, label: 'S', name: 'Fine' },
  { value: 8, label: 'M', name: 'Medium' },
  { value: 16, label: 'L', name: 'Thick' },
  { value: 28, label: 'XL', name: 'Chunky' },
];

export default function DrawingCanvas({ roomId, isDrawer, drawHistory }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const colorRef = useRef(DEFAULT_COLOR);
  const sizeRef = useRef(DEFAULT_SIZE);
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR);
  const [activeSize, setActiveSize] = useState(DEFAULT_SIZE);
  const [activeTool, setActiveTool] = useState('pen'); // pen | eraser

  // replay history when joining mid-round
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!drawHistory?.length) return;
    for (const stroke of drawHistory) {
      if (stroke.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(stroke.x, stroke.y);
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      } else if (stroke.type === 'move') {
        ctx.lineTo(stroke.x, stroke.y);
        ctx.stroke();
      } else if (stroke.type === 'end') {
        ctx.closePath();
      }
    }
  }, [drawHistory]);

  // listen for remote draw events
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function onStart({ x, y, color, size }) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    function onMove({ x, y }) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    function onEnd() {
      ctx.closePath();
    }
    function onClear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    socket.on('draw_start', onStart);
    socket.on('draw_move', onMove);
    socket.on('draw_end', onEnd);
    socket.on('clear_canvas', onClear);

    return () => {
      socket.off('draw_start', onStart);
      socket.off('draw_move', onMove);
      socket.off('draw_end', onEnd);
      socket.off('clear_canvas', onClear);
    };
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e) => {
    if (!isDrawer) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = sizeRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    socket.emit('draw_start', { roomId, x, y, color: colorRef.current, size: sizeRef.current });
  }, [isDrawer, roomId]);

  const draw = useCallback((e) => {
    if (!isDrawer || !isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    socket.emit('draw_move', { roomId, x, y });
  }, [isDrawer, roomId]);

  const stopDraw = useCallback((e) => {
    if (!isDrawer || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    canvasRef.current.getContext('2d').closePath();
    socket.emit('draw_end', { roomId });
  }, [isDrawer, roomId]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear_canvas', { roomId });
  }

  function saveCanvas() {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `neon-sketch-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  function selectColor(hex) {
    colorRef.current = hex;
    setActiveColor(hex);
    setActiveTool('pen');
  }

  function selectEraser() {
    colorRef.current = '#ffffff';
    setActiveColor('#ffffff');
    setActiveTool('eraser');
  }

  function selectSize(val) {
    sizeRef.current = val;
    setActiveSize(val);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', flex: 1 }}>
      {/* Canvas with pixel-art frame */}
      <div style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
      }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className={isDrawer ? 'canvas-active' : ''}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: '8/5',
            border: `3px solid ${isDrawer ? 'var(--purple)' : 'rgba(255, 255, 255, 0.12)'}`,
            background: 'white',
            cursor: isDrawer ? 'crosshair' : 'default',
            display: 'block',
            touchAction: 'none',
            boxShadow: isDrawer
              ? '0 0 20px rgba(168, 85, 247, 0.3), inset 0 0 0 1px rgba(0,0,0,0.1)'
              : 'inset 0 0 0 1px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.3)',
            imageRendering: 'auto',
            objectFit: 'contain',
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>

      {/* ===== MINECRAFT HOTBAR ===== */}
      {isDrawer && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 14px',
          background: 'var(--surface-2)',
          border: '3px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.05), inset -2px -2px 0 rgba(0,0,0,0.4), 0 -4px 20px rgba(0,0,0,0.3)',
          flexWrap: 'wrap',
        }}>
          {/* Active color preview */}
          <div style={{
            width: '36px',
            height: '36px',
            background: activeColor,
            border: '2px solid var(--xp-gold)',
            boxShadow: `0 0 12px ${activeColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : activeColor + '88'}`,
            flexShrink: 0,
          }}
            title={`Active: ${activeTool === 'eraser' ? 'Eraser' : COLORS.find(c => c.hex === activeColor)?.name || activeColor}`}
          />

          {/* Divider */}
          <div style={{ width: '2px', height: '36px', background: 'rgba(255, 255, 255, 0.08)', flexShrink: 0 }} />

          {/* Color slots */}
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button
                key={c.hex}
                className={`hotbar-slot ${activeColor === c.hex && activeTool === 'pen' ? 'active' : ''}`}
                onClick={() => selectColor(c.hex)}
                title={c.name}
                style={{ width: '28px', height: '28px' }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  background: c.hex,
                  border: c.hex === '#ffffff' ? '1px solid rgba(0,0,0,0.2)' : 'none',
                }} />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '2px', height: '36px', background: 'rgba(255, 255, 255, 0.08)', flexShrink: 0 }} />

          {/* Size presets */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {SIZES.map(s => (
              <button
                key={s.value}
                className={`hotbar-slot ${activeSize === s.value ? 'active' : ''}`}
                onClick={() => selectSize(s.value)}
                title={`${s.name} (${s.value}px)`}
                style={{ width: '28px', height: '28px' }}
              >
                <div style={{
                  width: `${Math.min(s.value, 18)}px`,
                  height: `${Math.min(s.value, 18)}px`,
                  background: 'var(--text)',
                  borderRadius: '50%',
                }} />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '2px', height: '36px', background: 'rgba(255, 255, 255, 0.08)', flexShrink: 0 }} />

          {/* Tool buttons */}
          <button
            className={`hotbar-slot ${activeTool === 'eraser' ? 'active' : ''}`}
            onClick={selectEraser}
            title="Eraser"
            style={{ width: '36px', height: '36px', fontSize: '16px' }}
          >
            🧹
          </button>

          <button
            className="hotbar-slot"
            onClick={clearCanvas}
            title="Clear Canvas (TNT!)"
            style={{ width: '36px', height: '36px', fontSize: '16px' }}
          >
            💥
          </button>

          {/* Divider */}
          <div style={{ width: '2px', height: '36px', background: 'rgba(255, 255, 255, 0.08)', flexShrink: 0 }} />

          <button
            className="hotbar-slot"
            onClick={saveCanvas}
            title="Save Drawing"
            style={{ width: '36px', height: '36px', fontSize: '16px' }}
          >
            💾
          </button>
        </div>
      )}
    </div>
  );
}
