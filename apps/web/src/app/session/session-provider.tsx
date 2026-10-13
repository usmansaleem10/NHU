import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, Fragment, useContext, useMemo, type ReactNode } from 'react';

import { accessFromSession, type Access } from '../navigation/access';
import type { Session, SessionSource } from './types';

interface SessionContextValue {
  session: Session;
  access: Access;
  switchBranch: (branchId: string) => void;
  switchingBranch: boolean;
  /** The last branch switch failed; the user is still on the previous branch. */
  switchBranchFailed: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const SESSION_KEY = ['session'] as const;

export type SessionState =
  | { status: 'pending' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; value: SessionContextValue };

/** Loads the session and exposes it; `children` receives the load state to render gates. */
export function SessionProvider({
  source,
  children,
}: {
  source: SessionSource;
  children: (state: SessionState) => ReactNode;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: ({ signal }) => source.load(signal),
    staleTime: Infinity,
  });
  const branchMutation = useMutation({
    mutationFn: (branchId: string) => source.switchBranch(branchId),
    onSuccess: async (session) => {
      // Everything except the session is branch-scoped. Drop it BEFORE the new branch becomes
      // active so no screen can render the old branch's rows (keepPreviousData included);
      // <BranchScope> remounts the screens, which then fetch for the new branch.
      const notSession = {
        predicate: (q: { queryKey: readonly unknown[] }) => q.queryKey[0] !== SESSION_KEY[0],
      };
      await queryClient.cancelQueries(notSession);
      queryClient.removeQueries(notSession);
      queryClient.setQueryData(SESSION_KEY, session);
    },
  });

  const { data } = query;
  const { mutate, isPending, isError } = branchMutation;
  const value = useMemo<SessionContextValue | null>(
    () =>
      data
        ? {
            session: data,
            access: accessFromSession(data),
            switchBranch: (id) => {
              mutate(id);
            },
            switchingBranch: isPending,
            switchBranchFailed: isError,
          }
        : null,
    [data, mutate, isPending, isError],
  );

  let state: SessionState;
  if (value) state = { status: 'ready', value };
  else if (query.isError)
    state = {
      status: 'error',
      retry: () => {
        void query.refetch();
      },
    };
  else state = { status: 'pending' };

  return <SessionContext value={value}>{children(state)}</SessionContext>;
}

/** Remounts its subtree when the active branch changes (fresh component and query state). */
export function BranchScope({ children }: { children: ReactNode }) {
  const { session } = useSession();
  return <Fragment key={session.activeBranchId}>{children}</Fragment>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession() used outside a loaded <SessionProvider>');
  return ctx;
}
