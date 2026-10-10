import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { createAppRouter } from '../router';
import { NAV_MODEL } from './nav-model';

describe('NAV_MODEL', () => {
  const router = createAppRouter(new QueryClient());
  const routes = (
    Object.values(router.routesById) as readonly {
      id: string;
      fullPath: string;
      options: { staticData?: { access?: unknown } };
    }[]
  ).filter((r) => r.id !== '__root__');

  it.each(NAV_MODEL.flatMap((g) => g.items).map((i) => [i.id, i] as const))(
    '%s points at a real route guarded by the same module + permission',
    (_id, item) => {
      const route = routes.find((r) => r.fullPath === item.to || r.fullPath === `${item.to}/`);
      expect(route, `no route for ${item.to}`).toBeDefined();
      // A nav item whose route is guarded differently would show a link that opens "forbidden",
      // or worse, hide a link to a screen the user may actually open.
      expect(route?.options.staticData?.access).toEqual({
        module: item.module,
        permission: item.permission,
      });
    },
  );

  it('has unique item ids', () => {
    const ids = NAV_MODEL.flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
