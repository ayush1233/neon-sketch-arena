import { useState, useEffect } from 'react';
import './index.css';
import socket from './socket';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import ParticleBackground from './components/ParticleBackground';

export default function App() {
  const [view, setView] = useState('landing');  // landing | lobby | game
  const [room, setRoom] = useState(null);
  const [myId, setMyId] = useState(null);
  const [wordOptions, setWordOptions] = useState(null);

  useEffect(() => {
    socket.on('connect', () => setMyId(socket.id));
    socket.on('disconnect', () => {
      setView('landing');
      setRoom(null);
      setMyId(null);
    });

    socket.on('room_created', ({ roomId }) => {
      // room state arrives via room_state shortly after
    });

    socket.on('room_joined', ({ roomId }) => {
      // room state arrives via room_state shortly after
    });

    socket.on('room_state', (state) => {
      setRoom(state);
      // figure out which view to show based on game phase
      if (state.phase === 'lobby') {
        setView('lobby');
      } else {
        setView('game');
      }
    });

    socket.on('pick_word', ({ options }) => {
      setWordOptions(options);
    });

    socket.on('turn_ended', () => {
      setWordOptions(null);
    });

    socket.on('error', ({ message }) => {
      alert(message);
      setView('landing');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_state');
      socket.off('pick_word');
      socket.off('turn_ended');
      socket.off('error');
    };
  }, []);

  return (
    <>
      {view !== 'game' && <ParticleBackground />}
      {view === 'landing' && <LandingPage />}
      {view === 'lobby' && room && <Lobby room={room} myId={myId} />}
      {view === 'game' && room && <GameScreen room={room} myId={myId} wordOptions={wordOptions} setWordOptions={setWordOptions} />}
    </>
  );
}
