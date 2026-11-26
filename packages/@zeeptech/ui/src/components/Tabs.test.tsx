import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, type TabItem } from './Tabs.tsx';

const items: TabItem[] = [
  { id: 'catalog', label: 'Catálogo', content: <p>conteúdo catálogo</p> },
  { id: 'admissions', label: 'Admissões', content: <p>conteúdo admissões</p> },
  { id: 'profiles', label: 'Perfis', content: <p>conteúdo perfis</p> },
];

describe('Tabs', () => {
  it('selects the first tab by default and links tab and panel', () => {
    render(<Tabs aria-label="Seções" items={items} />);
    const tab = screen.getByRole('tab', { name: 'Catálogo' });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel', { name: 'Catálogo' });
    expect(panel).toHaveTextContent('conteúdo catálogo');
    expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(screen.queryByText('conteúdo admissões')).not.toBeInTheDocument();
  });

  it('switches panel on click and reports the change', async () => {
    const onChange = vi.fn();
    render(<Tabs aria-label="Seções" items={items} onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Perfis' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('conteúdo perfis');
    expect(onChange).toHaveBeenCalledWith('profiles');
  });

  it('uses roving tabindex and arrow/Home/End keys', async () => {
    render(<Tabs aria-label="Seções" items={items} />);
    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Catálogo' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Admissões' })).toHaveAttribute('tabindex', '-1');

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Admissões' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Admissões' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Perfis' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Catálogo' })).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Perfis' })).toHaveFocus();

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Catálogo' })).toHaveFocus();
  });

  it('skips disabled tabs in keyboard navigation and default selection', async () => {
    const withDisabled: TabItem[] = [
      { id: 'a', label: 'A', content: 'A', disabled: true },
      { id: 'b', label: 'B', content: 'B' },
      { id: 'c', label: 'C', content: 'C', disabled: true },
      { id: 'd', label: 'D', content: 'D' },
    ];
    render(<Tabs aria-label="X" items={withDisabled} />);
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'D' })).toHaveFocus();
  });

  it('works as a controlled component', async () => {
    function Controlled() {
      const [tab, setTab] = useState('admissions');
      return (
        <>
          <Tabs aria-label="Seções" items={items} value={tab} onChange={setTab} />
          <span data-testid="current">{tab}</span>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole('tab', { name: 'Admissões' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Perfis' }));
    expect(screen.getByTestId('current')).toHaveTextContent('profiles');
  });

  it('keeps inactive panels mounted but hidden with keepMounted', () => {
    render(<Tabs aria-label="Seções" items={items} keepMounted />);
    const hidden = screen.getByText('conteúdo perfis').closest('[role="tabpanel"]');
    expect(hidden).toHaveAttribute('hidden');
  });
});
