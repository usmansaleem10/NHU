import { Database, FileInput, LayoutDashboard, Table2, UserSearch } from 'lucide-react';

import type { NavGroup } from './access';

/**
 * The full navigation. What a user sees is this, filtered by filterNav() against their
 * permissions and the tenant's licensed modules. Features add their entries here; each `to`
 * must match a route whose staticData.access is the same requirement.
 */
export const NAV_MODEL: readonly NavGroup[] = [
  {
    id: 'general',
    labelKey: 'nav.group.general',
    items: [
      {
        id: 'home',
        labelKey: 'nav.home',
        to: '/',
        icon: LayoutDashboard,
        module: 'home',
        permission: 'home.dashboard.view',
      },
    ],
  },
  {
    id: 'foundation',
    labelKey: 'nav.group.foundation',
    items: [
      {
        id: 'data-table',
        labelKey: 'nav.dataTable',
        to: '/foundation/data-table',
        icon: Table2,
        module: 'foundation',
        permission: 'foundation.table.view',
      },
      {
        id: 'forms',
        labelKey: 'nav.forms',
        to: '/foundation/forms',
        icon: FileInput,
        module: 'foundation',
        permission: 'foundation.form.view',
      },
      {
        id: 'patient-search',
        labelKey: 'nav.patientSearch',
        to: '/foundation/patient-search',
        icon: UserSearch,
        module: 'foundation',
        permission: 'foundation.patientSearch.view',
      },
    ],
  },
  {
    id: 'administration',
    labelKey: 'nav.group.administration',
    items: [
      {
        id: 'masters',
        labelKey: 'nav.masters',
        to: '/masters',
        icon: Database,
        module: 'masters',
        permission: 'masters.catalog.view',
      },
    ],
  },
];
