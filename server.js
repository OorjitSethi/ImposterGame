import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const games = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createGame', ({ numPlayers, numImposters }) => {
    const gameId = uuidv4().slice(0, 6);
    const movies = [
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
    ];
    
    const imposterMovie = movies[Math.floor(Math.random() * movies.length)];
    const normalMovie = movies.filter(m => m !== imposterMovie)[Math.floor(Math.random() * (movies.length - 1))];
    
    const game = {
      id: gameId,
      players: [],
      numPlayers,
      numImposters,
      imposterMovie,
      normalMovie,
      votes: {},
      started: false
    };
    
    games.set(gameId, game);
    socket.emit('gameCreated', { gameId, game });
  });

  socket.on('joinGame', ({ gameId, playerName }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    if (game.players.length >= game.numPlayers) {
      socket.emit('error', 'Game is full');
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      isImposter: game.players.length < game.numImposters,
      movie: game.players.length < game.numImposters ? game.imposterMovie : game.normalMovie
    };

    game.players.push(player);
    socket.join(gameId);
    io.to(gameId).emit('playerJoined', { players: game.players });

    if (game.players.length === game.numPlayers) {
      io.to(gameId).emit('gameStarted', { players: game.players });
      game.started = true;
    }
  });

  socket.on('vote', ({ gameId, votedForId }) => {
    const game = games.get(gameId);
    if (!game || !game.started) return;

    game.votes[socket.id] = votedForId;
    io.to(gameId).emit('voteCast', { votes: game.votes });

    if (Object.keys(game.votes).length === game.players.length) {
      const voteCount = {};
      Object.values(game.votes).forEach(id => {
        voteCount[id] = (voteCount[id] || 0) + 1;
      });

      const maxVotes = Math.max(...Object.values(voteCount));
      const eliminated = Object.entries(voteCount)
        .filter(([_, count]) => count === maxVotes)
        .map(([id]) => id);

      io.to(gameId).emit('gameOver', {
        eliminated,
        wasImposter: game.players.find(p => p.id === eliminated[0])?.isImposter
      });
    }
  });

  socket.on('disconnect', () => {
    games.forEach((game, gameId) => {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        if (game.players.length === 0) {
          games.delete(gameId);
        } else {
          io.to(gameId).emit('playerLeft', { players: game.players });
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 