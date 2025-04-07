import { ChakraProvider, Box, Container, Alert, AlertIcon, AlertTitle, AlertDescription, extendTheme } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home, Game } from './components';
import { SocketProvider, useSocket } from './context/SocketContext';

// Create a custom theme
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
    },
  },
  components: {
    Container: {
      baseStyle: {
        maxW: 'container.lg',
      },
    },
  },
});

const ConnectionStatus = () => {
  const { isConnected, error } = useSocket();
  
  if (error) {
    return (
      <Alert status="error" mb={4}>
        <AlertIcon />
        <AlertTitle mr={2}>Connection Error!</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!isConnected) {
    return (
      <Alert status="warning" mb={4}>
        <AlertIcon />
        <AlertTitle mr={2}>Connecting...</AlertTitle>
        <AlertDescription>Please wait while we connect to the server.</AlertDescription>
      </Alert>
    );
  }
  
  return null;
};

function App() {
  return (
    <ChakraProvider theme={theme}>
      <SocketProvider>
        <Box minH="100vh">
          <Container py={4}>
            <ConnectionStatus />
          </Container>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/game/:gameId" element={<Game />} />
            </Routes>
          </Router>
        </Box>
      </SocketProvider>
    </ChakraProvider>
  );
}

export default App;
