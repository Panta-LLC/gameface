import { createClient } from 'redis';

export class RedisPubSub {
  private publisher;
  private subscriber;
  private connected = false;
  private connectingPromise: Promise<void> | null = null;

  constructor() {
    this.publisher = createClient();
    this.subscriber = createClient();

    this.publisher.on('error', (err) => console.error('Redis Publisher Error:', err));
    this.subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));
  }

  async connect() {
    if (this.connected) return;
    if (this.connectingPromise) return this.connectingPromise;
    this.connectingPromise = (async () => {
      await this.publisher.connect();
      await this.subscriber.connect();
      this.connected = true;
      this.connectingPromise = null;
    })();
    return this.connectingPromise;
  }

  async publish(channel: string, message: object) {
    try {
      const payload = JSON.stringify(message);
      console.log(`Publishing message to channel ${channel}:`, payload);
      await this.publisher.publish(channel, payload);
      console.log(`Message successfully published to ${channel}`);
    } catch (error) {
      console.error('Error publishing message:', error);
    }
  }

  async subscribe(channel: string, handler: (message: object) => void) {
    try {
      console.log(`Subscribing to channel ${channel}`);
      await this.subscriber.subscribe(channel, (message) => {
        try {
          console.log(`Message received on channel ${channel}:`, message);
          const parsedMessage = JSON.parse(message);
          handler(parsedMessage);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      console.log(`Successfully subscribed to ${channel}`);
    } catch (error) {
      console.error('Error subscribing to channel:', error);
    }
  }

  // Pattern subscribe - subscribe to channels matching a pattern (e.g. 'signaling:room:*')
  async psubscribe(pattern: string, handler: (message: object, channel: string) => void) {
    try {
      console.log(`Pattern-subscribing to ${pattern}`);
      // pSubscribe provides (message, channel) args
      // @ts-ignore - redis types may differ depending on installed version
      await (this.subscriber as any).pSubscribe(pattern, (message: string, channel: string) => {
        try {
          console.log(`Message received on channel ${channel}:`, message);
          const parsedMessage = JSON.parse(message);
          handler(parsedMessage, channel);
        } catch (error) {
          console.error('Error parsing pattern message:', error);
        }
      });
      console.log(`Successfully pattern-subscribed to ${pattern}`);
    } catch (error) {
      console.error('Error psubscribing to pattern:', error);
    }
  }

  async disconnect() {
    await this.publisher.disconnect();
    await this.subscriber.disconnect();
    this.connected = false;
  }
}

export default RedisPubSub;
