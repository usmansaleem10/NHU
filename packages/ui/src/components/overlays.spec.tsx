// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { Typeahead, type TypeaheadSearch } from '../form/typeahead.js';
import { Dialog, SheetContent } from './overlays.js';

afterEach(cleanup);

const search: TypeaheadSearch = () => Promise.resolve([{ value: '1', label: 'Cardiology' }]);

describe('SheetContent (navigation drawer)', () => {
  it('lets Escape close an open typeahead list first, and only then the sheet', async () => {
    render(
      <Dialog defaultOpen>
        <SheetContent title="Menu">
          <Typeahead value={null} onChange={() => undefined} search={search} debounceMs={0} />
        </SheetContent>
      </Dialog>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByRole('combobox'), 'car');
    await screen.findByRole('option', { name: 'Cardiology' });

    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy();
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull();
  });
});
