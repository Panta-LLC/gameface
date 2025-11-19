import { fireEvent,render, screen } from '@testing-library/react';
import React from 'react';

import ActivityHost from './ActivityHost';

describe('ActivityHost layout toggle', () => {
  it('shows toggle for card-table and calls setLayout when clicked', () => {
    const setLayout = vi.fn();
    render(
      <ActivityHost
        activity="card-table"
        onSelect={() => {}}
        signalingClient={null}
        layout="video-top"
        setLayout={setLayout}
      />,
    );

    // header title
    expect(screen.getByText(/Activity: card-table/)).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /videos top|videos side/i });
    expect(btn).toBeTruthy();

    fireEvent.click(btn);
    expect(setLayout).toHaveBeenCalledWith('default');
  });
});
