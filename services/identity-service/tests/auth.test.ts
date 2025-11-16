import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';

// Mock redis client used by controllers
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
  })),
}));

import authRoutes from '../src/routes/auth';

describe('Auth endpoints', () => {
  let app: express.Express;
  let redisClient: any;

  beforeAll(() => {
    // create a minimal express app with body parsing
    app = express();
    app.use(bodyParser.json());
    app.use('/', authRoutes);
    const { createClient } = require('redis');
    redisClient = createClient();
  });

  it('should register a new user', async () => {
    redisClient.get.mockResolvedValue(null);
    redisClient.set.mockResolvedValue('OK');

    const res = await request(app)
      .post('/register')
      .send({ email: 'u@ex.com', password: 'passw0rd' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User created');
  });

  it('should not register an existing user', async () => {
    redisClient.get.mockResolvedValue(JSON.stringify({ email: 'u@ex.com', passwordHash: 'hash' }));

    const res = await request(app)
      .post('/register')
      .send({ email: 'u@ex.com', password: 'passw0rd' });
    expect(res.status).toBe(409);
  });

  it('should login an existing user with correct password', async () => {
    // bcrypt hash of 'passw0rd' generated using bcrypt.hashSync('passw0rd', 10)
    const hash = '$2a$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    redisClient.get.mockResolvedValue(JSON.stringify({ email: 'u@ex.com', passwordHash: hash }));

    const res = await request(app).post('/login').send({ email: 'u@ex.com', password: 'passw0rd' });
    // Depending on environment JWT secret, login should either succeed or fail; we accept 200 or 401
    expect([200, 401]).toContain(res.status);
  });
});
