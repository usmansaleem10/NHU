import { Loader2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type Ref } from 'react';

import { useUiI18n } from '../i18n/context.js';
import { cn } from '../lib/cn.js';

export interface TypeaheadOption {
  value: string;
  label: string;
  description?: string;
}

/** Server search. `limit` is at most MAX_TYPEAHEAD_RESULTS; honour `signal` to drop stale calls. */
export type TypeaheadSearch = (
  query: string,
  options: { signal: AbortSignal; limit: number },
) => Promise<readonly TypeaheadOption[]>;

export const MAX_TYPEAHEAD_RESULTS = 50;

export interface TypeaheadProps {
  id?: string;
  value: TypeaheadOption | null;
  onChange: (value: TypeaheadOption | null) => void;
  onBlur?: () => void;
  search: TypeaheadSearch;
  minChars?: number;
  debounceMs?: number;
  limit?: number;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string | undefined;
  'aria-required'?: boolean | undefined;
}

// Every non-idle phase records the query it belongs to, so a phase left over from an earlier
// query (during the next debounce) is never shown or selectable for the current text.
type Phase =
  | { kind: 'idle' }
  | { kind: 'loading'; query: string }
  | { kind: 'results'; query: string; options: readonly TypeaheadOption[] }
  | { kind: 'error'; query: string };

/**
 * ARIA 1.2 combobox with async search. Never loads options until the user has typed `minChars`
 * characters, and never asks the server for more than 50 (AGENTS.md "Large data").
 */
export function Typeahead({
  id,
  value,
  onChange,
  onBlur,
  search,
  minChars = 2,
  debounceMs = 250,
  limit = 20,
  placeholder,
  disabled = false,
  inputRef,
  ...aria
}: TypeaheadProps) {
  const { t } = useUiI18n();
  const listId = useId();
  const [text, setText] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [active, setActive] = useState(-1);
  const cappedLimit = Math.min(Math.max(1, limit), MAX_TYPEAHEAD_RESULTS);

  // Reflect an externally set value (form reset, edit dialog) in the input text.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value?.label ?? '');
  }

  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  });

  const query = text.trim();
  const isSelectedText = value !== null && text === value.label;
  const shouldSearch = open && !isSelectedText && query.length >= minChars;

  useEffect(() => {
    if (!shouldSearch) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPhase({ kind: 'loading', query });
      searchRef.current(query, { signal: controller.signal, limit: cappedLimit }).then(
        (options) => {
          if (controller.signal.aborted) return; // a newer query superseded this one
          setPhase({ kind: 'results', query, options: options.slice(0, cappedLimit) });
          setActive(options.length > 0 ? 0 : -1);
        },
        () => {
          if (!controller.signal.aborted) setPhase({ kind: 'error', query });
        },
      );
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [shouldSearch, query, cappedLimit, debounceMs]);

  const current: Phase = phase.kind !== 'idle' && phase.query === query ? phase : { kind: 'idle' };
  const options = current.kind === 'results' && shouldSearch ? current.options : [];
  const select = (option: TypeaheadOption) => {
    onChange(option);
    setText(option.label);
    setOpen(false);
  };

  let status: string | null = null;
  if (open && !isSelectedText) {
    if (query.length < minChars) status = t('typeahead.typeMore', { count: minChars });
    else if (current.kind === 'loading' || current.kind === 'idle') {
      status = t('typeahead.searching');
    } else if (current.kind === 'error') status = t('typeahead.error');
    else if (options.length === 0) status = t('typeahead.noResults');
    else if (options.length >= cappedLimit)
      status = t('typeahead.moreResults', { count: cappedLimit });
  }
  const expanded = open && (options.length > 0 || status !== null);
  const activeId = active >= 0 && options[active] ? `${listId}-${String(active)}` : undefined;

  return (
    <div className="relative">
      <input
        {...aria}
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={expanded}
        data-typeahead-open={expanded ? '' : undefined}
        aria-controls={listId}
        aria-activedescendant={activeId}
        placeholder={placeholder}
        disabled={disabled}
        value={text}
        className="h-10 w-full min-w-0 rounded-md border border-input bg-card ps-3 pe-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value) onChange(null); // editing the text clears the previous selection
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            if (options.length > 0) setActive((i) => (i + 1) % options.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (options.length > 0) setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
          } else if (e.key === 'Enter') {
            const option = options[active];
            if (expanded && option) {
              e.preventDefault();
              select(option);
            }
          } else if (e.key === 'Escape' && expanded) {
            // Close only the list; the surrounding dialog ignores this Escape (see DialogContent).
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
      <span className="absolute end-1 top-1/2 flex -translate-y-1/2 items-center">
        {current.kind === 'loading' && shouldSearch ? (
          <Loader2
            className="m-2 size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden
          />
        ) : text && !disabled ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label={t('common.clear')}
            className="flex size-8 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onClick={() => {
              setText('');
              onChange(null);
            }}
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </span>
      <ul
        id={listId}
        role="listbox"
        hidden={!expanded}
        className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      >
        {options.map((option, i) => (
          <li
            key={option.value}
            id={`${listId}-${String(i)}`}
            role="option"
            aria-selected={i === active}
            className={cn(
              'flex cursor-pointer flex-col rounded-sm px-2 py-1.5 text-sm',
              i === active && 'bg-accent text-accent-foreground',
            )}
            onMouseDown={(e) => {
              e.preventDefault(); // keep focus in the input
            }}
            onMouseEnter={() => {
              setActive(i);
            }}
            onClick={() => {
              select(option);
            }}
          >
            <span>{option.label}</span>
            {option.description ? (
              <span className="text-xs text-muted-foreground">{option.description}</span>
            ) : null}
          </li>
        ))}
        {status ? (
          <li role="presentation" aria-hidden className="px-2 py-1.5 text-sm text-muted-foreground">
            {status}
          </li>
        ) : null}
      </ul>
      {/* Always mounted (a hidden listbox can't announce): screen readers hear status changes. */}
      <span role="status" aria-live="polite" className="sr-only">
        {open && !isSelectedText ? (status ?? '') : ''}
      </span>
    </div>
  );
}
