import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table, type TableColumn } from './Table.tsx';
import { Button } from './Button.tsx';

interface Software {
  id: string;
  name: string;
  mac: boolean;
  linux: boolean;
}

const rows: Software[] = [
  { id: 'git', name: 'Git', mac: true, linux: true },
  { id: 'xcode', name: 'Xcode', mac: true, linux: false },
];

function columns(onInstall: (id: string, os: string) => void): TableColumn<Software>[] {
  return [
    { key: 'name', header: 'Software', render: r => r.name, isRowHeader: true },
    {
      key: 'mac',
      header: 'macOS',
      align: 'center',
      render: r => (r.mac ? <Button size="sm" onClick={() => { onInstall(r.id, 'mac'); }}>Instalar</Button> : '—'),
    },
    {
      key: 'linux',
      header: 'Linux',
      align: 'center',
      render: r => (r.linux ? <Button size="sm" onClick={() => { onInstall(r.id, 'linux'); }}>Instalar</Button> : '—'),
    },
  ];
}

describe('Table', () => {
  it('renders headers, row headers and cells', () => {
    render(<Table aria-label="Catálogo" columns={columns(vi.fn())} rows={rows} getRowKey={r => r.id} />);
    const table = screen.getByRole('table', { name: 'Catálogo' });
    expect(within(table).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Software', 'macOS', 'Linux']);
    expect(within(table).getByRole('rowheader', { name: 'Xcode' })).toBeInTheDocument();
    // header row + 2 data rows
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('calls the action rendered in a cell with that row', async () => {
    const onInstall = vi.fn();
    render(<Table aria-label="Catálogo" columns={columns(onInstall)} rows={rows} getRowKey={r => r.id} />);
    const xcodeRow = screen.getByRole('rowheader', { name: 'Xcode' }).closest('tr');
    expect(xcodeRow).not.toBeNull();
    const buttons = within(xcodeRow as HTMLElement).getAllByRole('button', { name: 'Instalar' });
    expect(buttons).toHaveLength(1);
    await userEvent.click(buttons[0] as HTMLElement);
    expect(onInstall).toHaveBeenCalledWith('xcode', 'mac');
  });

  it('shows the empty state spanning all columns', () => {
    render(
      <Table aria-label="Catálogo" columns={columns(vi.fn())} rows={[]} getRowKey={r => r.id} emptyState="Nenhum software" />,
    );
    const cell = screen.getByText('Nenhum software');
    expect(cell.tagName).toBe('TD');
    expect(cell).toHaveAttribute('colspan', '3');
  });

  it('uses the visible caption as the accessible name', () => {
    render(<Table caption="Softwares" columns={columns(vi.fn())} rows={rows} getRowKey={r => r.id} />);
    expect(screen.getByRole('table', { name: 'Softwares' })).toBeInTheDocument();
  });
});
