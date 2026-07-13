import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassCard } from './GlassCard.tsx';

describe('GlassCard', () => {
  it('renders children inside the card', () => {
    render(<GlassCard>hello card</GlassCard>);
    expect(screen.getByText('hello card')).toBeInTheDocument();
  });
});
