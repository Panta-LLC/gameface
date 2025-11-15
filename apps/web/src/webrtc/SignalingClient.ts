import { io, Socket } from 'socket.io-client';

interface SignalingMessage {
  type: string;
  [key: string]: any;
}

class SignalingClient {
  private socket: Socket;

  constructor(serverUrl: string) {
    this.socket = io(serverUrl);

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
    });
  }

  sendMessage(message: SignalingMessage) {
    this.socket.emit('message', message);
  }

  onMessage(callback: (message: SignalingMessage) => void) {
    this.socket.on('message', callback);
  }

  close() {
    this.socket.disconnect();
  }
}

export default SignalingClient;
