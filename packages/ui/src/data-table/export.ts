import { useCallback, useRef, useState } from 'react';

import type { FetchPage, TableQuery } from './query-state.js';

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

// Spreadsheet apps execute cells starting with these as formulas (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text) && !PLAIN_NUMBER.test(text)) {
    text = `'${text}`;
  }
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with a UTF-8 BOM so Excel opens Urdu text correctly. */
export function toCsv<T>(rows: readonly T[], columns: readonly ExportColumn<T>[]): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvCell(c.value(row))).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export type ExportStatus = 'idle' | 'exporting' | 'too-large' | 'error';

export interface UseTableExportOptions<T> {
  fetchPage: FetchPage<T>;
  columns: readonly ExportColumn<T>[];
  fileName: string;
  /**
   * Client-side export ceiling. AGENTS.md: exports over 10k rows run as background jobs, so above
   * this the hook reports `too-large` and the screen offers a server export instead.
   */
  maxRows?: number;
  batchSize?: number;
  /** Override the download (tests, or handing the CSV to a print/preview flow). */
  download?: (csv: string, fileName: string) => void;
}

function browserDownload(csv: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports the rows matching the CURRENT server query (filters + sort) by paging through the data
 * source in batches — never by loading the whole table up front.
 */
export function useTableExport<T>({
  fetchPage,
  columns,
  fileName,
  maxRows = 10_000,
  batchSize = 1000,
  download = browserDownload,
}: UseTableExportOptions<T>) {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const controller = useRef<AbortController | null>(null);

  const exportCsv = useCallback(
    async (query: TableQuery, knownTotal?: number) => {
      if (knownTotal !== undefined && knownTotal > maxRows) {
        setStatus('too-large');
        return;
      }
      controller.current?.abort();
      const ac = new AbortController();
      controller.current = ac;
      setStatus('exporting');
      try {
        const rows: T[] = [];
        for (let page = 0; ; page += 1) {
          const result = await fetchPage({ ...query, page, pageSize: batchSize }, ac.signal);
          if (result.total > maxRows) {
            setStatus('too-large');
            return;
          }
          rows.push(...result.rows);
          if (result.rows.length < batchSize || rows.length >= result.total) break;
        }
        download(toCsv(rows, columns), fileName);
        setStatus('idle');
      } catch (error) {
        if (ac.signal.aborted) return;
        setStatus('error');
        throw error;
      }
    },
    [fetchPage, columns, fileName, maxRows, batchSize, download],
  );

  return { exportCsv, status, maxRows };
}
