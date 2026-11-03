import { AlertTriangle, Inbox, Lock } from 'lucide-react';
import type { ReactNode } from 'react';

import { useUiI18n } from '../i18n/context.js';
import { cn } from '../lib/cn.js';
import { Button } from './button.js';
import { Skeleton } from './display.js';

export type StateKind = 'empty' | 'error' | 'forbidden' | 'loading';

export interface StatePanelProps {
  kind: StateKind;
  title?: string;
  description?: string;
  /** Primary recovery action (e.g. "Add first record"). */
  action?: ReactNode;
  /** For `error`: shows a retry button. */
  onRetry?: () => void;
  className?: string;
}

/**
 * The four non-happy screen states every list/detail screen must handle (AGENTS.md "Screen
 * design"). Text defaults come from the ui catalogue; screens may pass more specific copy.
 */
export function StatePanel({
  kind,
  title,
  description,
  action,
  onRetry,
  className,
}: StatePanelProps) {
  const { t } = useUiI18n();

  if (kind === 'loading') {
    return (
      <div className={cn('flex flex-col gap-3 p-6', className)} aria-busy="true">
        <span className="sr-only" role="status">
          {t('common.loading')}
        </span>
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  const presets = {
    empty: { icon: Inbox, title: t('state.emptyTitle'), body: undefined, role: undefined },
    error: {
      icon: AlertTriangle,
      title: t('state.errorTitle'),
      body: t('state.errorBody'),
      role: 'alert' as const,
    },
    forbidden: {
      icon: Lock,
      title: t('state.forbiddenTitle'),
      body: t('state.forbiddenBody'),
      role: undefined,
    },
  } satisfies Record<Exclude<StateKind, 'loading'>, unknown>;
  const preset = presets[kind];
  const Icon = preset.icon;
  const body = description ?? preset.body;

  return (
    <div
      role={preset.role}
      data-state={kind}
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-full',
          kind === 'error'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-base font-semibold">{title ?? preset.title}</p>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
      </div>
      {kind === 'error' && onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
      {action}
    </div>
  );
}
