import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from './TextField.tsx';

describe('TextField', () => {
  it('associates the label with the input and accepts typing', async () => {
    const onChange = vi.fn();
    render(<TextField label="Nome" onChange={onChange} />);
    const input = screen.getByLabelText('Nome');
    await userEvent.type(input, 'Ana');
    expect(input).toHaveValue('Ana');
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('links the hint via aria-describedby', () => {
    render(<TextField label="E-mail" hint="Use o e-mail corporativo" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAccessibleDescription('Use o e-mail corporativo');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('marks the input invalid and shows the error instead of the hint', () => {
    render(<TextField label="E-mail" hint="hint text" error="E-mail inválido" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('E-mail inválido');
    expect(screen.queryByText('hint text')).not.toBeInTheDocument();
  });

  it('keeps a caller-provided aria-describedby', () => {
    render(
      <>
        <span id="extra">extra</span>
        <TextField label="Campo" hint="dica" aria-describedby="extra" />
      </>,
    );
    expect(screen.getByLabelText('Campo')).toHaveAccessibleDescription('extra dica');
  });

  it('does not accept input when disabled', async () => {
    render(<TextField label="Bloqueado" disabled />);
    const input = screen.getByLabelText('Bloqueado');
    expect(input).toBeDisabled();
    await userEvent.type(input, 'x');
    expect(input).toHaveValue('');
  });

  it('keeps the label accessible when visually hidden', () => {
    render(<TextField label="Buscar" hideLabel />);
    expect(screen.getByRole('textbox', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('forwards the ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextField label="Ref" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText('Ref'));
  });

  it('is reachable with the keyboard', async () => {
    render(<TextField label="Primeiro" />);
    await userEvent.tab();
    expect(screen.getByLabelText('Primeiro')).toHaveFocus();
  });
});
