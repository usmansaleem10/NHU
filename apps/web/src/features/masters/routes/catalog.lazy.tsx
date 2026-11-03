import { Card, PageHeader, StatePanel } from '@hims/ui';
import { createLazyRoute, Link } from '@tanstack/react-router';
import { ChevronRight, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { canAccess } from '../../../app/navigation/access';
import { useSession } from '../../../app/session/session-provider';
import { masterKey, MASTERS } from '../registry';
import { useDynamicT } from './use-dynamic-t';

export const Route = createLazyRoute('/masters')({ component: MastersCatalog });

function MastersCatalog() {
  const { t } = useTranslation();
  const td = useDynamicT();
  const { access } = useSession();
  const visible = MASTERS.filter((m) =>
    canAccess(access, { module: m.module, permission: m.permissions.view }),
  );

  return (
    <>
      <PageHeader title={t('masters.catalogTitle')} description={t('masters.catalogDescription')} />
      {visible.length === 0 ? (
        <StatePanel kind="empty" title={t('masters.catalogEmpty')} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((m) => (
            <li key={m.id}>
              <Card className="transition-colors hover:bg-muted/50">
                <Link
                  to="/masters/$masterId"
                  params={{ masterId: m.id }}
                  className="flex items-center gap-3 p-4"
                >
                  <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <ListChecks className="size-5" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">{td(masterKey(m.id, 'title'))}</span>
                    <span className="truncate text-sm text-muted-foreground">
                      {td(masterKey(m.id, 'description'), '')}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 text-muted-foreground rtl:rotate-180"
                    aria-hidden
                  />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
