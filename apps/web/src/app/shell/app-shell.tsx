import { Button, Dialog, DialogTrigger, SheetContent, StatePanel } from '@hims/ui';
import { Outlet, useMatches, useRouterState } from '@tanstack/react-router';
import { Hospital, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { canAccess } from '../navigation/access';
import { useSession } from '../session/session-provider';
import { BranchSwitcher, UserMenu } from './header-menus';
import { SidebarNav } from './sidebar-nav';

function Brand() {
  const { session } = useSession();
  return (
    <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Hospital className="size-4" aria-hidden />
      </span>
      <span className="truncate text-sm font-semibold">{session.tenant.name}</span>
    </div>
  );
}

/**
 * Renders the matched screen only if every matched route's access requirement is met; otherwise
 * the permission-denied state. Mirrors the nav filter so a typed-in URL can't open a hidden screen.
 */
function GuardedOutlet() {
  const { access } = useSession();
  const matches = useMatches();
  const allowed = matches.every(
    (m) => !m.staticData.access || canAccess(access, m.staticData.access),
  );
  return allowed ? <Outlet /> : <StatePanel kind="forbidden" />;
}

export function AppShell() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // WCAG: after client-side navigation, move focus to the new screen's content.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-2 focus:top-2"
      >
        {t('app.skipToContent')}
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-e border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <Brand />
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur md:px-4">
          <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t('shell.openNav')}
              >
                <Menu aria-hidden />
              </Button>
            </DialogTrigger>
            <SheetContent title={t('shell.navLabel')}>
              <Brand />
              <SidebarNav
                onNavigate={() => {
                  setDrawerOpen(false);
                }}
              />
            </SheetContent>
          </Dialog>
          <div className="flex-1" />
          <BranchSwitcher />
          <UserMenu />
        </header>

        <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
          <GuardedOutlet />
        </main>
      </div>
    </div>
  );
}
