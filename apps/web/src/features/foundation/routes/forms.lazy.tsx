import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  CardContent,
  CheckboxField,
  DateField,
  Form,
  PageHeader,
  SelectField,
  TextareaField,
  TextField,
  TypeaheadField,
  useFormatters,
} from '@hims/ui';
import { createLazyRoute } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { services } from '../../../app/services';

export const Route = createLazyRoute('/foundation/forms')({ component: FormsScreen });

/** Today's calendar date in the tenant time zone (not the browser's). */
function tenantToday(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

// Messages are i18n keys; the form kit resolves them through the app catalogue.
function buildSchema(today: string) {
  return z.object({
    fullName: z.string().trim().min(2, 'forms.validation.nameMin'),
    email: z.email('forms.validation.email'),
    phone: z.union([z.literal(''), z.string().regex(/^0\d{10}$/, 'forms.validation.phone')]),
    gender: z.string().min(1, 'forms.validation.required'),
    dateOfBirth: z
      .string()
      .min(1, 'forms.validation.required')
      .refine((v) => v <= today, 'forms.validation.notFuture'),
    appointmentAt: z.string().min(1, 'forms.validation.required'),
    department: z
      .object({ value: z.string(), label: z.string() })
      .nullable()
      .refine((v) => v !== null, 'forms.validation.required'),
    notes: z.string().max(500, 'forms.validation.tooLong'),
    consent: z.boolean().refine((v) => v, 'forms.validation.consent'),
  });
}
type Values = z.input<ReturnType<typeof buildSchema>>;

const EMPTY: Values = {
  fullName: '',
  email: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  appointmentAt: '',
  department: null,
  notes: '',
  consent: false,
};

function FormsScreen() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const today = tenantToday(fmt.settings.timeZone);
  const schema = useMemo(() => buildSchema(today), [today]);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const [savedRef, setSavedRef] = useState<string | null>(null);

  return (
    <>
      <PageHeader title={t('forms.title')} description={t('forms.description')} />
      <Card className="max-w-3xl">
        <CardContent className="pt-4">
          <Form
            form={form}
            aria-label={t('forms.title')}
            onSubmit={async (values) => {
              setSavedRef(null);
              const result = await services.submitDemoRegistration({
                fullName: values.fullName,
                email: values.email,
                departmentId: values.department?.value ?? '',
              });
              setSavedRef(result.id.slice(0, 8));
              form.reset(EMPTY);
            }}
          >
            {savedRef ? (
              <p
                role="status"
                className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm"
              >
                <CheckCircle2 className="size-4 text-success" aria-hidden />
                {t('forms.saved', { ref: savedRef })}
              </p>
            ) : null}
            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold">{t('forms.section.person')}</legend>
              <TextField<Values>
                name="fullName"
                label={t('forms.field.fullName')}
                required
                autoComplete="name"
              />
              <TextField<Values>
                name="email"
                type="email"
                label={t('forms.field.email')}
                required
                autoComplete="email"
              />
              <TextField<Values>
                name="phone"
                type="tel"
                inputMode="tel"
                label={t('forms.field.phone')}
                description={t('forms.help.phone')}
              />
              <SelectField<Values>
                name="gender"
                label={t('forms.field.gender')}
                required
                options={[
                  { value: 'female', label: t('foundation.gender.female') },
                  { value: 'male', label: t('foundation.gender.male') },
                ]}
              />
              <DateField<Values>
                name="dateOfBirth"
                label={t('forms.field.dateOfBirth')}
                required
                max={today}
              />
              <DateField<Values>
                name="appointmentAt"
                label={t('forms.field.appointmentAt')}
                required
                withTime
              />
            </fieldset>
            <fieldset className="grid gap-4">
              <legend className="mb-2 text-sm font-semibold">{t('forms.section.visit')}</legend>
              <TypeaheadField<Values>
                name="department"
                label={t('forms.field.department')}
                description={t('forms.help.department')}
                required
                search={services.searchDepartments}
                placeholder={t('forms.placeholder.department')}
              />
              <TextareaField<Values> name="notes" label={t('forms.field.notes')} />
              <CheckboxField<Values> name="consent" label={t('forms.field.consent')} />
            </fieldset>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  form.reset(EMPTY);
                  setSavedRef(null);
                }}
              >
                {t('forms.reset')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t('forms.saving') : t('forms.submit')}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
