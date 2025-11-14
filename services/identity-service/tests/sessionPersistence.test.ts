import request from 'supertest';
import { app } from '../src/app';
import { createClient } from 'redis';

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
  })),
}));

describe('Session Persistence', () => {
  let redisClient: any;

  beforeAll(() => {
    redisClient = createClient();
  });

  it('should validate an active session', async () => {
    redisClient.get.mockResolvedValue('valid-session');

    const response = await request(app)
      .get('/session')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Session is active');
  });

  it('should return 401 for an expired session', async () => {
    redisClient.get.mockResolvedValue(null);

    const response = await request(app)
      .get('/session')
      .set('Authorization', 'Bearer expired-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Session expired or invalid');
  });

  it('should return 400 for missing token', async () => {
    const response = await request(app).get('/session');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No token provided');
  });
});