import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configure CORS for both HTTP and WebSocket
const io = new Server(httpServer, {
  cors: {
    origin: ["https://movie-imposter-frontend.onrender.com", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling']
});

// Serve static files from the dist directory
app.use(express.static(join(__dirname, 'dist')));

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Store active games
const games = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createGame', (callback) => {
    try {
      const gameId = uuidv4();
      games.set(gameId, {
        players: [{
          id: socket.id,
          name: 'Host',
          isHost: true
        }],
        status: 'waiting',
        currentRound: 0,
        rounds: []
      });
      socket.join(gameId);
      if (typeof callback === 'function') {
        callback({ gameId });
      } else {
        socket.emit('gameCreated', { gameId });
      }
    } catch (error) {
      console.error('Error creating game:', error);
      if (typeof callback === 'function') {
        callback({ error: 'Failed to create game' });
      } else {
        socket.emit('error', { message: 'Failed to create game' });
      }
    }
  });

  socket.on('joinGame', ({ gameId, playerName }, callback) => {
    try {
      const game = games.get(gameId);
      if (!game) {
        if (typeof callback === 'function') {
          callback({ error: 'Game not found' });
        } else {
          socket.emit('error', { message: 'Game not found' });
        }
        return;
      }
      if (game.status !== 'waiting') {
        if (typeof callback === 'function') {
          callback({ error: 'Game already in progress' });
        } else {
          socket.emit('error', { message: 'Game already in progress' });
        }
        return;
      }
      if (game.players.length >= 8) {
        if (typeof callback === 'function') {
          callback({ error: 'Game is full' });
        } else {
          socket.emit('error', { message: 'Game is full' });
        }
        return;
      }
      game.players.push({
        id: socket.id,
        name: playerName,
        isHost: false
      });
      socket.join(gameId);
      io.to(gameId).emit('gameState', game);
      if (typeof callback === 'function') {
        callback({ success: true });
      } else {
        socket.emit('gameJoined', { success: true });
      }
    } catch (error) {
      console.error('Error joining game:', error);
      if (typeof callback === 'function') {
        callback({ error: 'Failed to join game' });
      } else {
        socket.emit('error', { message: 'Failed to join game' });
      }
    }
  });

  socket.on('getGameState', ({ gameId }, callback) => {
    try {
      console.log('getGameState requested for game:', gameId);
      const game = games.get(gameId);
      if (!game) {
        if (typeof callback === 'function') {
          callback({ error: 'Game not found' });
        } else {
          socket.emit('error', { message: 'Game not found' });
        }
        return;
      }
      if (typeof callback === 'function') {
        callback({ gameState: game });
      } else {
        socket.emit('gameState', game);
      }
    } catch (error) {
      console.error('Error getting game state:', error);
      if (typeof callback === 'function') {
        callback({ error: 'Failed to get game state' });
      } else {
        socket.emit('error', { message: 'Failed to get game state' });
      }
    }
  });

  socket.on('startGame', ({ gameId }) => {
    try {
      const game = games.get(gameId);
      if (game) {
        game.status = 'playing';
        io.to(gameId).emit('gameState', game);
      }
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Handle player disconnection
    games.forEach((game, gameId) => {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        if (game.players.length === 0) {
          games.delete(gameId);
        } else {
          io.to(gameId).emit('gameState', game);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is ready for connections`);
}); 