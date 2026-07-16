import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpdateProgress } from './UpdateProgress.tsx';

describe('UpdateProgress', () => {
  it('shows percentage when contentLength known', () => {
    render(<UpdateProgress downloaded={50} contentLength={100} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows bytes when contentLength null', () => {
    render(<UpdateProgress downloaded={2048} contentLength={null} />);
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
  });

  it('renders a progressbar role', () => {
    render(<UpdateProgress downloaded={0} contentLength={100} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
