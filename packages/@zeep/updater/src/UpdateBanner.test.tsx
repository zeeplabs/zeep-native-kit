import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateBanner } from './UpdateBanner.tsx';

describe('UpdateBanner', () => {
  it('renders version and notes', () => {
    render(
      <UpdateBanner
        version="1.2.3"
        notes="Bug fixes"
        onInstall={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(/1\.2\.3/)).toBeInTheDocument();
    expect(screen.getByText(/Bug fixes/)).toBeInTheDocument();
  });

  it('calls onInstall when Update Now clicked', async () => {
    const onInstall = vi.fn();
    render(
      <UpdateBanner
        version="1.0.0"
        notes={null}
        onInstall={onInstall}
        onDismiss={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText('Update Now'));
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Later clicked', async () => {
    const onDismiss = vi.fn();
    render(
      <UpdateBanner
        version="1.0.0"
        notes={null}
        onInstall={vi.fn()}
        onDismiss={onDismiss}
      />,
    );
    await userEvent.click(screen.getByText('Later'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
