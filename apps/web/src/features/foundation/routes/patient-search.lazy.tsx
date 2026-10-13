import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  PatientSearch,
  type PatientSearchResult,
} from '@hims/ui';
import { createLazyRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { services } from '../../../app/services';

export const Route = createLazyRoute('/foundation/patient-search')({
  component: PatientSearchScreen,
});

/** Reference host for the shared patient finder; C01 registration wires the same component. */
function PatientSearchScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<PatientSearchResult | null>(null);

  return (
    <>
      <PageHeader title={t('patientSearch.title')} description={t('patientSearch.description')} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PatientSearch onSearch={services.searchPatients} onSelect={setSelected} />
        <Card aria-live="polite">
          <CardHeader>
            <CardTitle>{t('patientSearch.selectedTitle')}</CardTitle>
            {selected ? null : <CardDescription>{t('patientSearch.noneSelected')}</CardDescription>}
          </CardHeader>
          {selected ? (
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t('patientSearch.selectedName')}</dt>
                <dd data-testid="selected-patient">{selected.name}</dd>
                <dt className="text-muted-foreground">{t('patientSearch.selectedMrn')}</dt>
                <dd className="font-mono">{selected.mrn}</dd>
              </dl>
            </CardContent>
          ) : null}
        </Card>
      </div>
    </>
  );
}
