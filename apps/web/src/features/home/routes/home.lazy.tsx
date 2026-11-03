import { PageHeader } from '@hims/ui';
import { createLazyRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { useSession } from '../../../app/session/session-provider';

export const Route = createLazyRoute('/')({ component: HomePage });

function HomePage() {
  const { t } = useTranslation();
  const { session } = useSession();
  return (
    <PageHeader
      title={t('home.welcome', { name: session.user.displayName })}
      description={t('home.subtitle')}
    />
  );
}
