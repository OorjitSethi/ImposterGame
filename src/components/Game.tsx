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
  AlertTitle,
  AlertDescription,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
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
  imposterIds: string[];
  imposterCount: number;
  winner?: 'imposters' | 'crewmates';
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
  const [imposterIds, setImposterIds] = useState<string[]>([]);
  const [gameCategory, setGameCategory] = useState<string>('');
  const [imposterCount, setImposterCount] = useState<number>(1);

  const [gameState, setGameState] = useState<GameState>({
    players: [],
    status: 'waiting',
    currentRound: 0,
    rounds: [],
    votes: {},
    items: [],
    category: '',
    imposterIds: [],
    imposterCount: 1
  });

  useEffect(() => {
    if (!socket || !gameId) return;

    console.log('Setting up socket listeners for game:', gameId);
    
    // Listen for gameState updates
    socket.on('gameState', (newGameState: GameState) => {
      console.log('Received gameState:', newGameState);
      setGameState(newGameState);
      setPlayers(newGameState.players);
      setGameStatus(newGameState.status);
      
      // Check if current user is the host
      const currentPlayer = newGameState.players.find(p => p.id === socket.id);
      console.log('Current player:', currentPlayer);
      setIsHost(currentPlayer?.isHost || false);
      
      // Set current player's item and category
      if (currentPlayer?.item) {
        console.log('Setting player item:', currentPlayer.item);
        setMyItem(currentPlayer.item);
        setMyCategory(currentPlayer.category || '');
      }
      if (newGameState.category) {
        console.log('Setting game category:', newGameState.category);
        setGameCategory(newGameState.category);
      }
      if (newGameState.imposterIds) {
        console.log('Setting imposter IDs:', newGameState.imposterIds);
        setImposterIds(newGameState.imposterIds);
      }
      if (newGameState.imposterCount) {
        console.log('Setting imposter count:', newGameState.imposterCount);
        setImposterCount(newGameState.imposterCount);
      }

      // Update votedFor state based on game votes
      if (newGameState.votes && socket.id && newGameState.votes[socket.id]) {
        setVotedFor(newGameState.votes[socket.id]);
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
    socket.emit('startGame', { gameId, imposterCount });
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
    setImposterIds([]);
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
              <Text fontSize="lg" fontWeight="bold">The Imposters were:</Text>
              <List spacing={2}>
                {imposterIds.map((id) => (
                  <ListItem key={id}>
                    {players.find(p => p.id === id)?.name}
                  </ListItem>
                ))}
              </List>
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
        
        {gameStatus === 'waiting' ? (
          <Box p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
            <VStack spacing={4} align="stretch">
              <Heading size="md">Players in Room</Heading>
              <List spacing={2}>
                {players.map((player) => (
                  <ListItem key={player.id}>
                    <Flex align="center">
                      <Text>{player.name}</Text>
                      {player.isHost && (
                        <Badge ml={2} colorScheme="purple">Host</Badge>
                      )}
                    </Flex>
                  </ListItem>
                ))}
              </List>
              {isHost && (
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Number of Imposters</FormLabel>
                    <RadioGroup 
                      value={imposterCount.toString()} 
                      onChange={(value) => setImposterCount(parseInt(value))}
                    >
                      <HStack spacing={4}>
                        <Radio value="1">1 Imposter</Radio>
                        <Radio value="2">2 Imposters</Radio>
                      </HStack>
                    </RadioGroup>
                  </FormControl>
                  <Button 
                    colorScheme="blue" 
                    onClick={handleStartGame}
                    isDisabled={players.length < 3}
                  >
                    Start Game
                  </Button>
                  {players.length < 3 && (
                    <Text color="red.500" fontSize="sm">
                      Need at least 3 players to start the game
                    </Text>
                  )}
                </VStack>
              )}
            </VStack>
          </Box>
        ) : gameStatus === 'playing' ? (
          <Grid templateColumns={{ base: "1fr", md: "1fr 2fr" }} gap={6}>
            <GridItem>
              <Box p={6} borderWidth={1} borderRadius="lg" boxShadow="md" h="100%">
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Your {myCategory}</Heading>
                  <Text fontSize="xl" fontWeight="bold" p={4} bg="blue.50" borderRadius="md">
                    {myItem}
                  </Text>
                  {imposterIds.includes(socket?.id || '') && (
                    <Alert 
                      status="warning" 
                      borderRadius="md"
                      flexDirection="column"
                      alignItems="flex-start"
                      gap={2}
                    >
                      <Flex>
                        <AlertIcon />
                        <AlertTitle>You are an imposter!</AlertTitle>
                      </Flex>
                      <AlertDescription>
                        <VStack align="stretch" spacing={2}>
                          <Text>Your item is different from others. Try to blend in and avoid being voted out.</Text>
                          {imposterCount > 1 && (
                            <Box>
                              <Text fontWeight="bold">Your fellow imposters:</Text>
                              <List spacing={1} mt={1}>
                                {players
                                  .filter(p => imposterIds.includes(p.id) && p.id !== socket?.id)
                                  .map(p => (
                                    <ListItem key={p.id}>
                                      {p.name}
                                    </ListItem>
                                  ))}
                              </List>
                            </Box>
                          )}
                        </VStack>
                      </AlertDescription>
                    </Alert>
                  )}
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
                              <Text fontWeight="bold">
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
        ) : gameStatus === 'finished' ? (
          <Box p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
            <VStack spacing={4} align="center">
              <Heading size="lg">
                {gameState.winner === 'imposters' ? 'Imposters Win!' : 'Crewmates Win!'}
              </Heading>
              <Text>
                {gameState.winner === 'imposters' 
                  ? 'The imposters successfully blended in and survived!'
                  : 'The crewmates successfully identified and eliminated the imposters!'}
              </Text>
              <Box>
                <Text fontSize="lg" fontWeight="bold">The Imposters were:</Text>
                <List spacing={2} mt={2}>
                  {players
                    .filter(player => imposterIds.includes(player.id))
                    .map(player => (
                      <ListItem key={player.id}>
                        {player.name}
                      </ListItem>
                    ))}
                </List>
              </Box>
              <Button colorScheme="blue" onClick={() => navigate('/')}>
                Return to Home
              </Button>
            </VStack>
          </Box>
        ) : null}
      </VStack>
    </Container>
  );
}; 