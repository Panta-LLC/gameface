import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';

const app = express();
app.use(express.json());

// Middleware for validation errors
const validate = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// User Management Endpoints
app.post(
  '/api/v1/users',
  body('username').isString(),
  body('password').isString(),
  body('email').isEmail(),
  validate,
  (req: Request, res: Response) => {
    const { username, password, email } = req.body;
    // Logic to create a user
    res.status(201).json({ id: 'user-id', username, email });
  },
);

app.get('/api/v1/users/:id', param('id').isString(), validate, (req: Request, res: Response) => {
  const { id } = req.params;
  // Logic to retrieve user details
  res.json({ id, username: 'example', email: 'example@example.com' });
});

app.put(
  '/api/v1/users/:id',
  param('id').isString(),
  body('username').optional().isString(),
  body('email').optional().isEmail(),
  validate,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, email } = req.body;
    // Logic to update user details
    res.json({ id, username, email });
  },
);

app.delete('/api/v1/users/:id', param('id').isString(), validate, (req: Request, res: Response) => {
  const { id } = req.params;
  // Logic to delete a user
  res.json({ message: 'User deleted successfully.' });
});

// Game Data Endpoints
app.get('/api/v1/games', (req: Request, res: Response) => {
  // Logic to retrieve games
  res.json([{ id: 'game-id', name: 'Example Game', description: 'An example game.' }]);
});

app.post(
  '/api/v1/games',
  body('name').isString(),
  body('description').isString(),
  validate,
  (req: Request, res: Response) => {
    const { name, description } = req.body;
    // Logic to add a game
    res.status(201).json({ id: 'game-id', name, description });
  },
);

// Analytics Endpoint
app.get('/api/v1/analytics', (req: Request, res: Response) => {
  // Logic to retrieve analytics data
  res.json({ activeUsers: 100, gamesPlayed: 50 });
});

export default app;
