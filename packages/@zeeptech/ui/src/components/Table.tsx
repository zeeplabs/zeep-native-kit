import type { Key, ReactNode } from 'react';
import { useInjectedStyles } from '../internal/useInjectedStyles.ts';

const STYLE_ID = 'zeep-table-styles';

const TABLE_CSS = `
.zeep-table-wrap {
  width: 100%; overflow-x: auto;
  border: 1px solid var(--zeep-border); border-radius: var(--zeep-radius-md);
  background: var(--zeep-surface);
}
.zeep-table { width: 100%; border-collapse: collapse; font-size: var(--zeep-font-sm); color: var(--zeep-text); }
.zeep-table-caption { caption-side: top; text-align: left; padding: var(--zeep-space-3) var(--zeep-space-4); font-weight: 600; }
.zeep-table th, .zeep-table td { padding: var(--zeep-space-2) var(--zeep-space-4); text-align: left; vertical-align: middle; }
.zeep-table-sm th, .zeep-table-sm td { padding: var(--zeep-space-1) var(--zeep-space-3); }
.zeep-table thead th {
  font-size: var(--zeep-font-xs); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--zeep-text-muted); border-bottom: 1px solid var(--zeep-border); white-space: nowrap;
}
.zeep-table tbody tr + tr td, .zeep-table tbody tr + tr th { border-top: 1px solid var(--zeep-border); }
.zeep-table tbody tr:hover td, .zeep-table tbody tr:hover th { background: color-mix(in srgb, var(--zeep-accent) 6%, transparent); }
.zeep-table tbody th { font-weight: 500; }
.zeep-table-center { text-align: center !important; }
.zeep-table-right { text-align: right !important; }
.zeep-table-empty { padding: var(--zeep-space-8) var(--zeep-space-4) !important; text-align: center !important; color: var(--zeep-text-muted); }
`;

export type TableAlign = 'left' | 'center' | 'right';

export interface TableColumn<T> {
  /** Stable column id, used as React key. */
  key: string;
  header: ReactNode;
  /** Cell renderer. Return a `Button` here for action cells. */
  render: (row: T, rowIndex: number) => ReactNode;
  align?: TableAlign | undefined;
  /** CSS width (e.g. `120`, `'20%'`). */
  width?: number | string | undefined;
  /**
   * Render this column's cells as row headers (`<th scope="row">`), so screen
   * readers announce e.g. the software name when reading an OS cell.
   */
  isRowHeader?: boolean | undefined;
}

export interface TableProps<T> {
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T, rowIndex: number) => Key;
  /** Shown in a single full-width row when `rows` is empty. */
  emptyState?: ReactNode | undefined;
  /** Visible caption. Use `aria-label` instead when no visible title is wanted. */
  caption?: ReactNode | undefined;
  'aria-label'?: string | undefined;
  size?: 'sm' | 'md' | undefined;
  className?: string | undefined;
}

function alignClass(align: TableAlign | undefined): string | undefined {
  if (align === 'center') return 'zeep-table-center';
  if (align === 'right') return 'zeep-table-right';
  return undefined;
}

export function Table<T>({
  columns,
  rows,
  getRowKey,
  emptyState = 'No data',
  caption,
  'aria-label': ariaLabel,
  size = 'md',
  className,
}: TableProps<T>) {
  useInjectedStyles(STYLE_ID, TABLE_CSS);

  const tableClasses = ['zeep-table', size === 'sm' && 'zeep-table-sm'].filter(Boolean).join(' ');

  return (
    <div className={['zeep-table-wrap', className].filter(Boolean).join(' ')}>
      <table className={tableClasses} aria-label={ariaLabel}>
        {caption && <caption className="zeep-table-caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} scope="col" className={alignClass(col.align)} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="zeep-table-empty" colSpan={Math.max(columns.length, 1)}>
                {emptyState}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)}>
                {columns.map(col =>
                  col.isRowHeader ? (
                    <th key={col.key} scope="row" className={alignClass(col.align)}>
                      {col.render(row, rowIndex)}
                    </th>
                  ) : (
                    <td key={col.key} className={alignClass(col.align)}>
                      {col.render(row, rowIndex)}
                    </td>
                  ),
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
