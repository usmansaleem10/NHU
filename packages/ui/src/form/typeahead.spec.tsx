// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Typeahead, type TypeaheadOption, type TypeaheadSearch } from './typeahead.js';

afterEach(cleanup);

function setup(search: TypeaheadSearch, limit?: number) {
  const onChange = vi.fn<(v: TypeaheadOption | null) => void>();
  render(
    <Typeahead
      aria-describedby={undefined}
      value={null}
      onChange={onChange}
      search={search}
      debounceMs={0}
      minChars={2}
      {...(limit === undefined ? {} : { limit })}
    />,
  );
  return { input: screen.getByRole('combobox'), onChange, user: userEvent.setup() };
}

describe('Typeahead', () => {
  it('does not search on focus or before the minimum characters (never preloads)', async () => {
    const search = vi.fn<TypeaheadSearch>(() => Promise.resolve([]));
    const { input, user } = setup(search);
    await user.click(input);
    await user.type(input, 'a');
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(search).not.toHaveBeenCalled();
    await user.type(input, 'l');
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe('al');
  });

  it('never asks the server for more than 50 options and trims oversized replies', async () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      value: String(i),
      label: `Item ${String(i)}`,
    }));
    const search = vi.fn<TypeaheadSearch>(() => Promise.resolve(many));
    const { input, user } = setup(search, 500);
    await user.type(input, 'it');
    expect(await screen.findAllByRole('option')).toHaveLength(50);
    expect(search.mock.calls[0]?.[1].limit).toBe(50);
  });

  it('ignores a slow stale response that arrives after a newer query', async () => {
    let resolveSlow: (v: readonly TypeaheadOption[]) => void = () => undefined;
    const search = vi.fn<TypeaheadSearch>((q) =>
      q === 'ab'
        ? new Promise((r) => {
            resolveSlow = r;
          })
        : Promise.resolve([{ value: 'abc', label: 'ABC result' }]),
    );
    const { input, user } = setup(search);
    await user.type(input, 'ab');
    await act(() => new Promise((r) => setTimeout(r, 10)));
    await user.type(input, 'c');
    expect(await screen.findByRole('option', { name: 'ABC result' })).toBeTruthy();
    await act(async () => {
      resolveSlow([{ value: 'old', label: 'Stale result' }]);
      await Promise.resolve();
    });
    expect(screen.queryByRole('option', { name: 'Stale result' })).toBeNull();
  });

  it('selects the highlighted option with the keyboard', async () => {
    const search: TypeaheadSearch = () =>
      Promise.resolve([
        { value: '1', label: 'Cardiology' },
        { value: '2', label: 'Cardiac surgery' },
      ]);
    const { input, onChange, user } = setup(search);
    await user.type(input, 'car');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({ value: '2', label: 'Cardiac surgery' });
  });
});
