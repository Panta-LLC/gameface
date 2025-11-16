import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Mock redis client used by controllers (vitest `vi` global)
vi.mock('redis', () => {
  const client = {
    on: vi.fn(),
    connect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
  };
  return { createClient: vi.fn(() => client) };
});

import jwt from 'jsonwebtoken';

import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from '../src/routes/auth';
import * as controllers from '../src/controllers/auth';

describe('Session Persistence', () => {
  let redisClient: any;
  let app: express.Express;

  beforeAll(() => {
    // Use the controller's redis client instance so our mocks affect the handlers
    redisClient = controllers.redisClient;

    app = express();
    app.use(bodyParser.json());
    app.use('/', authRoutes);
  });

  beforeEach(() => {
    redisClient.get = vi.fn();
    redisClient.set = vi.fn();
    redisClient.del = vi.fn();
    redisClient.expire = vi.fn();
  });

  it('should validate an active session', async () => {
    // Return null for revoked token lookup, and session JSON for session lookup
    redisClient.get = vi.fn((key: string) => {
      if (key && key.startsWith('revoked:refresh:')) return Promise.resolve(null);
      if (key && key.startsWith('session:')) return Promise.resolve(JSON.stringify({ email: 'u@ex.com' }));
      return Promise.resolve(null);
    });

    // Create a real JWT signed with dev secret so jwt.verify works in the handler
    const token = jwt.sign({ sub: 'u@ex.com' }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1h' });

    const response = await request(app).get('/session').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Session is active');
  });

  it('should return 401 for an expired session', async () => {
    // Simulate missing session data
    redisClient.get = vi.fn().mockResolvedValue(null);

    const response = await request(app)
      .get('/session')
      .set('Authorization', 'Bearer expired-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  it('should return 400 for missing token', async () => {
    const response = await request(app).get('/session');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No token provided');
  });
});
