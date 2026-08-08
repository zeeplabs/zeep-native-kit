import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button.tsx';

describe('Button', () => {
  it('renders children and calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    // pointerEventsCheck disabled: the button is correctly styled with
    // `pointer-events: none` while disabled, which userEvent enforces by
    // default and would otherwise throw before the click is attempted.
    await userEvent.click(btn, { pointerEventsCheck: 0 });
    expect(onClick).not.toHaveBeenCalled();
  });
});
