import express from 'express';
import {
  loginHandler,
  socialLoginHandler,
  refreshTokenHandler,
  sessionPersistenceHandler,
} from '../controllers/auth';

const router = express.Router();

// User login endpoint
router.post('/login', loginHandler);

// Social login endpoint
router.get('/social/:provider/start', socialLoginHandler);

// Token refresh endpoint
router.post('/token/refresh', refreshTokenHandler);

// Session persistence endpoint
router.get('/session', sessionPersistenceHandler);

export default router;
