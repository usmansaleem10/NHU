import { i18n, LANGUAGES } from '../../app/i18n/i18n';
import type { MasterMetadata } from './crud/types';

// Every metadata/*.master.ts file is a master screen; nothing else needs registering.
const modules = import.meta.glob<{ default: MasterMetadata }>('./metadata/*.master.ts', {
  eager: true,
});

export const MASTERS: readonly MasterMetadata[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id));

export function findMaster(id: string): MasterMetadata | undefined {
  return MASTERS.find((m) => m.id === id);
}

/** i18n keys for a master's labels; registered below from the metadata itself. */
export const masterKey = (id: string, field: 'title' | 'singular' | 'description') =>
  `masters.${id}.${field}`;

for (const meta of MASTERS) {
  for (const lng of LANGUAGES) {
    const labels = meta.labels[lng];
    if (!labels) continue;
    const bundle: Record<string, string> = {
      [masterKey(meta.id, 'title')]: labels.title,
      [masterKey(meta.id, 'singular')]: labels.singular,
    };
    if (labels.description) bundle[masterKey(meta.id, 'description')] = labels.description;
    i18n.addResources(lng, 'app', bundle);
  }
}
