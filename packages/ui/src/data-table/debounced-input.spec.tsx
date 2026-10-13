// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { DebouncedInput } from './data-table.js';

afterEach(cleanup);

const sleep = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

/** Parent that applies a committed value asynchronously, like a router navigation. */
function Host({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DebouncedInput
        aria-label="filter"
        value={value}
        delay={20}
        onCommit={(v) => {
          setTimeout(() => {
            setValue(v);
          }, 40);
        }}
      />
      <button
        onClick={() => {
          setValue('reset');
        }}
      >
        external
      </button>
    </>
  );
}

describe('DebouncedInput', () => {
  it('keeps keystrokes typed while a previous commit is still being applied', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'filter' });
    await user.type(input, 'ab');
    await sleep(25); // "ab" committed, parent applies it 40ms later
    await user.type(input, 'c');
    // The stale "ab" lands now; the draft must not jump back to it (lost keystroke / flicker).
    await sleep(40);
    expect(input.value).toBe('abc');
    await sleep(80);
    expect(input.value).toBe('abc');
  });

  it('adopts a genuinely external change (saved view, back button)', async () => {
    const user = userEvent.setup();
    render(<Host initial="x" />);
    await user.click(screen.getByText('external'));
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'filter' }).value).toBe('reset');
  });
});
