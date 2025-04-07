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
const io = new Server(httpServer, {
  cors: {
    origin: ["https://movie-imposter.onrender.com", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
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
    callback({ gameId });
  });

  socket.on('joinGame', ({ gameId, playerName }, callback) => {
    const game = games.get(gameId);
    if (!game) {
      callback({ error: 'Game not found' });
      return;
    }
    if (game.status !== 'waiting') {
      callback({ error: 'Game already in progress' });
      return;
    }
    if (game.players.length >= 8) {
      callback({ error: 'Game is full' });
      return;
    }
    game.players.push({
      id: socket.id,
      name: playerName,
      isHost: false
    });
    socket.join(gameId);
    io.to(gameId).emit('gameState', game);
    callback({ success: true });
  });

  socket.on('startGame', ({ gameId }) => {
    const game = games.get(gameId);
    if (game) {
      game.status = 'playing';
      io.to(gameId).emit('gameState', game);
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
}); 