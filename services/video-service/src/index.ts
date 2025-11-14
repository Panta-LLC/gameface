import http from 'http';
import createSignalingServer from './signalingServer';

const server = http.createServer();
const io = createSignalingServer(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server is running on port ${PORT}`);
});
