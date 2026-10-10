import type { LucideIcon } from 'lucide-react';

import type { AppMessageKey } from '../i18n/locales/en';
import type { ModuleKey, Permission, Session } from '../session/types';

/** What a screen needs: a licensed module AND a permission. Both are required. */
export interface AccessRequirement {
  module: ModuleKey;
  permission: Permission;
}

export interface NavItem extends AccessRequirement {
  id: string;
  labelKey: AppMessageKey;
  /** Route path; must be a registered route (checked by the nav-model spec). */
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  labelKey: AppMessageKey;
  items: readonly NavItem[];
}

export interface Access {
  permissions: ReadonlySet<string>;
  modules: ReadonlySet<string>;
}

export function accessFromSession(session: Pick<Session, 'permissions' | 'tenant'>): Access {
  return {
    permissions: new Set(session.permissions),
    modules: new Set(session.tenant.enabledModules),
  };
}

export function canAccess(access: Access, req: AccessRequirement): boolean {
  return access.modules.has(req.module) && access.permissions.has(req.permission);
}

/**
 * Navigation = permissions ∩ licensed modules (replaces the legacy per-role hand-built menus).
 * Hidden items are only a convenience: routes enforce the same rule and the API is the real gate.
 * Groups left with no visible items are dropped so no empty headings render.
 */
export function filterNav(groups: readonly NavGroup[], access: Access): NavGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((item) => canAccess(access, item)) }))
    .filter((g) => g.items.length > 0);
}
