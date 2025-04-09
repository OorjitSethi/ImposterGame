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

// Function to generate a 5-digit game code
const generateGameCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Store active games
const games = new Map();

// Minimum players required to start a game
const MIN_PLAYERS = 3;

// Categories and their items
const CATEGORIES = {
  movies: [
    'The Shawshank Redemption',
    'The Godfather',
    'The Dark Knight',
    'Pulp Fiction',
    'Forrest Gump',
    'Inception',
    'The Matrix',
    'Goodfellas',
    'The Silence of the Lambs',
    'Fight Club'
  ],
  songs: [
    'Bohemian Rhapsody',
    'Stairway to Heaven',
    'Billie Jean',
    'Sweet Child O\' Mine',
    'Smells Like Teen Spirit',
    'Hotel California',
    'Sweet Home Alabama',
    'Sweet Caroline',
    'Don\'t Stop Believin\'',
    'Sweet Dreams'
  ],
  artists: [
    'Michael Jackson',
    'Elvis Presley',
    'Madonna',
    'Prince',
    'David Bowie',
    'Freddie Mercury',
    'John Lennon',
    'Bob Marley',
    'Miles Davis',
    'Louis Armstrong'
  ],
  historicalFigures: [
    'Albert Einstein',
    'Mahatma Gandhi',
    'Martin Luther King Jr.',
    'Winston Churchill',
    'Nelson Mandela',
    'Mother Teresa',
    'Leonardo da Vinci',
    'William Shakespeare',
    'Isaac Newton',
    'Marie Curie'
  ]
};

// Function to get random items from a category
const getRandomItems = (category, count) => {
  const items = CATEGORIES[category];
  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Function to get a random category
const getRandomCategory = () => {
  const categories = Object.keys(CATEGORIES);
  return categories[Math.floor(Math.random() * categories.length)];
};

// Function to assign items to players
const assignItems = (players) => {
  const category = getRandomCategory();
  const mainItem = getRandomItems(category, 1)[0];
  const imposterItem = getRandomItems(category, 1)[0];
  const imposterIndex = Math.floor(Math.random() * players.length);
  
  const updatedPlayers = players.map((player, index) => ({
    ...player,
    item: index === imposterIndex ? imposterItem : mainItem,
    category
  }));

  return {
    players: updatedPlayers,
    items: [mainItem, imposterItem],
    category
  };
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createGame', (callback) => {
    try {
      const gameId = generateGameCode();
      games.set(gameId, {
        players: [{
          id: socket.id,
          name: 'Host',
          isHost: true
        }],
        status: 'waiting',
        currentRound: 0,
        rounds: [],
        votes: {},
        items: [],
        category: ''
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
    const game = games.get(gameId);
    if (!game) return;

    // Reset game state
    game.votes = {};
    game.status = 'playing';
    game.currentRound = 0;
    game.rounds = [];

    // Assign items to players
    const { players: updatedPlayers, items, category } = assignItems(game.players);
    game.players = updatedPlayers;
    game.items = items;
    game.category = category;

    io.to(gameId).emit('gameState', {
      players: game.players,
      status: game.status,
      currentRound: game.currentRound,
      rounds: game.rounds,
      votes: game.votes,
      items: game.items,
      category: game.category
    });
  });

  socket.on('vote', ({ gameId, votedForId }) => {
    try {
      const game = games.get(gameId);
      if (!game || game.status !== 'playing') {
        socket.emit('error', { message: 'Game not found or not in progress' });
        return;
      }

      // Record the vote
      game.votes[socket.id] = votedForId;
      io.to(gameId).emit('gameState', game);

      // Check if all players have voted
      if (Object.keys(game.votes).length === game.players.length) {
        // Count votes
        const voteCount = {};
        Object.values(game.votes).forEach(id => {
          voteCount[id] = (voteCount[id] || 0) + 1;
        });

        // Find player with most votes
        const maxVotes = Math.max(...Object.values(voteCount));
        const eliminated = Object.entries(voteCount)
          .filter(([_, count]) => count === maxVotes)
          .map(([id]) => id);

        // Find the imposter
        const imposter = game.players.find(p => p.item !== game.items[0]);
        
        // Check if the eliminated player was the imposter
        const wasImposterEliminated = eliminated.some(id => id === imposter?.id);
        const resultMessage = wasImposterEliminated 
          ? 'The players successfully identified and eliminated the imposter!'
          : 'The players failed to identify the imposter!';

        // End the game
        game.status = 'finished';
        io.to(gameId).emit('gameOver', {
          eliminated,
          items: game.items,
          category: game.category,
          resultMessage,
          imposter: imposter?.id
        });
      }
    } catch (error) {
      console.error('Error processing vote:', error);
      socket.emit('error', { message: 'Failed to process vote' });
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