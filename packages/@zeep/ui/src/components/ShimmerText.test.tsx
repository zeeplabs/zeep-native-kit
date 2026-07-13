import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShimmerText } from './ShimmerText.tsx';

describe('ShimmerText', () => {
  it('renders as the requested tag with its children', () => {
    render(<ShimmerText as="h2">Heading text</ShimmerText>);
    const el = screen.getByText('Heading text');
    expect(el.tagName).toBe('H2');
  });
});
