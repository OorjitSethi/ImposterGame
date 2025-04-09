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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
    'Avengers: Endgame',
    'Spider-Man: No Way Home',
    'Black Panther',
    'Thor: Love and Thunder',
    'The Batman',
    'Doctor Strange in the Multiverse of Madness',
    'Black Adam',
    'Titanic',
    'Avatar',
    'The Dark Knight',
    'Jurassic World',
    'Star Wars: The Force Awakens',
    'The Lion King',
    'Inception',
    'Captain Marvel',
    'Black Widow',
    'Shang-Chi and the Legend of the Ten Rings',
    'Eternals',
    'Top Gun: Maverick',
    'Interstellar'
  ],
  songs: [
    'Blinding Lights',
    'As It Was',
    'Stay',
    'drivers license',
    'Levitating',
    'Watermelon Sugar',
    'good 4 u',
    'Bad Guy',
    'Anti-Hero',
    'Heat Waves',
    'Industry Baby',
    'Sunroof',
    'About Damn Time',
    'abcdefu',
    'Enemy',
    'One Dance',
    'Super Gremlin',
    'Running Up That Hill',
    'Break My Soul',
    'Late Night Talking'
  ],
  artists: [
    'Taylor Swift',
    'Drake',
    'The Weeknd',
    'Billie Eilish',
    'Harry Styles',
    'Dua Lipa',
    'Bad Bunny',
    'Olivia Rodrigo',
    'Post Malone',
    'BTS'
  ],
  youtubers: [
    'PewDiePie',
    'MrBeast',
    'Markiplier',
    'Jack Black',
    'Logan Paul',
    'KSI',
    'Ninja',
    'Jeffree Star',
    'David Dobrik',
    'Casey Neistat',
    'Dude Perfect',
    'Jacksepticeye',
    'James Charles',
    'DanTDM',
    'Liza Koshy',
    'Rhett and Link',
    'Marques Brownlee',
    'Lilly Singh',
    'Kevin Hart',
    'Druski'
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
const assignItems = (players, imposterCount = 1) => {
  console.log('Assigning items to players:', players);
  console.log('Imposter count:', imposterCount);
  const category = getRandomCategory();
  console.log('Selected category:', category);
  
  const mainItem = getRandomItems(category, 1)[0];
  const imposterItem = getRandomItems(category, 1)[0];
  console.log('Main item:', mainItem);
  console.log('Imposter item:', imposterItem);
  
  // Select random imposters based on imposterCount
  const imposterIndices = [];
  while (imposterIndices.length < imposterCount && imposterIndices.length < players.length) {
    const randomIndex = Math.floor(Math.random() * players.length);
    if (!imposterIndices.includes(randomIndex)) {
      imposterIndices.push(randomIndex);
    }
  }
  
  console.log('Imposter indices:', imposterIndices);
  console.log('Imposters will be:', imposterIndices.map(index => players[index].name));
  
  const updatedPlayers = players.map((player, index) => {
    const isImposter = imposterIndices.includes(index);
    console.log(`Player ${player.name} (${player.id}) is ${isImposter ? 'IMPOSTER' : 'NOT IMPOSTER'}`);
    return {
      ...player,
      item: isImposter ? imposterItem : mainItem,
      category,
      isImposter
    };
  });

  return {
    players: updatedPlayers,
    items: [mainItem, imposterItem],
    category,
    imposterIds: imposterIndices.map(index => players[index].id)
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

  socket.on('startGame', ({ gameId, imposterCount = 1 }) => {
    console.log('Starting game:', gameId);
    console.log('Imposter count:', imposterCount);
    const game = games.get(gameId);
    if (!game) {
      console.error('Game not found:', gameId);
      return;
    }

    // Reset game state for all players
    game.players = game.players.map(player => ({
      ...player,
      item: undefined,
      category: undefined,
      isImposter: false
    }));
    game.votes = {};
    game.status = 'playing';
    game.currentRound = 0;
    game.rounds = [];
    game.items = [];
    game.category = '';
    game.imposterIds = [];
    game.imposterCount = imposterCount;

    // Assign items to players
    const { players: updatedPlayers, items, category, imposterIds } = assignItems(game.players, imposterCount);
    game.players = updatedPlayers;
    game.items = items;
    game.category = category;
    game.imposterIds = imposterIds;

    // Log detailed game state for debugging
    console.log('Final game state:', {
      players: game.players.map(p => ({
        name: p.name,
        id: p.id,
        isImposter: p.isImposter,
        item: p.item,
        socketId: p.id
      })),
      imposterIds: game.imposterIds,
      items: game.items,
      category: game.category,
      imposterCount: game.imposterCount
    });

    // Emit game state to all players
    io.to(gameId).emit('gameState', {
      players: game.players,
      status: game.status,
      currentRound: game.currentRound,
      rounds: game.rounds,
      votes: game.votes,
      items: game.items,
      category: game.category,
      imposterIds: game.imposterIds,
      imposterCount: game.imposterCount
    });
  });

  socket.on('vote', ({ gameId, playerId }) => {
    console.log('Received vote:', { gameId, playerId, socketId: socket.id });
    const game = games.get(gameId);
    if (!game) {
      console.error('Game not found:', gameId);
      return;
    }

    // Record the vote
    game.votes[socket.id] = playerId;
    console.log('Current votes:', game.votes);
    
    // Check if all players have voted
    const allPlayersVoted = game.players.every(player => game.votes[player.id]);
    console.log('All players voted:', allPlayersVoted);
    
    if (allPlayersVoted) {
      // Count votes
      const voteCounts = {};
      Object.values(game.votes).forEach(votedPlayerId => {
        voteCounts[votedPlayerId] = (voteCounts[votedPlayerId] || 0) + 1;
      });
      console.log('Vote counts:', voteCounts);
      
      // Find player with most votes
      let maxVotes = 0;
      let votedOutPlayerId = null;
      
      Object.entries(voteCounts).forEach(([playerId, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          votedOutPlayerId = playerId;
        }
      });
      console.log('Player voted out:', votedOutPlayerId);
      
      // Check if imposters won
      const votedOutPlayer = game.players.find(p => p.id === votedOutPlayerId);
      const remainingImposters = game.players.filter(p => 
        p.isImposter && p.id !== votedOutPlayerId
      );
      console.log('Remaining imposters:', remainingImposters.map(p => p.name));
      
      if (votedOutPlayer?.isImposter) {
        // If an imposter was voted out, check if the other imposter is still in the game
        if (remainingImposters.length > 0) {
          // Other imposter is still in the game
          console.log('Imposters win - one imposter remains');
          io.to(gameId).emit('gameState', {
            ...game,
            status: 'finished',
            winner: 'imposters'
          });
        } else {
          // All imposters were voted out
          console.log('Crewmates win - all imposters eliminated');
          io.to(gameId).emit('gameState', {
            ...game,
            status: 'finished',
            winner: 'crewmates'
          });
        }
      } else {
        // If a crewmate was voted out, check if imposters have majority
        const remainingPlayers = game.players.filter(p => p.id !== votedOutPlayerId);
        const remainingCrewmates = remainingPlayers.filter(p => !p.isImposter);
        
        if (remainingImposters.length >= remainingCrewmates.length) {
          // Imposters have majority
          console.log('Imposters win - have majority');
          io.to(gameId).emit('gameState', {
            ...game,
            status: 'finished',
            winner: 'imposters'
          });
        } else {
          // Continue the game
          console.log('Game continues');
          io.to(gameId).emit('gameState', game);
        }
      }
    } else {
      // Not all players have voted yet
      console.log('Waiting for more votes');
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
  console.log(`WebSocket server is ready for connections`);
}); 