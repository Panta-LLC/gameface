import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('renders the app header', () => {
    render(<App />);
    const headerElement = screen.getByRole('heading', { name: /gameface web/i });
    expect(headerElement).toBeInTheDocument();
  });
});
