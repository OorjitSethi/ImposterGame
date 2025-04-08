import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  VStack,
  Text,
  useToast
} from '@chakra-ui/react';

export const Home: React.FC = () => {
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  const { socket, isConnected, error } = useSocket();
  const toast = useToast();

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your name',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsCreating(true);
    socket?.emit('createGame', (response: { gameId: string; error?: string }) => {
      setIsCreating(false);
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      navigate(`/game/${response.gameId}`);
    });
  };

  const handleJoinGame = () => {
    if (!gameId.trim() || !playerName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both game ID and your name',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsJoining(true);
    socket?.emit('joinGame', { gameId, playerName }, (response: { success?: boolean; error?: string }) => {
      setIsJoining(false);
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      navigate(`/game/${gameId}`);
    });
  };

  if (error) {
    return (
      <Container centerContent py={10}>
        <Box p={8} maxWidth="500px" borderWidth={1} borderRadius={8} boxShadow="lg">
          <VStack spacing={4}>
            <Heading>Connection Error</Heading>
            <Text color="red.500">{error}</Text>
            <Button onClick={() => window.location.reload()}>Retry Connection</Button>
          </VStack>
        </Box>
      </Container>
    );
  }

  return (
    <Container centerContent py={10}>
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius={8} boxShadow="lg">
        <VStack spacing={4}>
          <Heading>Movie Imposter</Heading>
          <Text>Test your movie knowledge and find the imposters!</Text>
          
          <FormControl isRequired>
            <FormLabel>Your Name</FormLabel>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
            />
          </FormControl>

          <Button
            colorScheme="blue"
            width="full"
            onClick={handleCreateGame}
            isLoading={isCreating}
            loadingText="Creating..."
            isDisabled={!isConnected}
          >
            Create New Game
          </Button>

          <Text>or</Text>

          <FormControl>
            <FormLabel>Game ID</FormLabel>
            <Input
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Enter game ID"
            />
          </FormControl>

          <Button
            colorScheme="green"
            width="full"
            onClick={handleJoinGame}
            isLoading={isJoining}
            loadingText="Joining..."
            isDisabled={!isConnected}
          >
            Join Game
          </Button>
        </VStack>
      </Box>
    </Container>
  );
}; 