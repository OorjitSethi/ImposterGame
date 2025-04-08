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
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface GameState {
  players: Player[];
  status: 'waiting' | 'playing';
  currentRound: number;
  rounds: any[];
}

export const Game: React.FC = () => {
  const { gameId } = useParams();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !gameId) return;

    console.log('Setting up socket listeners for game:', gameId);
    
    // Listen for gameState updates
    socket.on('gameState', (gameState: GameState) => {
      console.log('Received gameState:', gameState);
      setPlayers(gameState.players);
      setGameStarted(gameState.status === 'playing');
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
        setGameStarted(response.gameState.status === 'playing');
      }
    });

    return () => {
      console.log('Cleaning up socket listeners');
      socket.off('gameState');
    };
  }, [socket, gameId, toast]);

  const handleStartGame = () => {
    if (!socket || !gameId) return;
    socket.emit('startGame', { gameId });
  };

  const handleVote = (playerId: string) => {
    if (votedFor) return;
    setVotedFor(playerId);
    socket?.emit('vote', { gameId, votedForId: playerId });
  };

  if (gameOver) {
    return (
      <Container maxW="container.lg" py={8}>
        <Box textAlign="center" p={8} borderWidth={1} borderRadius="lg" boxShadow="md">
          <VStack spacing={6}>
            <Heading size="xl">Game Over!</Heading>
            <Text fontSize="xl">The {winner} won!</Text>
            <Button colorScheme="blue" size="lg" onClick={() => navigate('/')}>
              Back to Home
            </Button>
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
        
        {gameStarted ? (
          <Grid templateColumns={{ base: "1fr", md: "1fr 2fr" }} gap={6}>
            <GridItem>
              <Box p={6} borderWidth={1} borderRadius="lg" boxShadow="md" h="100%">
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Game Status</Heading>
                  <Text fontSize="xl" fontWeight="bold" p={4} bg="blue.50" borderRadius="md">
                    Game in progress
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
              <Text>Players joined: {players.length}</Text>
              {players.length >= 2 && (
                <Button colorScheme="green" size="lg" onClick={handleStartGame}>
                  Start Game
                </Button>
              )}
            </VStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
}; 