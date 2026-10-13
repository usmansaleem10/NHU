import { cn } from '@hims/ui';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { filterNav } from '../navigation/access';
import { NAV_MODEL } from '../navigation/nav-model';
import { useSession } from '../session/session-provider';

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { access } = useSession();
  const groups = useMemo(() => filterNav(NAV_MODEL, access), [access]);

  return (
    <nav aria-label={t('shell.navLabel')} className="flex flex-col gap-5 px-3 py-4">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-1">
          <h2 className="px-2 text-xs font-semibold tracking-wide text-sidebar-muted-foreground uppercase">
            {t(group.labelKey)}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link
                    // Nav paths are checked against the route tree by nav-model.spec.ts.
                    to={item.to as '/'}
                    activeOptions={{ exact: item.to === '/', includeSearch: false }}
                    onClick={onNavigate}
                    className={cn(
                      'flex min-h-10 items-center gap-3 rounded-md px-2 text-sm font-medium text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      'data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
