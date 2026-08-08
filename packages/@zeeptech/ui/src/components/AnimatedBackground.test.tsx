import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { AnimatedBackground } from './AnimatedBackground.tsx';

describe('AnimatedBackground', () => {
  it('renders without crashing for each intensity', () => {
    for (const intensity of ['subtle', 'medium', 'strong'] as const) {
      const { container, unmount } = render(<AnimatedBackground intensity={intensity} />);
      expect(container.querySelector('.zeep-animated-bg-inner')).not.toBeNull();
      unmount();
    }
  });
});
