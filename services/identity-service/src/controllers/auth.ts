import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';

/**
 * Authentication Controllers
 *
 * This module contains the following controllers:
 *
 * 1. loginHandler: Handles user login requests with rate limiting to prevent brute force attacks.
 *    - Middleware: loginRateLimiter (limits requests to 5 per 15 minutes per IP).
 *    - Logic: Validates email and password, returns a fake JWT token for successful authentication.
 *
 * 2. socialLoginHandler: Handles social login requests.
 *    - Placeholder implementation for social login.
 *
 * 3. refreshTokenHandler: Handles token refresh requests.
 *    - Placeholder implementation for refreshing tokens.
 *
 * 4. logoutHandler: Handles user logout requests.
 *    - Logic: Invalidates the user token.
 *
 * 5. sessionPersistenceHandler: Handles session persistence to ensure sessions are valid and extend their lifetime if necessary.
 *    - Logic: Checks if the session is active and responds accordingly.
 *
 * Security Measures:
 * - Rate limiting is applied to the loginHandler to enhance security.
 * - Error messages are generic to avoid revealing sensitive information.
 */

// Rate limiter middleware for login attempts
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
});

// Initialize Redis client
const redisClient = createClient();

redisClient.on('error', (err: Error) => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
})();

// Updated handler for user login
export const loginHandler = [
  loginRateLimiter,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Placeholder for authentication logic
    if (email === 'test@example.com' && password === 'password123') {
      res.status(200).json({ message: 'Login successful', token: 'fake-jwt-token' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  },
];

// Handler for social login
export const socialLoginHandler = (req: Request, res: Response) => {
  // Placeholder implementation
  res.status(200).json({ message: 'Social login successful' });
};

// Handler for token refresh
export const refreshTokenHandler = (req: Request, res: Response) => {
  // Placeholder implementation
  res.status(200).json({ message: 'Token refreshed successfully' });
};

// Handler for user logout
export const logoutHandler = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header

    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    // Invalidate the token by removing it from Redis
    await redisClient.del(`session:${token}`);

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during logout' });
  }
};

// Updated handler for session persistence
export const sessionPersistenceHandler = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header

    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    // Validate token signature and claims
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);

      // Check if the token is revoked
      const isRevoked = await redisClient.get(`revoked:refresh:${token}`);

      if (isRevoked) {
        return res.status(401).json({ error: 'Session expired or invalid' });
      }

      // Update session metadata
      const sessionKey = `session:${decoded.sub}`;
      const sessionData = await redisClient.get(sessionKey);

      if (!sessionData) {
        return res.status(401).json({ error: 'Session not found' });
      }

      const session = JSON.parse(sessionData);
      session.lastSeenAt = new Date().toISOString();
      await redisClient.set(sessionKey, JSON.stringify(session));

      // Extend session lifetime
      await redisClient.expire(sessionKey, 3600); // Extend session TTL to 1 hour

      res.status(200).json({ message: 'Session is active', session });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Error in session persistence handler:', error);
    res.status(500).json({ error: 'An error occurred while validating the session' });
  }
};
