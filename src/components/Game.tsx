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
  isImposter: boolean;
  movie: string;
}

const Game: React.FC = () => {
  const { gameId } = useParams();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [myMovie, setMyMovie] = useState<string>('');
  const [gameStarted, setGameStarted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('playerJoined', ({ players }: { players: Player[] }) => {
      setPlayers(players);
    });

    socket.on('gameStarted', ({ players }: { players: Player[] }) => {
      setPlayers(players);
      setGameStarted(true);
      const currentPlayer = players.find((p: Player) => p.id === socket.id);
      if (currentPlayer) {
        setMyMovie(currentPlayer.movie);
      }
    });

    socket.on('voteCast', ({ votes }: { votes: Record<string, string> }) => {
      // Update UI to show who has voted
    });

    socket.on('gameOver', ({ eliminated, wasImposter }: { eliminated: string[], wasImposter: boolean }) => {
      setGameOver(true);
      setWinner(wasImposter ? 'Imposter' : 'Crewmates');
    });

    return () => {
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('voteCast');
      socket.off('gameOver');
    };
  }, [socket]);

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
                  <Heading size="md">Your Movie</Heading>
                  <Text fontSize="xl" fontWeight="bold" p={4} bg="blue.50" borderRadius="md">
                    {myMovie}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Discuss this movie with other players to try to identify the imposter!
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
                              <Badge colorScheme={player.isImposter ? 'red' : 'green'}>
                                {player.isImposter ? 'Imposter' : 'Crewmate'}
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
            </VStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default Game; 