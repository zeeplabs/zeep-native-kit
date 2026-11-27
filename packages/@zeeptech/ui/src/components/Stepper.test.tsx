import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stepper, type StepItem } from './Stepper.tsx';

const steps: StepItem[] = [
  { id: 'account', label: 'Conta', description: 'Dados de acesso' },
  { id: 'tools', label: 'Ferramentas' },
  { id: 'review', label: 'Revisão' },
];

function item(name: string) {
  return screen.getByText(name).closest('li') as HTMLElement;
}

describe('Stepper', () => {
  it('renders an ordered, labelled list and marks the current step', () => {
    render(<Stepper aria-label="Progresso" steps={steps} current={1} />);
    const list = screen.getByRole('list', { name: 'Progresso' });
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(item('Ferramentas')).toHaveAttribute('aria-current', 'step');
    expect(item('Conta')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Dados de acesso')).toBeInTheDocument();
  });

  it('derives status from `current` and exposes it as text, not only color', () => {
    render(<Stepper aria-label="Progresso" steps={steps} current={1} />);
    expect(item('Conta')).toHaveAttribute('data-status', 'complete');
    expect(item('Ferramentas')).toHaveAttribute('data-status', 'current');
    expect(item('Revisão')).toHaveAttribute('data-status', 'pending');
    expect(within(item('Conta')).getByText('(Completed)')).toBeInTheDocument();
    expect(within(item('Ferramentas')).getByText('(Current step)')).toBeInTheDocument();
    expect(within(item('Revisão')).getByText('(Pending)')).toBeInTheDocument();
  });

  it('lets a step override its status (error) and localizes the status text', () => {
    const withError: StepItem[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B', status: 'error', description: 'Campo obrigatório' },
    ];
    render(
      <Stepper
        aria-label="X"
        steps={withError}
        current={1}
        statusLabels={{ error: 'Com erro', complete: 'Concluído' }}
      />,
    );
    expect(item('B')).toHaveAttribute('data-status', 'error');
    expect(item('B')).toHaveAttribute('aria-current', 'step');
    expect(within(item('B')).getByText('(Com erro)')).toBeInTheDocument();
    expect(within(item('A')).getByText('(Concluído)')).toBeInTheDocument();
  });

  it('has no buttons without onStepClick', () => {
    render(<Stepper aria-label="X" steps={steps} current={1} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('makes non-pending steps buttons and never pending ones', async () => {
    const onStepClick = vi.fn();
    render(<Stepper aria-label="X" steps={steps} current={1} onStepClick={onStepClick} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Conta/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revisão/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Conta/ }));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it('is operable by keyboard', async () => {
    const onStepClick = vi.fn();
    render(<Stepper aria-label="X" steps={steps} current={2} onStepClick={onStepClick} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Conta/ })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(onStepClick).toHaveBeenNthCalledWith(1, 0);
    expect(onStepClick).toHaveBeenNthCalledWith(2, 1);
  });

  it('supports the vertical orientation', () => {
    render(<Stepper aria-label="X" steps={steps} current={0} orientation="vertical" />);
    expect(screen.getByRole('list')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('defaults to horizontal and draws a connector between steps only', () => {
    const { container } = render(<Stepper aria-label="X" steps={steps} current={0} />);
    expect(screen.getByRole('list')).toHaveAttribute('data-orientation', 'horizontal');
    expect(container.querySelectorAll('.zeep-stepper-line')).toHaveLength(2);
  });

  it('clamps an out-of-range current', () => {
    const { rerender } = render(<Stepper aria-label="X" steps={steps} current={-1} />);
    expect(screen.getAllByRole('listitem').every(li => li.getAttribute('data-status') === 'pending')).toBe(true);
    expect(document.querySelector('[aria-current]')).toBeNull();

    rerender(<Stepper aria-label="X" steps={steps} current={steps.length} />);
    expect(screen.getAllByRole('listitem').every(li => li.getAttribute('data-status') === 'complete')).toBe(true);
    expect(document.querySelector('[aria-current]')).toBeNull();
  });
});
