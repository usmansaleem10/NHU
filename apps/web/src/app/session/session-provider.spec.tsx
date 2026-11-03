// @vitest-environment jsdom
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BranchScope, SessionProvider, useSession } from './session-provider';
import type { Session, SessionSource } from './types';

afterEach(cleanup);

const base: Session = {
  user: { id: 'u', displayName: 'U', roleLabel: 'r' },
  tenant: {
    id: 't',
    name: 'T',
    enabledModules: [],
    format: { locale: 'en-PK', timeZone: 'Asia/Karachi', currency: 'PKR' },
  },
  branches: [
    { id: 'A', name: 'A' },
    { id: 'B', name: 'B' },
  ],
  activeBranchId: 'A',
  permissions: [],
};

function fakeSource(failSwitch = false) {
  let session = base;
  const source: SessionSource = {
    load: () => Promise.resolve(session),
    switchBranch: (id) => {
      if (failSwitch) return Promise.reject(new Error('switch failed'));
      session = { ...session, activeBranchId: id };
      return Promise.resolve(session);
    },
  };
  return { source, branch: () => session.activeBranchId };
}

const seen: string[] = [];

function BranchData({ branch }: { branch: () => string }) {
  const { session, switchBranch, switchBranchFailed } = useSession();
  // A list screen with keepPreviousData, like the data table.
  const q = useQuery({
    queryKey: ['patients'],
    queryFn: () =>
      new Promise<string>((r) =>
        setTimeout(() => {
          r(`rows of ${branch()}`);
        }, 5),
      ),
    placeholderData: keepPreviousData,
  });
  if (q.data) seen.push(`${session.activeBranchId} shows ${q.data}`);
  return (
    <>
      <p>{q.data ?? 'loading'}</p>
      {switchBranchFailed ? <p role="alert">failed</p> : null}
      <button
        onClick={() => {
          switchBranch('B');
        }}
      >
        switch
      </button>
    </>
  );
}

function setup(failSwitch = false) {
  const { source, branch } = fakeSource(failSwitch);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SessionProvider source={source}>
        {(state) =>
          state.status === 'ready' ? (
            <BranchScope>
              <BranchData branch={branch} />
            </BranchScope>
          ) : null
        }
      </SessionProvider>
    </QueryClientProvider>,
  );
}

describe('branch switch', () => {
  it('never shows the previous branch’s rows under the new branch', async () => {
    seen.length = 0;
    setup();
    expect(await screen.findByText('rows of A')).toBeTruthy();
    await act(async () => {
      screen.getByText('switch').click();
      await Promise.resolve();
    });
    expect(await screen.findByText('rows of B')).toBeTruthy();
    expect(seen.filter((s) => s.startsWith('B shows rows of A'))).toEqual([]);
  });

  it('reports a failed switch instead of silently staying on the old branch', async () => {
    setup(true);
    await screen.findByText('rows of A');
    await act(async () => {
      screen.getByText('switch').click();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('failed');
    });
  });
});
