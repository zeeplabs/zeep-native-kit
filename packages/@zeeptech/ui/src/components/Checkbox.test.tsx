import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox.tsx';

describe('Checkbox', () => {
  it('toggles via label click', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="GitHub" onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'GitHub' });
    await userEvent.click(screen.getByText('GitHub'));
    expect(box).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('toggles with the Space key', async () => {
    render(<Checkbox label="Slack" />);
    await userEvent.tab();
    const box = screen.getByRole('checkbox', { name: 'Slack' });
    expect(box).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(box).toBeChecked();
  });

  it('exposes the indeterminate state and clears it when the prop changes', () => {
    const { rerender } = render(<Checkbox label="Todos" indeterminate checked={false} readOnly />);
    const box = screen.getByRole('checkbox', { name: 'Todos' });
    expect(box).toBePartiallyChecked();
    rerender(<Checkbox label="Todos" indeterminate={false} checked readOnly />);
    expect(box).not.toBePartiallyChecked();
    expect(box).toBeChecked();
  });

  it('supports a parent "select all" driven by children', async () => {
    function Group() {
      const [items, setItems] = useState([true, false]);
      const all = items.every(Boolean);
      const some = items.some(Boolean);
      return (
        <>
          <Checkbox
            label="Todos"
            checked={all}
            indeterminate={some && !all}
            onChange={() => { setItems(items.map(() => !all)); }}
          />
          {items.map((v, i) => (
            <Checkbox
              key={i}
              label={`Item ${i}`}
              checked={v}
              onChange={() => { setItems(items.map((x, j) => (j === i ? !x : x))); }}
            />
          ))}
        </>
      );
    }
    render(<Group />);
    const parent = screen.getByRole('checkbox', { name: 'Todos' });
    expect(parent).toBePartiallyChecked();
    await userEvent.click(parent);
    expect(parent).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Item 1' })).toBeChecked();
  });

  it('marks invalid and links the error message', () => {
    render(<Checkbox label="Aceito os termos" error="Obrigatório" />);
    const box = screen.getByRole('checkbox', { name: 'Aceito os termos' });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Obrigatório');
  });

  it('does not toggle when disabled', async () => {
    render(<Checkbox label="Bloqueado" disabled />);
    const box = screen.getByRole('checkbox', { name: 'Bloqueado' });
    await userEvent.click(box, { pointerEventsCheck: 0 });
    expect(box).not.toBeChecked();
  });
});
