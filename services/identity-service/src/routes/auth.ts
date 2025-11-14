import express from 'express';
import { loginHandler, socialLoginHandler, refreshTokenHandler } from '../controllers/auth';

const router = express.Router();

// User login endpoint
router.post('/login', loginHandler);

// Social login endpoint
router.get('/social/:provider/start', socialLoginHandler);

// Token refresh endpoint
router.post('/token/refresh', refreshTokenHandler);

export default router;
