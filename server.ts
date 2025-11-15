import express, { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';

const app = express();
app.use(express.json());

// Middleware to handle validation errors
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// User Management Endpoints

// Create a new user
app.post(
  '/api/users',
  [
    body('username').isString().notEmpty(),
    body('password').isString().notEmpty(),
    body('email').isEmail(),
  ],
  validate,
  (req: Request, res: Response) => {
    const { username, password, email } = req.body;
    const newUser = { id: '1', username, email }; // Mocked response
    res.status(201).json(newUser);
  },
);

// Retrieve user details by ID
app.get(
  '/api/users/:id',
  [param('id').isString().notEmpty()],
  validate,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const user = { id, username: 'mockUser', email: 'mock@example.com' }; // Mocked response
    res.status(200).json(user);
  },
);

// Update user details
app.put(
  '/api/users/:id',
  [
    param('id').isString().notEmpty(),
    body('username').isString().optional(),
    body('email').isEmail().optional(),
  ],
  validate,
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, email } = req.body;
    const updatedUser = {
      id,
      username: username || 'mockUser',
      email: email || 'mock@example.com',
    }; // Mocked response
    res.status(200).json(updatedUser);
  },
);

// Delete a user by ID
app.delete(
  '/api/users/:id',
  [param('id').isString().notEmpty()],
  validate,
  (req: Request, res: Response) => {
    res.status(200).json({ message: 'User deleted successfully.' });
  },
);

// Game Data Endpoints

// Retrieve a list of available games
app.get('/api/games', (req: Request, res: Response) => {
  const games = [
    { id: '1', name: 'Game 1', description: 'Description 1' },
    { id: '2', name: 'Game 2', description: 'Description 2' },
  ]; // Mocked response
  res.status(200).json(games);
});

// Add a new game
app.post(
  '/api/games',
  [body('name').isString().notEmpty(), body('description').isString().notEmpty()],
  validate,
  (req: Request, res: Response) => {
    const { name, description } = req.body;
    const newGame = { id: '1', name, description }; // Mocked response
    res.status(201).json(newGame);
  },
);

// Analytics Endpoint

// Retrieve analytics data
app.get('/api/analytics', (req: Request, res: Response) => {
  const analytics = { activeUsers: 100, gamesPlayed: 50 }; // Mocked response
  res.status(200).json(analytics);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
