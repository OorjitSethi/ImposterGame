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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://imposter-game-0t5h.onrender.com';
      console.log('Connecting to backend at:', backendUrl);
      
      const socketInstance = io(backendUrl, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        setError(null);
        console.log('Successfully connected to server');
      });

      socketInstance.on('connect_error', (err) => {
        setIsConnected(false);
        const errorMessage = `Connection error: ${err.message}. Please check if the server is running at ${backendUrl}`;
        setError(errorMessage);
        console.error('Connection error details:', err);
      });

      socketInstance.on('disconnect', (reason) => {
        setIsConnected(false);
        console.log('Disconnected from server. Reason:', reason);
      });

      socketInstance.on('error', (err) => {
        console.error('Socket error:', err);
        setError(`Socket error: ${err.message}`);
      });

      setSocket(socketInstance);

      return () => {
        console.log('Cleaning up socket connection');
        socketInstance.disconnect();
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to initialize socket connection: ${errorMessage}`);
      console.error('Socket initialization error:', err);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error }}>
      {children}
    </SocketContext.Provider>
  );
}; 