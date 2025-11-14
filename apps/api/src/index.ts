import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
});
