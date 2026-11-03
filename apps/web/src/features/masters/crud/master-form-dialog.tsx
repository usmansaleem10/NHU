import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogContent,
  Form,
  SelectField,
  TextareaField,
  TextField,
} from '@hims/ui';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { buildMasterSchema, type MasterFormValues } from './schema';
import type { MasterInput, MasterMetadata, MasterRecord } from './types';

const EMPTY: MasterFormValues = { code: '', name: '', description: '', status: 'active' };

/** Add/edit dialog generated from master metadata. `record` null = add. */
export function MasterFormDialog({
  meta,
  singular,
  record,
  open,
  onOpenChange,
  onSubmit,
}: {
  meta: MasterMetadata;
  singular: string;
  record: MasterRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Throws ProblemError on server validation; the form maps it onto fields. */
  onSubmit: (input: MasterInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildMasterSchema(meta), [meta]);
  const form = useForm<MasterFormValues>({
    resolver: zodResolver(schema),
    values: record
      ? {
          code: record.code,
          name: record.name,
          description: record.description,
          status: record.status,
        }
      : EMPTY,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={
          record
            ? t('masters.editTitle', { item: singular })
            : t('masters.addTitle', { item: singular })
        }
      >
        <Form
          form={form}
          onSubmit={async (values) => {
            await onSubmit(schema.parse(values));
          }}
        >
          <TextField<MasterFormValues>
            name="code"
            label={t('masters.field.code')}
            description={t('masters.help.code')}
            required
            // Codes are referenced by other records and reports, so they're fixed once created.
            readOnly={record !== null}
            autoComplete="off"
          />
          <TextField<MasterFormValues> name="name" label={t('masters.field.name')} required />
          <TextareaField<MasterFormValues>
            name="description"
            label={t('masters.field.description')}
          />
          <SelectField<MasterFormValues>
            name="status"
            label={t('masters.field.status')}
            required
            options={[
              { value: 'active', label: t('masters.status.active') },
              { value: 'inactive', label: t('masters.status.inactive') },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t('masters.cancel')}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t('forms.saving') : t('masters.save')}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
