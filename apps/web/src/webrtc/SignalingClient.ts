interface SignalingMessage {
  type: string;
  [key: string]: any;
}

class SignalingClient {
  private socket: WebSocket;

  constructor(serverUrl: string) {
    this.socket = new WebSocket(serverUrl);

    this.socket.addEventListener('open', () => {
      console.log('Connected to signaling server');
    });

    this.socket.addEventListener('close', () => {
      console.log('Disconnected from signaling server');
    });

    this.socket.addEventListener('error', (err) => {
      console.error('WebSocket error:', err);
    });
  }

  sendMessage(message: SignalingMessage) {
    try {
      const payload = JSON.stringify(message);
      this.socket.send(payload);
    } catch (e) {
      console.error('Failed to send signaling message:', e);
    }
  }

  onMessage(callback: (message: SignalingMessage) => void) {
    this.socket.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? event.data : '' + event.data;
        const parsed = JSON.parse(data);
        callback(parsed);
      } catch (e) {
        console.error('Failed to parse signaling message:', e, event.data);
      }
    });
  }

  onDisconnect(callback: () => void) {
    this.socket.addEventListener('close', callback);
  }

  close() {
    try {
      this.socket.close();
    } catch (e) {
      console.error('Error closing WebSocket:', e);
    }
  }
}

export default SignalingClient;
