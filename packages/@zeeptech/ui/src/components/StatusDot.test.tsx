import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusDot } from './StatusDot.tsx';

describe('StatusDot', () => {
  it('applies the color for the given status', () => {
    render(<StatusDot status="busy" />);
    const dot = screen.getByRole('img', { name: 'Status: busy' });
    expect(dot.style.backgroundColor).toBe('var(--zeep-danger, #ef4444)');
  });

  it('uses an explicit color override when provided', () => {
    render(<StatusDot status="online" color="#000000" />);
    const dot = screen.getByRole('img', { name: 'Status: online' });
    expect(dot.style.backgroundColor).toBe('rgb(0, 0, 0)');
  });
});
