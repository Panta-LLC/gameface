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

  async disconnect() {
    await this.publisher.disconnect();
    await this.subscriber.disconnect();
  }
}

export default RedisPubSub;
