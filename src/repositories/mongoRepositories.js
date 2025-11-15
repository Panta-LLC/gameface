const { User, Profile, Session, AuditEvent } = require('./mongoSchemas');

class UserRepository {
  async createUser(userData) {
    const user = new User(userData);
    return user.save();
  }

  async findUserById(userId) {
    return User.findById(userId);
  }

  async findUserByEmail(email) {
    return User.findOne({ emailLower: email.toLowerCase() });
  }

  async updateUser(userId, updateData) {
    return User.findByIdAndUpdate(userId, updateData, { new: true });
  }

  async deleteUser(userId) {
    return User.findByIdAndDelete(userId);
  }
}

class ProfileRepository {
  async createProfile(profileData) {
    const profile = new Profile(profileData);
    return profile.save();
  }

  async findProfileByUserId(userId) {
    return Profile.findOne({ userId });
  }

  async updateProfile(profileId, updateData) {
    return Profile.findByIdAndUpdate(profileId, updateData, { new: true });
  }

  async deleteProfile(profileId) {
    return Profile.findByIdAndDelete(profileId);
  }
}

class SessionRepository {
  async createSession(sessionData) {
    const session = new Session(sessionData);
    return session.save();
  }

  async findSessionByToken(token) {
    return Session.findOne({ token });
  }

  async deleteSessionByToken(token) {
    return Session.findOneAndDelete({ token });
  }
}

class AuditEventRepository {
  async createAuditEvent(eventData) {
    const auditEvent = new AuditEvent(eventData);
    return auditEvent.save();
  }

  async findEventsByUserId(userId) {
    return AuditEvent.find({ userId });
  }
}

module.exports = {
  UserRepository: new UserRepository(),
  ProfileRepository: new ProfileRepository(),
  SessionRepository: new SessionRepository(),
  AuditEventRepository: new AuditEventRepository(),
};
