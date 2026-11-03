import { Circle } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { accessFromSession, canAccess, filterNav, type NavGroup } from './access';

const item = (id: string, module: string, permission: `${string}.${string}.${string}`) => ({
  id,
  module,
  permission,
  labelKey: 'home.title' as const,
  to: `/${id}`,
  icon: Circle,
});

const groups: NavGroup[] = [
  {
    id: 'clinical',
    labelKey: 'home.title',
    items: [
      item('registration', 'clinical', 'clinical.patient.view'),
      item('lab', 'lab', 'lab.order.view'),
    ],
  },
  {
    id: 'finance',
    labelKey: 'home.title',
    items: [item('vouchers', 'finance', 'finance.voucher.view')],
  },
];

const access = (permissions: string[], modules: string[]) =>
  accessFromSession({
    permissions: permissions as `${string}.${string}.${string}`[],
    tenant: { enabledModules: modules },
  });

describe('filterNav', () => {
  it('shows only items the user is permitted to see', () => {
    const nav = filterNav(
      groups,
      access(['clinical.patient.view'], ['clinical', 'lab', 'finance']),
    );
    expect(nav.map((g) => g.items.map((i) => i.id))).toEqual([['registration']]);
  });

  it('hides a permitted item when the tenant has not licensed its module', () => {
    const nav = filterNav(
      groups,
      access(['clinical.patient.view', 'lab.order.view', 'finance.voucher.view'], ['clinical']),
    );
    expect(nav.flatMap((g) => g.items.map((i) => i.id))).toEqual(['registration']);
  });

  it('drops groups that end up empty', () => {
    expect(
      filterNav(groups, access(['finance.voucher.view'], ['finance'])).map((g) => g.id),
    ).toEqual(['finance']);
    expect(filterNav(groups, access([], ['clinical', 'lab', 'finance']))).toEqual([]);
  });

  it('does not treat a permission prefix as a grant', () => {
    expect(
      canAccess(access(['clinical.patient'], ['clinical']), {
        module: 'clinical',
        permission: 'clinical.patient.view',
      }),
    ).toBe(false);
  });
});
