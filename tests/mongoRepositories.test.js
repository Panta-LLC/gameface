const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  UserRepository,
  ProfileRepository,
  SessionRepository,
  AuditEventRepository,
} = require('../repositories/mongoRepositories');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('MongoDB Repositories', () => {
  describe('UserRepository', () => {
    it('should create and retrieve a user', async () => {
      const userRepo = new UserRepository();
      const user = await userRepo.create({ name: 'John Doe', email: 'john.doe@example.com' });
      const retrievedUser = await userRepo.findById(user._id);
      expect(retrievedUser.name).toBe('John Doe');
      expect(retrievedUser.email).toBe('john.doe@example.com');
    });
  });

  describe('ProfileRepository', () => {
    it('should create and retrieve a profile', async () => {
      const profileRepo = new ProfileRepository();
      const profile = await profileRepo.create({ userId: '123', bio: 'Hello World' });
      const retrievedProfile = await profileRepo.findById(profile._id);
      expect(retrievedProfile.bio).toBe('Hello World');
    });
  });

  describe('SessionRepository', () => {
    it('should create and retrieve a session', async () => {
      const sessionRepo = new SessionRepository();
      const session = await sessionRepo.create({ userId: '123', token: 'abc123' });
      const retrievedSession = await sessionRepo.findById(session._id);
      expect(retrievedSession.token).toBe('abc123');
    });
  });

  describe('AuditEventRepository', () => {
    it('should create and retrieve an audit event', async () => {
      const auditEventRepo = new AuditEventRepository();
      const event = await auditEventRepo.create({ userId: '123', action: 'LOGIN' });
      const retrievedEvent = await auditEventRepo.findById(event._id);
      expect(retrievedEvent.action).toBe('LOGIN');
    });
  });
});
