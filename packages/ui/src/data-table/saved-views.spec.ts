import { describe, expect, it } from 'vitest';

import { defaultTableQuery } from './query-state.js';
import {
  createStorageSavedViewsStore,
  savedViewScope,
  toSavedQuery,
  withoutPage,
  type SavedView,
} from './saved-views.js';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => data.delete(k),
    setItem: (k, v) => data.set(k, v),
  };
}

const query = withoutPage(defaultTableQuery());
const view = (id: string, name: string): SavedView => ({ id, name, query, columnVisibility: {} });

describe('storage saved-views store', () => {
  it('keeps views per table and replaces a view saved under the same name', async () => {
    const store = createStorageSavedViewsStore(memoryStorage());
    await store.save('patients', view('1', 'Ward A'));
    await store.save('patients', view('2', 'Ward A'));
    await store.save('staff', view('3', 'Ward A'));
    expect((await store.list('patients')).map((v) => v.id)).toEqual(['2']);
    expect((await store.list('staff')).map((v) => v.id)).toEqual(['3']);
  });

  it('survives a corrupt or foreign storage entry', async () => {
    const storage = memoryStorage();
    storage.setItem('hims.views.patients', '{not json');
    storage.setItem('hims.views.staff', JSON.stringify([{ junk: true }, view('9', 'ok')]));
    const store = createStorageSavedViewsStore(storage);
    expect(await store.list('patients')).toEqual([]);
    expect((await store.list('staff')).map((v) => v.id)).toEqual(['9']);
  });
});

describe('what a saved view may persist', () => {
  const policy = { search: false, filters: ['ward', 'status'] };

  it('drops free-text search and identifying filters before anything reaches storage', () => {
    const saved = toSavedQuery(
      {
        ...defaultTableQuery(),
        page: 4,
        sort: { id: 'name', desc: true },
        search: 'Ayesha Khan',
        filters: { ward: 'ICU', name: 'Ayesha', mrn: 'MR-000123' },
      },
      policy,
    );
    expect(saved).toEqual({
      ...withoutPage(defaultTableQuery()),
      sort: { id: 'name', desc: true },
      search: '',
      filters: { ward: 'ICU' },
    });
  });

  it('keeps each user’s views apart per tenant', () => {
    expect(savedViewScope('demo-a', 'u1', 'patients')).not.toBe(
      savedViewScope('demo-b', 'u1', 'patients'),
    );
    expect(savedViewScope('demo-a', 'u1', 'patients')).not.toBe(
      savedViewScope('demo-a', 'u2', 'patients'),
    );
  });
});
