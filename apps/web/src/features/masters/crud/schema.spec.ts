import { describe, expect, it } from 'vitest';

import { buildMasterSchema } from './schema';
import { defineSimpleMaster } from './types';

const meta = defineSimpleMaster({
  id: 'staff-types',
  labels: { en: { title: 'T', singular: 's' } },
});
const valid = { code: 'doc', name: 'Doctor', description: '', status: 'active' as const };

describe('buildMasterSchema', () => {
  it('normalises codes to upper case and trims text', () => {
    const out = buildMasterSchema(meta).parse({
      ...valid,
      code: ' ot-staff ',
      name: '  OT Staff ',
    });
    expect(out).toMatchObject({ code: 'OT-STAFF', name: 'OT Staff' });
  });

  it.each([
    ['', 'masters.validation.codeRequired'],
    ['A', 'masters.validation.codeFormat'],
    ['HAS SPACE', 'masters.validation.codeFormat'],
    ['-LEADING', 'masters.validation.codeFormat'],
    ['X'.repeat(21), 'masters.validation.codeTooLong'],
  ])('rejects code %j with %s', (code, message) => {
    const result = buildMasterSchema(meta).safeParse({ ...valid, code });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });

  it('honours a master-specific code rule', () => {
    const numeric = defineSimpleMaster({ ...meta, code: { pattern: /^\d{3}$/, maxLength: 3 } });
    expect(buildMasterSchema(numeric).safeParse({ ...valid, code: '012' }).success).toBe(true);
    expect(buildMasterSchema(numeric).safeParse({ ...valid, code: 'ABC' }).success).toBe(false);
  });

  it('derives conventional permissions in the masters module', () => {
    expect(meta.module).toBe('masters');
    expect(meta.permissions).toEqual({
      view: 'masters.staff-types.view',
      create: 'masters.staff-types.create',
      update: 'masters.staff-types.update',
    });
  });
});
