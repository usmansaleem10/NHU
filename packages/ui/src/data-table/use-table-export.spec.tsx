// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTableExport } from './export.js';
import { defaultTableQuery, type FetchPage } from './query-state.js';

const columns = [{ header: 'N', value: (r: { n: number }) => r.n }];

describe('useTableExport', () => {
  it('reports a failed export as status instead of rejecting (no unhandled rejection)', async () => {
    const fetchPage: FetchPage<{ n: number }> = () => Promise.reject(new Error('network'));
    const { result } = renderHook(() =>
      useTableExport({ fetchPage, columns, fileName: 'x.csv', download: vi.fn() }),
    );
    await act(async () => {
      await expect(result.current.exportCsv(defaultTableQuery())).resolves.toBeUndefined();
    });
    expect(result.current.status).toBe('error');
  });

  it('pages through the server in batches and stops at the total', async () => {
    const rows = Array.from({ length: 5 }, (_, n) => ({ n }));
    const fetchPage = vi.fn<FetchPage<{ n: number }>>((q) =>
      Promise.resolve({
        rows: rows.slice(q.page * q.pageSize, (q.page + 1) * q.pageSize),
        total: 5,
      }),
    );
    const download = vi.fn<(csv: string, name: string) => void>();
    const { result } = renderHook(() =>
      useTableExport({ fetchPage, columns, fileName: 'x.csv', batchSize: 2, download }),
    );
    await act(async () => {
      await result.current.exportCsv(defaultTableQuery());
    });
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(download.mock.calls[0]?.[0].trim().split('\r\n')).toHaveLength(6);
  });

  it('refuses client export above the row ceiling', async () => {
    const fetchPage = vi.fn<FetchPage<{ n: number }>>();
    const { result } = renderHook(() =>
      useTableExport({ fetchPage, columns, fileName: 'x.csv', maxRows: 10, download: vi.fn() }),
    );
    await act(async () => {
      await result.current.exportCsv(defaultTableQuery(), 11);
    });
    expect(result.current.status).toBe('too-large');
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
