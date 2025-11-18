import { createClient } from 'redis';
export class RedisPubSub {
    publisher;
    subscriber;
    connected = false;
    connectingPromise = null;
    constructor() {
        this.publisher = createClient();
        this.subscriber = createClient();
        this.publisher.on('error', (err) => console.error('Redis Publisher Error:', err));
        this.subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));
    }
    async connect() {
        if (this.connected)
            return;
        if (this.connectingPromise)
            return this.connectingPromise;
        this.connectingPromise = (async () => {
            await this.publisher.connect();
            await this.subscriber.connect();
            this.connected = true;
            this.connectingPromise = null;
        })();
        return this.connectingPromise;
    }
    async publish(channel, message) {
        try {
            const payload = JSON.stringify(message);
            console.log(`Publishing message to channel ${channel}:`, payload);
            await this.publisher.publish(channel, payload);
            console.log(`Message successfully published to ${channel}`);
        }
        catch (error) {
            console.error('Error publishing message:', error);
        }
    }
    // Simple key/value helpers so callers can persist arbitrary JSON state
    async set(key, value) {
        try {
            const payload = JSON.stringify(value);
            await this.publisher.set(key, payload);
        }
        catch (error) {
            console.error('Error setting key in Redis:', error);
        }
    }
    /**
     * Set a key with an expire in seconds. Uses Redis SET with EX option.
     */
    async setWithTTL(key, value, ttlSeconds) {
        try {
            const payload = JSON.stringify(value);
            // node-redis v4 supports set with options { EX: seconds }
            // @ts-ignore
            await this.publisher.set(key, payload, { EX: ttlSeconds });
        }
        catch (error) {
            console.error('Error setting key with TTL in Redis:', error);
        }
    }
    async get(key) {
        try {
            const raw = await this.publisher.get(key);
            if (!raw)
                return null;
            return JSON.parse(raw);
        }
        catch (error) {
            console.error('Error getting key from Redis:', error);
            return null;
        }
    }
    async del(key) {
        try {
            await this.publisher.del(key);
        }
        catch (error) {
            console.error('Error deleting key from Redis:', error);
        }
    }
    async subscribe(channel, handler) {
        try {
            console.log(`Subscribing to channel ${channel}`);
            await this.subscriber.subscribe(channel, (message) => {
                try {
                    console.log(`Message received on channel ${channel}:`, message);
                    const parsedMessage = JSON.parse(message);
                    handler(parsedMessage);
                }
                catch (error) {
                    console.error('Error parsing message:', error);
                }
            });
            console.log(`Successfully subscribed to ${channel}`);
        }
        catch (error) {
            console.error('Error subscribing to channel:', error);
        }
    }
    // Pattern subscribe - subscribe to channels matching a pattern (e.g. 'signaling:room:*')
    async psubscribe(pattern, handler) {
        try {
            console.log(`Pattern-subscribing to ${pattern}`);
            // pSubscribe provides (message, channel) args
            // @ts-ignore - redis types may differ depending on installed version
            await this.subscriber.pSubscribe(pattern, (message, channel) => {
                try {
                    console.log(`Message received on channel ${channel}:`, message);
                    const parsedMessage = JSON.parse(message);
                    handler(parsedMessage, channel);
                }
                catch (error) {
                    console.error('Error parsing pattern message:', error);
                }
            });
            console.log(`Successfully pattern-subscribed to ${pattern}`);
        }
        catch (error) {
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
