import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Phase 0: Frontend Smoke Test', () => {
  it('renders ScopeSentry homepage with hero tagline', () => {
    render(<App />);
    expect(screen.getByText(/Every project change has a cost/i)).toBeDefined();
    expect(screen.getByText(/Make sure you see it/i)).toBeDefined();
  });
});
