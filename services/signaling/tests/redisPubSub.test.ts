import { RedisPubSub } from '../src/redisPubSub';
import { createClient } from 'redis';

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    on: jest.fn(),
  })),
}));

describe('RedisPubSub', () => {
  let redisPubSub: RedisPubSub;
  let mockPublisher: any;
  let mockSubscriber: any;

  beforeEach(() => {
    redisPubSub = new RedisPubSub();
    mockPublisher = createClient();
    mockSubscriber = createClient();
  });

  afterEach(async () => {
    await redisPubSub.disconnect();
  });

  it('should connect to Redis', async () => {
    await redisPubSub.connect();
    expect(mockPublisher.connect).toHaveBeenCalled();
    expect(mockSubscriber.connect).toHaveBeenCalled();
  });

  it('should publish a message to a channel', async () => {
    const channel = 'test-channel';
    const message = { type: 'test', payload: 'data' };

    await redisPubSub.publish(channel, message);

    expect(mockPublisher.publish).toHaveBeenCalledWith(channel, JSON.stringify(message));
  });

  it('should subscribe to a channel and handle messages', async () => {
    const channel = 'test-channel';
    const message = { type: 'test', payload: 'data' };
    const handler = jest.fn();

    await redisPubSub.subscribe(channel, handler);

    const subscribeCallback = mockSubscriber.subscribe.mock.calls[0][1];
    subscribeCallback(JSON.stringify(message));

    expect(handler).toHaveBeenCalledWith(message);
  });

  it('should handle errors during message parsing', async () => {
    const channel = 'test-channel';
    const handler = jest.fn();

    await redisPubSub.subscribe(channel, handler);

    const subscribeCallback = mockSubscriber.subscribe.mock.calls[0][1];
    subscribeCallback('invalid-json');

    expect(handler).not.toHaveBeenCalled();
  });
});
