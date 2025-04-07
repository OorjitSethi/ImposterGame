# Movie Imposter Game

A fun multiplayer game where players try to identify the imposter among them. Each player gets a movie title, and the imposter gets a different one. Players discuss and vote to find the imposter!

## Features

- Create or join game rooms with unique codes
- Customizable number of players and imposters
- Real-time gameplay with Socket.IO
- Modern UI with Chakra UI
- Easy deployment to Render

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd movie-imposter-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Start the backend server:
```bash
npm start
```

The application will be available at `http://localhost:5173`

## Deployment to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the following settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node
   - Node Version: 18.x or higher

4. Add the following environment variables:
   - `PORT`: 3001 (or your preferred port)
   - `NODE_ENV`: production

5. Deploy!

## How to Play

1. Create a new game or join an existing one using a game code
2. Wait for all players to join
3. Each player will receive a movie title (except the imposter who gets a different one)
4. Discuss with other players to try to identify the imposter
5. Vote for who you think is the imposter
6. The game ends when all players have voted
7. If the imposter is eliminated, the crewmates win. If not, the imposter wins!

## Technologies Used

- React
- TypeScript
- Vite
- Socket.IO
- Chakra UI
- Express.js
