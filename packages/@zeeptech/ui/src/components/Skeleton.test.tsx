import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonText } from './Skeleton.tsx';

describe('Skeleton', () => {
  it('renders with the requested width and height', () => {
    const { container } = render(<Skeleton width={120} height={20} />);
    const el = container.querySelector('.zeep-skeleton') as HTMLElement;
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('20px');
  });
});

describe('SkeletonText', () => {
  it('renders the requested number of lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.querySelectorAll('.zeep-skeleton').length).toBe(4);
  });
});
