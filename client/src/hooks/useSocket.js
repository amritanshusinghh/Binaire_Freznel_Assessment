import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

// hook to manage socket.io connection and keep tasks in sync

function useSocket() {
  const [tasks, setTasks] = useState([]);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // in dev mode vite proxies /socket.io to the backend
    // in production, if deployed separately, set VITE_API_URL
    const serverUrl = import.meta.env.VITE_API_URL || undefined;
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setSocketId(socket.id);
      console.log('Connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('queue:update', (taskList) => {
      setTasks(taskList);
    });

    // cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return { tasks, connected, socketId };
}

export default useSocket;
