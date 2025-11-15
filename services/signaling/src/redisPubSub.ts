import { createClient } from 'redis';

export class RedisPubSub {
  private publisher;
  private subscriber;

  constructor() {
    this.publisher = createClient();
    this.subscriber = createClient();

    this.publisher.on('error', (err) => console.error('Redis Publisher Error:', err));
    this.subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));
  }

  async connect() {
    await this.publisher.connect();
    await this.subscriber.connect();
  }

  async publish(channel: string, message: object) {
    try {
      const payload = JSON.stringify(message);
      await this.publisher.publish(channel, payload);
      console.log(`Message published to ${channel}:`, payload);
    } catch (error) {
      console.error('Error publishing message:', error);
    }
  }

  async subscribe(channel: string, handler: (message: object) => void) {
    try {
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          handler(parsedMessage);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      console.log(`Subscribed to ${channel}`);
    } catch (error) {
      console.error('Error subscribing to channel:', error);
    }
  }

  async disconnect() {
    await this.publisher.disconnect();
    await this.subscriber.disconnect();
  }
}
