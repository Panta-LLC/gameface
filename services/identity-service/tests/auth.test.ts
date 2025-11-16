import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

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

import authRoutes from '../src/routes/auth';
import * as controllers from '../src/controllers/auth';

describe('Auth endpoints', () => {
  let app: express.Express;
  let redisClient: any;

  beforeAll(() => {
    // create a minimal express app with body parsing
    app = express();
    app.use(bodyParser.json());
    app.use('/', authRoutes);
    // Grab the same redis client instance used by the controller so we can set per-test mocks
    redisClient = controllers.redisClient;
  });

  beforeEach(() => {
    // Reset/mock client methods between tests to avoid cross-test interference
    redisClient.get = vi.fn();
    redisClient.set = vi.fn();
    redisClient.del = vi.fn();
    redisClient.expire = vi.fn();
  });

  it('should register a new user', async () => {
    redisClient.get = vi.fn().mockResolvedValue(null);
    redisClient.set = vi.fn().mockResolvedValue('OK');

    const res = await request(app)
      .post('/register')
      .send({ email: 'u@ex.com', password: 'passw0rd' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User created');
  });

  it('should not register an existing user', async () => {
    redisClient.get = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ email: 'u@ex.com', passwordHash: 'hash' }));

    const res = await request(app)
      .post('/register')
      .send({ email: 'u@ex.com', password: 'passw0rd' });
    expect(res.status).toBe(409);
  });

  it('should login an existing user with correct password', async () => {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('passw0rd', 10);
    redisClient.get = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ email: 'u@ex.com', passwordHash: hash }));

    const res = await request(app).post('/login').send({ email: 'u@ex.com', password: 'passw0rd' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});
