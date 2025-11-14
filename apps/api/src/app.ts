import express, { Request, Response } from 'express';

export const app = express();

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});
