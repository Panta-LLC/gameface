import cors from 'cors';
import express, { Request, Response } from 'express';

const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const app = express();

if (allowedOrigins.length > 0) {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});
