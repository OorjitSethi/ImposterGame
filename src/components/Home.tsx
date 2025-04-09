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
    if (!socket) return;
    
    socket.emit('createGame', (response: { gameId?: string; error?: string }) => {
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
      if (response.gameId) {
        setGameId(response.gameId);
        setPlayerName('Host');
        navigate(`/game/${response.gameId}`);
      }
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
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8}>
        <Heading>Movie Imposter</Heading>
        <Text fontSize="xl" textAlign="center">
          A social deduction game where players try to identify who has a different movie!
        </Text>
        
        {gameId && (
          <Box p={4} borderWidth={1} borderRadius="lg" bg="blue.50" w="100%">
            <VStack spacing={2}>
              <Text fontWeight="bold">Share this game code with your friends:</Text>
              <Text fontSize="2xl" fontFamily="monospace" bg="white" p={2} borderRadius="md">
                {gameId}
              </Text>
              <Text>Or share this link:</Text>
              <Text fontSize="lg" color="blue.600" wordBreak="break-all">
                {window.location.origin}/game/{gameId}
              </Text>
            </VStack>
          </Box>
        )}

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
    </Container>
  );
}; 