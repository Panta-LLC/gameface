import { EventEmitter } from 'events';

// Temporarily use `any` for RTCPeerConnection to bypass missing type declarations
const RTCPeerConnection: any = require('wrtc').RTCPeerConnection;

export class ConnectionStability extends EventEmitter {
  private peerConnection: RTCPeerConnection;
  private retryCount: number = 0;
  private readonly maxRetries: number = 5;
  private readonly retryBackoff: number[] = [1000, 2000, 4000, 8000, 16000];
  private readonly maxRecoveryTime: number = 30000;
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor(peerConnection: RTCPeerConnection) {
    super();
    this.peerConnection = peerConnection;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.peerConnection.onconnectionstatechange = () => {
      switch (this.peerConnection.connectionState) {
        case 'connected':
          console.log('Connection established successfully.');
          this.resetRecovery();
          break;
        case 'disconnected':
        case 'failed':
          console.warn('Connection lost. Attempting to recover...');
          this.startRecovery();
          break;
        case 'closed':
          console.log('Connection closed.');
          break;
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection.iceConnectionState === 'failed') {
        console.warn('ICE connection failed. Restarting ICE...');
        this.restartIce();
      }
    };
  }

  private startRecovery() {
    if (this.retryCount >= this.maxRetries) {
      console.error('Max recovery attempts reached. Connection failed.');
      this.emit('recoveryFailed');
      return;
    }

    const backoff =
      this.retryBackoff[this.retryCount] || this.retryBackoff[this.retryBackoff.length - 1];
    console.log(`Attempting recovery in ${backoff}ms...`);

    this.recoveryTimer = setTimeout(() => {
      this.retryCount++;
      this.restartIce();
      this.startRecovery();
    }, backoff);
  }

  private resetRecovery() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    this.retryCount = 0;
  }

  private restartIce() {
    try {
      this.peerConnection.restartIce();
      console.log('ICE restart triggered.');
      this.emit('iceRestart');
    } catch (error) {
      console.error('Failed to restart ICE:', error);
    }
  }
}
