import { describe, expect, it } from 'vitest';

import { toCsv } from './export.js';

interface Row {
  name: string;
  note: string | null;
  amount: string;
}

const columns = [
  { header: 'Name', value: (r: Row) => r.name },
  { header: 'Note', value: (r: Row) => r.note },
  { header: 'Amount', value: (r: Row) => r.amount },
];

describe('toCsv', () => {
  it('quotes commas, quotes and newlines per RFC 4180', () => {
    const csv = toCsv(
      [{ name: 'Khan, Ali', note: 'said "hi"\nthen left', amount: '10.00' }],
      columns,
    );
    expect(csv).toBe('\uFEFFName,Note,Amount\r\n"Khan, Ali","said ""hi""\nthen left",10.00\r\n');
  });

  it('neutralises spreadsheet formula injection in text cells', () => {
    const csv = toCsv(
      [{ name: '=HYPERLINK("http://x")', note: '@SUM(A1)', amount: '-1+cmd' }],
      columns,
    );
    const body = csv.split('\r\n')[1];
    expect(body).toBe(`"'=HYPERLINK(""http://x"")",'@SUM(A1),'-1+cmd`);
  });

  it.each([' =1+1', '\n=1', '\t=1', '\u3000=1', '\uFF1D1+1', '\uFF0BA1', '|cmd', '\uFF20SUM(A1)'])(
    'neutralises formula prefixes hidden behind whitespace or full-width forms: %j',
    (value) => {
      const cell =
        toCsv([{ name: value, note: null, amount: '1' }], columns).split('\r\n')[1] ?? '';
      expect(cell.replace(/^"/, '').startsWith("'")).toBe(true);
    },
  );

  it('leaves negative amounts as numbers', () => {
    expect(toCsv([{ name: 'A', note: '', amount: '-5.00' }], columns).split('\r\n')[1]).toBe(
      'A,,-5.00',
    );
  });

  it('writes empty cells for null values', () => {
    expect(toCsv([{ name: 'A', note: null, amount: '1' }], columns).split('\r\n')[1]).toBe('A,,1');
  });
});
