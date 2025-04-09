import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  List,
  ListItem,
  useToast,
  Badge,
  Divider,
  Container,
  Grid,
  GridItem,
  Flex,
  Spacer,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  movie?: string;
}

interface GameState {
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentRound: number;
  rounds: any[];
  votes: Record<string, string>;
  movies: string[];
}

interface GameOverData {
  eliminated: string[];
  movies: string[];
}

export const Game: React.FC = () => {
  const { gameId } = useParams();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [myMovie, setMyMovie] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [allMovies, setAllMovies] = useState<string[]>([]);

  useEffect(() => {
    if (!socket || !gameId) return;

    console.log('Setting up socket listeners for game:', gameId);
    
    // Listen for gameState updates
    socket.on('gameState', (gameState: GameState) => {
      console.log('Received gameState:', gameState);
      setPlayers(gameState.players);
      setGameStatus(gameState.status);
      
      // Check if current user is the host
      const currentPlayer = gameState.players.find(p => p.id === socket.id);
      setIsHost(currentPlayer?.isHost || false);
      
      // Set current player's movie
      if (currentPlayer?.movie) {
        setMyMovie(currentPlayer.movie);
      }
    });

    // Listen for game over
    socket.on('gameOver', (data: GameOverData) => {
      setEliminated(data.eliminated);
      setAllMovies(data.movies);
      setGameStatus('finished');
    });

    // Request current game state
    socket.emit('getGameState', { gameId }, (response: { gameState?: GameState; error?: string }) => {
      if (response.error) {
        console.error('Error getting game state:', response.error);
        toast({
          title: 'Error',
          description: response.error,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      if (response.gameState) {
        console.log('Received initial game state:', response.gameState);
        setPlayers(response.gameState.players);
        setGameStatus(response.gameState.status);
        
        // Check if current user is the host
        const currentPlayer = response.gameState.players.find(p => p.id === socket.id);
        setIsHost(currentPlayer?.isHost || false);
        
        // Set current player's movie
        if (currentPlayer?.movie) {
          setMyMovie(currentPlayer.movie);
        }
      }
    });

    return () => {
      console.log('Cleaning up socket listeners');
      socket.off('gameState');
      socket.off('gameOver');
    };
  }, [socket, gameId, toast]);

  const handleStartGame = () => {
    if (!socket || !gameId) return;
    
    if (players.length < 3) {
      toast({
        title: 'Not enough players',
        description: 'You need at least 3 players to start the game',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    socket.emit('startGame', { gameId });
  };

  const handleVote = (playerId: string) => {
    if (!socket || !gameId || votedFor) return;
    
    socket.emit('vote', { gameId, votedForId: playerId });
    setVotedFor(playerId);
  };

  const handlePlayAgain = () => {
    if (!socket || !gameId || !isHost) return;
    
    socket.emit('startGame', { gameId });
    setVotedFor(null);
    setGameStatus('playing');
  };

  if (gameStatus === 'finished') {
    return (
      <Container maxW="container.lg" py={8}>
        <Box textAlign="center" p={8} borderWidth={1} borderRadius="lg" boxShadow="md">
          <VStack spacing={6}>
            <Heading size="xl">Game Over!</Heading>
            <Text fontSize="xl">
              {eliminated.length === 1 
                ? `${players.find(p => p.id === eliminated[0])?.name} was eliminated!`
                : 'It was a tie!'}
            </Text>
            <Box>
              <Text fontSize="lg" fontWeight="bold">All Movies:</Text>
              <VStack spacing={2} mt={2}>
                {allMovies.map((movie, index) => (
                  <Text key={index}>{movie}</Text>
                ))}
              </VStack>
            </Box>
            <HStack spacing={4}>
              {isHost ? (
                <Button colorScheme="green" size="lg" onClick={handlePlayAgain}>
                  Play Again
                </Button>
              ) : (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  Waiting for host to start a new game
                </Alert>
              )}
              <Button colorScheme="blue" size="lg" onClick={() => navigate('/')}>
                Leave Game
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        <Flex align="center" justify="space-between">
          <Heading>Game Room: {gameId}</Heading>
          <Button colorScheme="gray" onClick={() => navigate('/')}>
            Leave Game
          </Button>
        </Flex>
        
        {gameStatus === 'playing' ? (
          <Grid templateColumns={{ base: "1fr", md: "1fr 2fr" }} gap={6}>
            <GridItem>
              <Box p={6} borderWidth={1} borderRadius="lg" boxShadow="md" h="100%">
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Your Movie</Heading>
                  <Text fontSize="xl" fontWeight="bold" p={4} bg="blue.50" borderRadius="md">
                    {myMovie}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Discuss with other players to identify the imposters!
                  </Text>
                </VStack>
              </Box>
            </GridItem>
            
            <GridItem>
              <Box p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Players</Heading>
                  <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4}>
                    {players.map((player) => (
                      <GridItem key={player.id}>
                        <Box
                          p={4}
                          borderWidth={1}
                          borderRadius="md"
                          bg={votedFor === player.id ? 'blue.100' : 'white'}
                          boxShadow="sm"
                        >
                          <VStack align="stretch" spacing={2}>
                            <Flex justify="space-between" align="center">
                              <Text fontWeight="bold">{player.name}</Text>
                              <Badge colorScheme={player.isHost ? 'purple' : 'green'}>
                                {player.isHost ? 'Host' : 'Player'}
                              </Badge>
                            </Flex>
                            {!votedFor && player.id !== socket?.id && (
                              <Button
                                size="sm"
                                colorScheme="blue"
                                onClick={() => handleVote(player.id)}
                              >
                                Vote
                              </Button>
                            )}
                            {votedFor === player.id && (
                              <Text fontSize="sm" color="blue.600">Voted</Text>
                            )}
                          </VStack>
                        </Box>
                      </GridItem>
                    ))}
                  </Grid>
                </VStack>
              </Box>
            </GridItem>
          </Grid>
        ) : (
          <Box p={8} borderWidth={1} borderRadius="lg" boxShadow="md" textAlign="center">
            <VStack spacing={4}>
              <Heading size="md">Waiting for players to join...</Heading>
              <Text>Share the game code with your friends: <Text as="span" fontWeight="bold">{gameId}</Text></Text>
              <Text>Players joined: {players.length}/3 minimum required</Text>
              
              {isHost ? (
                <>
                  {players.length < 3 ? (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      Waiting for more players to join (minimum 3 required)
                    </Alert>
                  ) : (
                    <Button colorScheme="green" size="lg" onClick={handleStartGame}>
                      Start Game
                    </Button>
                  )}
                </>
              ) : (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  Waiting for the host to start the game
                </Alert>
              )}
            </VStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
}; 