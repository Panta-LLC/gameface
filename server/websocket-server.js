const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    console.log(`Received message from client: ${message}`);
    try {
      const parsedMessage = JSON.parse(message);
      // Broadcast the message to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          const jsonMessage = JSON.stringify(parsedMessage);
          console.log(`Broadcasting message to client: ${jsonMessage}`);
          client.send(jsonMessage);
        }
      });
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server is running on ws://localhost:8080');