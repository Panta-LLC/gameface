export declare class RedisPubSub {
    private publisher;
    private subscriber;
    private connected;
    private connectingPromise;
    constructor();
    connect(): Promise<void>;
    publish(channel: string, message: object): Promise<void>;
    set(key: string, value: object): Promise<void>;
    /**
     * Set a key with an expire in seconds. Uses Redis SET with EX option.
     */
    setWithTTL(key: string, value: object, ttlSeconds: number): Promise<void>;
    get(key: string): Promise<any>;
    del(key: string): Promise<void>;
    subscribe(channel: string, handler: (message: object) => void): Promise<void>;
    psubscribe(pattern: string, handler: (message: object, channel: string) => void): Promise<void>;
    disconnect(): Promise<void>;
}
export default RedisPubSub;
