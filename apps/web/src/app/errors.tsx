import { Button, StatePanel } from '@hims/ui';
import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Route-level error boundary: the shell stays usable, only the failing screen is replaced. */
export function RouteError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <StatePanel
      kind="error"
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
    />
  );
}

export function NotFound() {
  const { t } = useTranslation();
  return (
    <StatePanel
      kind="empty"
      title={t('app.notFoundTitle')}
      description={t('app.notFoundBody')}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t('app.goHome')}</Link>
        </Button>
      }
    />
  );
}

export function RoutePending() {
  return <StatePanel kind="loading" />;
}

function CrashScreen() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <StatePanel
        kind="error"
        title={t('app.crashTitle')}
        description={t('app.crashBody')}
        action={
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            {t('app.reload')}
          </Button>
        }
      />
    </main>
  );
}

/** Last-resort boundary around providers + router (errors outside any route). */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Hook for the observability client (F0-OBS); never log personal data here.
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? <CrashScreen /> : this.props.children;
  }
}
