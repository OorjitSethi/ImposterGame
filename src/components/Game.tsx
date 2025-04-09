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
  item?: string;
  category?: string;
  isImposter?: boolean;
}

interface GameState {
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentRound: number;
  rounds: any[];
  votes: Record<string, string>;
  items: string[];
  category: string;
  imposterId: string;
}

interface GameOverData {
  eliminated: string[];
  items: string[];
  category: string;
  resultMessage: string;
  imposter: string;
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
  const [myItem, setMyItem] = useState<string | null>(null);
  const [myCategory, setMyCategory] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<string[]>([]);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [imposterId, setImposterId] = useState<string>('');
  const [gameCategory, setGameCategory] = useState<string>('');

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
      console.log('Current player:', currentPlayer);
      setIsHost(currentPlayer?.isHost || false);
      
      // Set current player's item and category
      if (currentPlayer?.item) {
        console.log('Setting player item:', currentPlayer.item);
        setMyItem(currentPlayer.item);
        setMyCategory(currentPlayer.category || '');
      }
      if (gameState.category) {
        console.log('Setting game category:', gameState.category);
        setGameCategory(gameState.category);
      }
      if (gameState.imposterId) {
        console.log('Setting imposter ID:', gameState.imposterId);
        setImposterId(gameState.imposterId);
      }

      // Update votedFor state based on game votes
      if (gameState.votes && socket.id && gameState.votes[socket.id]) {
        setVotedFor(gameState.votes[socket.id]);
      } else {
        setVotedFor(null);
      }
    });

    // Listen for game over
    socket.on('gameOver', (data: GameOverData) => {
      setEliminated(data.eliminated);
      setAllItems(data.items);
      setGameCategory(data.category);
      setResultMessage(data.resultMessage);
      setImposterId(data.imposter);
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
        
        // Set current player's item and category
        if (currentPlayer?.item) {
          setMyItem(currentPlayer.item);
          setMyCategory(currentPlayer.category || '');
        }
        if (response.gameState.category) {
          setGameCategory(response.gameState.category);
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
    
    // Reset local state
    setVotedFor(null);
    setMyItem(null);
    setMyCategory(null);
    setGameStatus('playing');
    setResultMessage('');
    setImposterId('');
    setEliminated([]);
    setAllItems([]);
    
    socket.emit('startGame', { gameId });
  };

  if (gameStatus === 'finished') {
    return (
      <Container maxW="container.lg" py={8}>
        <Box textAlign="center" p={8} borderWidth={1} borderRadius="lg" boxShadow="md">
          <VStack spacing={6}>
            <Heading size="xl">Game Over!</Heading>
            <Alert 
              status={resultMessage.includes('successfully') ? 'success' : 'error'} 
              borderRadius="md"
            >
              <AlertIcon />
              {resultMessage}
            </Alert>
            <Text fontSize="xl">
              {eliminated.length === 1 
                ? `${players.find(p => p.id === eliminated[0])?.name} was eliminated!`
                : 'It was a tie!'}
            </Text>
            <Box>
              <Text fontSize="lg" fontWeight="bold">The Imposter was:</Text>
              <Text fontSize="xl" color="red.500" fontWeight="bold">
                {players.find(p => p.id === imposterId)?.name}
              </Text>
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold">Category: {gameCategory}</Text>
              <Text fontSize="lg" fontWeight="bold">All Items:</Text>
              <VStack spacing={2} mt={2}>
                {allItems.map((item, index) => (
                  <Text key={index}>{item}</Text>
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
                  <Heading size="md">Your {myCategory}</Heading>
                  <Text fontSize="xl" fontWeight="bold" p={4} bg="blue.50" borderRadius="md">
                    {myItem}
                  </Text>
                  {socket?.id === imposterId && (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      You are the imposter! Your item is different from others. Try to blend in and avoid being voted out.
                    </Alert>
                  )}
                  <Text fontSize="sm" color="gray.600">
                    Discuss with other players to identify the imposter!
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
                              <Text 
                                fontWeight="bold" 
                                color="black"
                              >
                                {player.name}
                              </Text>
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