import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
}

const SocketContext = createContext<SocketContextType>({ 
  socket: null, 
  isConnected: false,
  error: null
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const socketInstance = io('https://imposter-game-0t5h.onrender.com', {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        setError(null);
        console.log('Connected to server');
      });

      socketInstance.on('connect_error', (err) => {
        setIsConnected(false);
        setError('Failed to connect to server. Please make sure the server is running.');
        console.error('Connection error:', err);
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
        console.log('Disconnected from server');
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } catch (err) {
      setError('Failed to initialize socket connection');
      console.error('Socket initialization error:', err);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}; 