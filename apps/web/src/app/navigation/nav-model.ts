import { LayoutDashboard } from 'lucide-react';

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
];
