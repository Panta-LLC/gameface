interface SignalingMessage {
  type: string;
  [key: string]: any;
}

class SignalingClient {
  private socket: WebSocket;
  private isOpen = false;
  private pending: string[] = [];
  private openCallbacks: Array<() => void> = [];

  constructor(serverUrl: string) {
    this.socket = new WebSocket(serverUrl);

    this.socket.addEventListener('open', () => {
      console.log('Connected to signaling server');
      this.isOpen = true;
      // Flush queued messages
      if (this.pending.length) {
        for (const payload of this.pending) {
          try {
            this.socket.send(payload);
          } catch (e) {
            console.error('Failed to flush message', e);
          }
        }
        this.pending = [];
      }
      // Fire onOpen callbacks
      if (this.openCallbacks.length) {
        for (const cb of this.openCallbacks) {
          try {
            cb();
          } catch (e) {
            console.error('onOpen callback error', e);
          }
        }
        this.openCallbacks = [];
      }
    });

    this.socket.addEventListener('close', () => {
      console.log('Disconnected from signaling server');
      this.isOpen = false;
    });

    this.socket.addEventListener('error', (err) => {
      console.error('WebSocket error:', err);
    });
  }

  sendMessage(message: SignalingMessage) {
    try {
      const payload = JSON.stringify(message);
      if (this.isOpen) {
        this.socket.send(payload);
      } else {
        // Queue until socket opens
        this.pending.push(payload);
      }
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

  onOpen(callback: () => void) {
    if (this.isOpen) {
      try {
        callback();
      } catch (e) {
        console.error('onOpen immediate callback error', e);
      }
    } else {
      this.openCallbacks.push(callback);
    }
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
