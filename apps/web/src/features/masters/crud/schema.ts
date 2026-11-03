import { z } from 'zod';

import type { MasterInput, MasterMetadata } from './types';

const DEFAULT_CODE = /^[A-Z0-9][A-Z0-9_-]{1,19}$/;

/** Form schema for a master's add/edit dialog. Messages are i18n keys (resolved by the form kit). */
export function buildMasterSchema(meta: MasterMetadata) {
  const codeMax = meta.code?.maxLength ?? 20;
  return z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, 'masters.validation.codeRequired')
      .max(codeMax, 'masters.validation.codeTooLong')
      .regex(meta.code?.pattern ?? DEFAULT_CODE, 'masters.validation.codeFormat'),
    name: z
      .string()
      .trim()
      .min(2, 'masters.validation.nameRequired')
      .max(meta.nameMaxLength ?? 120, 'masters.validation.nameTooLong'),
    description: z.string().trim().max(500, 'masters.validation.descriptionTooLong'),
    status: z.enum(['active', 'inactive']),
  }) satisfies z.ZodType<MasterInput>;
}

export type MasterFormValues = z.input<ReturnType<typeof buildMasterSchema>>;
