import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App Component', () => {
  it('renders the app header', () => {
    render(<App />);
    // App now renders the initial auth header as "Welcome"
    const headerElement = screen.getByRole('heading', { name: /welcome/i });
    expect(headerElement).toBeInTheDocument();
  });
});
