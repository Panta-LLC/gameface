interface SignalingMessage {
  type: string;
  [key: string]: unknown;
}

class SignalingClient {
  private socket: WebSocket;
  private isOpen = false;
  private pending: string[] = [];
  private openCallbacks: Array<() => void> = [];
  private messageHandlers: Set<(msg: SignalingMessage) => void> = new Set();

  constructor(serverUrl: string) {
    this.socket = new WebSocket(serverUrl);

    // Single message forwarder — parses incoming messages and forwards to
    // registered handlers. Using one centralized listener makes it easy to
    // register/unregister logical handlers.
    this.socket.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? event.data : '' + event.data;
        const parsed = JSON.parse(data);
        for (const h of Array.from(this.messageHandlers)) {
          try {
            h(parsed);
          } catch (_e) {
            console.error('Signaling handler error', _e);
          }
        }
      } catch (_e) {
        console.error('Failed to parse signaling message:', _e, event.data);
      }
    });

    this.socket.addEventListener('open', () => {
      console.log('Connected to signaling server');
      this.isOpen = true;
      // Flush queued messages
      if (this.pending.length) {
        for (const payload of this.pending) {
          try {
            this.socket.send(payload);
          } catch (_e) {
            console.error('Failed to flush message', _e);
          }
        }
        this.pending = [];
      }
      // Fire onOpen callbacks
      if (this.openCallbacks.length) {
        for (const cb of this.openCallbacks) {
          try {
            cb();
          } catch (_e) {
            console.error('onOpen callback error', _e);
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

  // Register a message handler. Returns an unsubscribe function to remove it.
  onMessage(callback: (message: SignalingMessage) => void) {
    this.messageHandlers.add(callback);
    return () => {
      this.messageHandlers.delete(callback);
    };
  }

  onDisconnect(callback: () => void) {
    this.socket.addEventListener('close', callback);
    return () => this.socket.removeEventListener('close', callback);
  }

  onOpen(callback: () => void) {
    if (this.isOpen) {
      try {
        callback();
      } catch (e) {
        console.error('onOpen immediate callback error', e);
      }
      return () => {};
    } else {
      this.openCallbacks.push(callback);
      return () => {
        this.openCallbacks = this.openCallbacks.filter((c) => c !== callback);
      };
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
