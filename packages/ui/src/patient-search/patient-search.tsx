import { Search, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '../components/button.js';
import { Input, Label, NativeSelect } from '../components/inputs.js';
import { Skeleton } from '../components/display.js';
import { StatePanel } from '../components/state-panel.js';
import { useUiI18n } from '../i18n/context.js';
import { cn } from '../lib/cn.js';
import {
  formatCnicInput,
  normalizePatientQuery,
  PATIENT_SEARCH_TYPES,
  validatePatientQuery,
  type PatientQueryError,
  type PatientSearchQuery,
  type PatientSearchResult,
  type PatientSearchType,
} from './query.js';

export interface PatientSearchProps {
  /** Async search; honour `signal` so a newer search cancels the previous request. */
  onSearch: (
    query: PatientSearchQuery,
    signal: AbortSignal,
  ) => Promise<readonly PatientSearchResult[]>;
  onSelect: (patient: PatientSearchResult) => void;
  /** Which search types this screen offers (e.g. hide admissionId at OPD). */
  types?: readonly PatientSearchType[];
  defaultType?: PatientSearchType;
  className?: string;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'done'; results: readonly PatientSearchResult[] };

const INPUT_MODE: Partial<Record<PatientSearchType, 'numeric' | 'tel'>> = {
  cnic: 'numeric',
  phone: 'tel',
};

/**
 * Shared patient finder (F0-UI-07). Search runs on submit (Enter or button), never on every
 * keystroke: identifiers are exact-match lookups and CNIC/phone are personal data we don't spray
 * across requests. Nothing is written to the URL (AGENTS.md rule 10).
 */
export function PatientSearch({
  onSearch,
  onSelect,
  types = PATIENT_SEARCH_TYPES,
  defaultType = types[0] ?? 'mrn',
  className,
}: PatientSearchProps) {
  const { t } = useUiI18n();
  const typeId = useId();
  const valueId = useId();
  const errorId = useId();
  const [type, setType] = useState<PatientSearchType>(defaultType);
  const [text, setText] = useState('');
  const [error, setError] = useState<PatientQueryError | null>(null);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const controller = useRef<AbortController | null>(null);
  const lastQuery = useRef<PatientSearchQuery | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = (query: PatientSearchQuery) => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    lastQuery.current = query;
    setState({ kind: 'loading' });
    onSearch(query, ac.signal).then(
      (results) => {
        if (!ac.signal.aborted) setState({ kind: 'done', results });
      },
      () => {
        if (!ac.signal.aborted) setState({ kind: 'error' });
      },
    );
  };

  const errorText = error
    ? error.key === 'patientSearch.error.tooShort'
      ? t(error.key, { count: error.count })
      : t(error.key)
    : undefined;

  return (
    <section className={cn('flex flex-col gap-3', className)} aria-label={t('patientSearch.label')}>
      <form
        role="search"
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const query = normalizePatientQuery(type, text);
          const invalid = validatePatientQuery(query);
          setError(invalid);
          if (!invalid) run(query);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={typeId}>{t('patientSearch.searchBy')}</Label>
          <NativeSelect
            id={typeId}
            className="w-48"
            value={type}
            onChange={(e) => {
              const next = e.target.value as PatientSearchType;
              setType(next);
              setText(next === 'cnic' ? formatCnicInput(text) : text);
              setError(null);
            }}
          >
            {types.map((ty) => (
              <option key={ty} value={ty}>
                {t(`patientSearch.type.${ty}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <Label htmlFor={valueId}>{t(`patientSearch.type.${type}`)}</Label>
          <Input
            id={valueId}
            value={text}
            autoComplete="off"
            inputMode={INPUT_MODE[type]}
            placeholder={t(`patientSearch.placeholder.${type}`)}
            maxLength={type === 'cnic' ? 15 : 80}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              setText(type === 'cnic' ? formatCnicInput(e.target.value) : e.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        <Button type="submit">
          <Search aria-hidden />
          {t('common.search')}
        </Button>
        {errorText ? (
          <p id={errorId} role="alert" className="w-full text-xs font-medium text-destructive">
            {errorText}
          </p>
        ) : null}
      </form>

      <div className="rounded-lg border bg-card">
        {state.kind === 'idle' ? (
          <p className="p-4 text-sm text-muted-foreground">{t('patientSearch.idle')}</p>
        ) : state.kind === 'loading' ? (
          <div className="flex flex-col gap-2 p-4" aria-busy="true">
            <span className="sr-only" role="status">
              {t('common.loading')}
            </span>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : state.kind === 'error' ? (
          <StatePanel
            kind="error"
            onRetry={() => {
              if (lastQuery.current) run(lastQuery.current);
            }}
          />
        ) : state.results.length === 0 ? (
          <StatePanel kind="empty" title={t('patientSearch.noResults')} />
        ) : (
          <>
            <p className="border-b px-4 py-2 text-xs text-muted-foreground" role="status">
              {t('patientSearch.results', { count: state.results.length })}
            </p>
            <ul className="divide-y">
              {state.results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-start hover:bg-muted focus-visible:bg-muted"
                    aria-label={t('patientSearch.select', { name: p.name })}
                    onClick={() => {
                      onSelect(p);
                    }}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <UserRound className="size-4" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{p.mrn}</span>
                        {p.details ? ` · ${p.details}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
