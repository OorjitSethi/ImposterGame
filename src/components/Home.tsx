import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  Heading,
  Text,
  useToast,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Container,
  Divider,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const Home: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [numPlayers, setNumPlayers] = useState(5);
  const [numImposters, setNumImposters] = useState(1);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const toast = useToast();

  const createGame = () => {
    if (!playerName) {
      toast({
        title: 'Error',
        description: 'Please enter your name',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    socket?.emit('createGame', { numPlayers, numImposters });
  };

  const joinGame = () => {
    if (!playerName || !gameCode) {
      toast({
        title: 'Error',
        description: 'Please enter both your name and game code',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    socket?.emit('joinGame', { gameId: gameCode, playerName });
  };

  React.useEffect(() => {
    if (!socket) return;

    socket.on('gameCreated', ({ gameId }) => {
      socket.emit('joinGame', { gameId, playerName });
      navigate(`/game/${gameId}`);
    });

    socket.on('error', (message) => {
      toast({
        title: 'Error',
        description: message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    });

    return () => {
      socket.off('gameCreated');
      socket.off('error');
    };
  }, [socket, navigate, toast, playerName]);

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center" mb={4}>
          <Heading size="xl">Movie Imposter Game</Heading>
          <Text fontSize="lg" mt={2}>Create or join a game to start playing!</Text>
        </Box>

        <FormControl mb={6}>
          <FormLabel fontSize="lg">Your Name</FormLabel>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            size="lg"
          />
        </FormControl>

        <HStack spacing={8} align="start">
          <Box flex="1" p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
            <VStack spacing={4} align="stretch">
              <Heading size="md" textAlign="center">Create Game</Heading>
              <FormControl>
                <FormLabel>Number of Players</FormLabel>
                <NumberInput
                  value={numPlayers}
                  onChange={(_, value) => setNumPlayers(value)}
                  min={3}
                  max={10}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Number of Imposters</FormLabel>
                <NumberInput
                  value={numImposters}
                  onChange={(_, value) => setNumImposters(value)}
                  min={1}
                  max={Math.floor(numPlayers / 2)}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <Button colorScheme="blue" onClick={createGame} size="lg" mt={4}>
                Create Game
              </Button>
            </VStack>
          </Box>

          <Divider orientation="vertical" h="auto" />

          <Box flex="1" p={6} borderWidth={1} borderRadius="lg" boxShadow="md">
            <VStack spacing={4} align="stretch">
              <Heading size="md" textAlign="center">Join Game</Heading>
              <FormControl>
                <FormLabel>Game Code</FormLabel>
                <Input
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                  placeholder="Enter game code"
                  size="lg"
                />
              </FormControl>

              <Button colorScheme="green" onClick={joinGame} size="lg" mt={4}>
                Join Game
              </Button>
            </VStack>
          </Box>
        </HStack>
      </VStack>
    </Container>
  );
};

export default Home; 