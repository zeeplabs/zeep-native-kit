import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { ToastProvider, useToast } from './Toast.tsx';

function TriggerButton() {
  const toast = useToast();
  return <button onClick={() => toast.success('Operação concluída!')}>trigger</button>;
}

describe('Toast', () => {
  it('renders a message when a toast is triggered', async () => {
    render(
      <ToastProvider>
        <TriggerButton />
      </ToastProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'trigger' });
    await act(async () => {
      trigger.click();
    });
    expect(screen.getByText('Operação concluída!')).toBeInTheDocument();
  });

  it('throws if useToast is used outside a ToastProvider', () => {
    function Bare() {
      useToast();
      return null;
    }
    expect(() => render(<Bare />)).toThrow('useToast must be used inside <ToastProvider>');
  });
});
