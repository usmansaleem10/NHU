import { AlertCircle } from 'lucide-react';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  FormProvider,
  get,
  type FieldPath,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
} from 'react-hook-form';

import { useUiI18n } from '../i18n/context.js';
import { cn } from '../lib/cn.js';
import { mapProblemToFields, problemFrom } from './problem.js';

export interface FormProps<TValues extends FieldValues> extends Omit<
  ComponentProps<'form'>,
  'onSubmit' | 'children'
> {
  form: UseFormReturn<TValues>;
  /**
   * Submit handler. If it throws a ProblemError / problem+json, the `errors` are mapped onto the
   * matching fields (first one focused) and the rest shown in the form-level alert.
   */
  onSubmit: SubmitHandler<TValues>;
  children: ReactNode;
}

export function Form<TValues extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<TValues>) {
  const { t, resolveMessage } = useUiI18n();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const submit = form.handleSubmit(async (values, event) => {
    setFormErrors([]);
    try {
      await onSubmit(values, event);
    } catch (error) {
      const problem = problemFrom(error);
      if (!problem) throw error;
      const known = (name: string) =>
        get(form.control._defaultValues, name) !== undefined ||
        get(form.getValues(), name) !== undefined;
      const mapped = mapProblemToFields(problem, known);
      const entries = Object.entries(mapped.fieldErrors);
      entries.forEach(([name, message], i) => {
        form.setError(
          name as FieldPath<TValues>,
          { type: 'server', message },
          { shouldFocus: i === 0 },
        );
      });
      setFormErrors(mapped.formErrors);
    }
  });

  const hasFieldErrors = Object.keys(form.formState.errors).length > 0;

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className={cn('flex flex-col gap-4', className)}
        onSubmit={(e) => {
          void submit(e);
        }}
        {...props}
      >
        {formErrors.length > 0 || (hasFieldErrors && form.formState.isSubmitted) ? (
          <div
            role="alert"
            className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-medium">{t('form.fixErrors')}</p>
              {formErrors.map((m) => (
                <p key={m}>{resolveMessage(m)}</p>
              ))}
            </div>
          </div>
        ) : null}
        {children}
      </form>
    </FormProvider>
  );
}
