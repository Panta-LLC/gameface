import { Server, Socket } from 'socket.io';
import http from 'http';

const createSignalingServer = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('A user connected:', socket.id);

    socket.on('offer', (data: { target: string; offer: RTCSessionDescriptionInit }) => {
      const { target, offer } = data;
      io.to(target).emit('offer', { sender: socket.id, offer });
    });

    socket.on('answer', (data: { target: string; answer: RTCSessionDescriptionInit }) => {
      const { target, answer } = data;
      io.to(target).emit('answer', { sender: socket.id, answer });
    });

    socket.on('ice-candidate', (data: { target: string; candidate: RTCIceCandidate }) => {
      const { target, candidate } = data;
      io.to(target).emit('ice-candidate', { sender: socket.id, candidate });
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
    });
  });

  return io;
};

export default createSignalingServer;
