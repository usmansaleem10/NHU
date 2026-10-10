import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { accessFromSession, type Access } from '../navigation/access';
import type { Session, SessionSource } from './types';

interface SessionContextValue {
  session: Session;
  access: Access;
  switchBranch: (branchId: string) => void;
  switchingBranch: boolean;
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
      queryClient.setQueryData(SESSION_KEY, session);
      // Everything else is branch-scoped data: refetch it for the new branch.
      await queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== SESSION_KEY[0] });
    },
  });

  const { data } = query;
  const { mutate, isPending } = branchMutation;
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
          }
        : null,
    [data, mutate, isPending],
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

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession() used outside a loaded <SessionProvider>');
  return ctx;
}
