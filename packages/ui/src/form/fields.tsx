import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { Controller, get, useFormContext, type FieldValues, type Path } from 'react-hook-form';

import { Checkbox, Input, Label, NativeSelect, Textarea } from '../components/inputs.js';
import { useFormatters } from '../format/format-context.js';
import { useUiI18n } from '../i18n/context.js';
import { cn } from '../lib/cn.js';
import { Typeahead, type TypeaheadOption, type TypeaheadSearch } from './typeahead.js';

/** Static dropdowns above this size must use TypeaheadField (AGENTS.md "Large data"). */
export const MAX_STATIC_OPTIONS = 50;

interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface ShellProps {
  id: string;
  label: string;
  description?: string | undefined;
  required?: boolean | undefined;
  error?: string | undefined;
  className?: string | undefined;
  children: (aria: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
    'aria-required': boolean | undefined;
  }) => ReactNode;
  inline?: boolean;
}

/** Label + control + helper + error, wired for screen readers. */
export function FieldShell({
  id,
  label,
  description,
  required,
  error,
  className,
  children,
  inline,
}: ShellProps) {
  const { t, resolveMessage } = useUiI18n();
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(' ') || undefined;
  const control = children({
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
  });
  return (
    <div className={cn('flex flex-col gap-1.5', className)} data-field={id}>
      {inline ? (
        <div className="flex items-center gap-2">
          {control}
          <Label htmlFor={id}>{label}</Label>
        </div>
      ) : (
        <>
          <Label htmlFor={id}>
            {label}
            {required ? (
              <span className="ms-0.5 text-destructive" aria-hidden title={t('common.required')}>
                *
              </span>
            ) : null}
          </Label>
          {control}
        </>
      )}
      {description ? (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="text-xs font-medium text-destructive">
          {resolveMessage(error)}
        </p>
      ) : null}
    </div>
  );
}

function useFieldError<T extends FieldValues>(name: Path<T>): string | undefined {
  const { formState } = useFormContext<T>();
  const err = get(formState.errors, name) as { message?: unknown } | undefined;
  return typeof err?.message === 'string' ? err.message : undefined;
}

export function TextField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  className,
  type = 'text',
  autoComplete,
  maxLength,
  inputMode,
}: BaseFieldProps<T> & {
  type?: 'text' | 'email' | 'tel' | 'number' | 'password';
  autoComplete?: string;
  maxLength?: number;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  const id = useId();
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      {(aria) => (
        <Input
          {...aria}
          type={type}
          disabled={disabled}
          {...(autoComplete ? { autoComplete } : {})}
          {...(maxLength ? { maxLength } : {})}
          {...(inputMode ? { inputMode } : {})}
          {...register(name)}
        />
      )}
    </FieldShell>
  );
}

export function TextareaField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  className,
  rows = 3,
}: BaseFieldProps<T> & { rows?: number }) {
  const id = useId();
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      {(aria) => <Textarea {...aria} rows={rows} disabled={disabled} {...register(name)} />}
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  className,
  options,
}: BaseFieldProps<T> & { options: readonly SelectOption[] }) {
  const id = useId();
  const { register } = useFormContext<T>();
  const { t } = useUiI18n();
  const error = useFieldError(name);
  if (options.length > MAX_STATIC_OPTIONS) {
    // Fail loudly: a long static list means the screen should use a typeahead.
    throw new RangeError(
      `SelectField "${name}" has ${String(options.length)} options; use TypeaheadField above ${String(MAX_STATIC_OPTIONS)}.`,
    );
  }
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      {(aria) => (
        <NativeSelect {...aria} disabled={disabled} {...register(name)}>
          <option value="">{t('form.select')}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      )}
    </FieldShell>
  );
}

export function CheckboxField<T extends FieldValues>({
  name,
  label,
  description,
  disabled,
  className,
}: BaseFieldProps<T>) {
  const id = useId();
  const { control } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      className={className}
      inline
    >
      {(aria) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Checkbox
              {...aria}
              ref={field.ref}
              disabled={disabled ?? false}
              checked={field.value === true}
              onCheckedChange={(v) => {
                field.onChange(v === true);
              }}
              onBlur={field.onBlur}
            />
          )}
        />
      )}
    </FieldShell>
  );
}

/**
 * Date / date-time input. The value is ISO ("2026-10-10" or "2026-10-10T14:30"); the native
 * picker gives keyboard + mobile support, and the helper line echoes the value in the TENANT
 * format so staff can confirm it regardless of the browser's own locale.
 */
export function DateField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  className,
  withTime = false,
  min,
  max,
}: BaseFieldProps<T> & { withTime?: boolean; min?: string; max?: string }) {
  const id = useId();
  const { control } = useFormContext<T>();
  const fmt = useFormatters();
  const error = useFieldError(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const raw: unknown = field.value;
        const value = typeof raw === 'string' ? raw : '';
        let preview: string | undefined;
        if (value) {
          try {
            // datetime-local has no zone: it is wall-clock time in the tenant zone already.
            preview = withTime
              ? `${fmt.date(value.slice(0, 10))} ${value.slice(11, 16)}`
              : fmt.date(value);
          } catch {
            preview = undefined;
          }
        }
        return (
          <FieldShell
            id={id}
            label={label}
            description={preview ?? description}
            required={required}
            error={error}
            className={className}
          >
            {(aria) => (
              <Input
                {...aria}
                ref={field.ref}
                type={withTime ? 'datetime-local' : 'date'}
                disabled={disabled}
                value={value}
                {...(min ? { min } : {})}
                {...(max ? { max } : {})}
                onChange={(e) => {
                  field.onChange(e.target.value);
                }}
                onBlur={field.onBlur}
              />
            )}
          </FieldShell>
        );
      }}
    />
  );
}

function asOption(v: unknown): TypeaheadOption | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Partial<TypeaheadOption>;
  return typeof o.value === 'string' && typeof o.label === 'string'
    ? { value: o.value, label: o.label }
    : null;
}

/** Async search select for large option sets: never preloads, caps results at 50. */
export function TypeaheadField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  className,
  search,
  minChars,
  placeholder,
}: BaseFieldProps<T> & {
  search: TypeaheadSearch;
  minChars?: number;
  placeholder?: string;
}) {
  const id = useId();
  const { control } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      required={required}
      error={error}
      className={className}
    >
      {(aria) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Typeahead
              {...aria}
              inputRef={field.ref}
              value={asOption(field.value)}
              onChange={field.onChange}
              onBlur={field.onBlur}
              search={search}
              disabled={disabled ?? false}
              {...(minChars === undefined ? {} : { minChars })}
              {...(placeholder === undefined ? {} : { placeholder })}
            />
          )}
        />
      )}
    </FieldShell>
  );
}
