import { PageHeader } from '@hims/ui';
import { createLazyRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createLazyRoute('/')({ component: HomePage });

function HomePage() {
  const { t } = useTranslation();
  return <PageHeader title={t('home.title')} description={t('home.subtitle')} />;
}
