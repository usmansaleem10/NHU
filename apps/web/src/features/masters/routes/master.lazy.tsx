import {
  Badge,
  Button,
  DataTable,
  PageHeader,
  serializeTableQuery,
  setSearch,
  StatePanel,
  TableSearch,
  parseTableQuery,
  type DataTableColumn,
  type TableQuery,
} from '@hims/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLazyRoute, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { CheckCircle2, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { canAccess } from '../../../app/navigation/access';
import { services } from '../../../app/services';
import { useSession } from '../../../app/session/session-provider';
import { MasterFormDialog } from '../crud/master-form-dialog';
import type { MasterInput, MasterMetadata, MasterRecord } from '../crud/types';
import { MASTER_TABLE_DEFAULTS, MASTER_TABLE_OPTIONS } from '../index';
import { findMaster, masterKey } from '../registry';
import { useDynamicT } from './use-dynamic-t';

export const Route = createLazyRoute('/masters/$masterId')({ component: MasterRoute });

function MasterRoute() {
  const { t } = useTranslation();
  const { masterId } = useParams({ from: '/masters/$masterId' });
  const { access } = useSession();
  const meta = findMaster(masterId);
  if (!meta) {
    return (
      <StatePanel kind="empty" title={t('app.notFoundTitle')} description={t('app.notFoundBody')} />
    );
  }
  if (!canAccess(access, { module: meta.module, permission: meta.permissions.view })) {
    return <StatePanel kind="forbidden" />;
  }
  return <MasterScreen key={meta.id} meta={meta} />;
}

/** The generated list + add/edit screen for one simple master. */
function MasterScreen({ meta }: { meta: MasterMetadata }) {
  const { t } = useTranslation();
  const td = useDynamicT();
  const { access } = useSession();
  const queryClient = useQueryClient();
  const search = useSearch({ from: '/masters/$masterId' });
  const navigate = useNavigate({ from: '/masters/$masterId' });
  const query = useMemo(
    () => parseTableQuery(search, MASTER_TABLE_DEFAULTS, MASTER_TABLE_OPTIONS),
    [search],
  );
  const source = services.masters(meta.id);
  const canCreate = canAccess(access, { module: meta.module, permission: meta.permissions.create });
  const canUpdate = canAccess(access, { module: meta.module, permission: meta.permissions.update });
  const title = td(masterKey(meta.id, 'title'));
  const singular = td(masterKey(meta.id, 'singular'));

  const [editing, setEditing] = useState<MasterRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);

  const listKey = ['masters', meta.id, 'list'] as const;
  const list = useQuery({
    queryKey: [...listKey, query],
    queryFn: ({ signal }) => source.list(query, signal),
    placeholderData: keepPreviousData,
  });

  const save = useMutation({
    mutationFn: (input: MasterInput) =>
      editing ? source.update(editing.id, input, editing.version) : source.create(input),
    onSuccess: async (record) => {
      setSavedName(record.name);
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  const setQuery = (next: TableQuery) => {
    void navigate({ search: serializeTableQuery(next, MASTER_TABLE_DEFAULTS), replace: true });
  };

  const openDialog = (record: MasterRecord | null) => {
    setEditing(record);
    setSavedName(null);
    setDialogOpen(true);
  };

  const columns = useMemo<DataTableColumn<MasterRecord>[]>(
    () => [
      {
        id: 'code',
        header: t('masters.field.code'),
        cell: (r) => <span className="font-mono">{r.code}</span>,
        sortable: true,
        filter: { kind: 'text' },
        width: 160,
        hideable: false,
      },
      {
        id: 'name',
        header: t('masters.field.name'),
        cell: (r) => r.name,
        sortable: true,
        filter: { kind: 'text' },
        width: 240,
      },
      {
        id: 'description',
        header: t('masters.field.description'),
        cell: (r) => <span className="text-muted-foreground">{r.description}</span>,
      },
      {
        id: 'status',
        header: t('masters.field.status'),
        cell: (r) => (
          <Badge tone={r.status === 'active' ? 'success' : 'neutral'}>
            {t(`masters.status.${r.status}`)}
          </Badge>
        ),
        filter: {
          kind: 'select',
          options: [
            { value: 'active', label: t('masters.status.active') },
            { value: 'inactive', label: t('masters.status.inactive') },
          ],
        },
        width: 140,
      },
    ],
    [t],
  );

  const addButton = canCreate ? (
    <Button
      onClick={() => {
        openDialog(null);
      }}
    >
      <Plus aria-hidden />
      {t('masters.add', { item: singular })}
    </Button>
  ) : null;

  const unfiltered = !query.search && Object.keys(query.filters).length === 0;

  return (
    <>
      <PageHeader
        title={title}
        description={td(masterKey(meta.id, 'description'), '')}
        actions={addButton}
      />
      {savedName ? (
        <p
          role="status"
          className="mb-3 flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm"
        >
          <CheckCircle2 className="size-4 text-success" aria-hidden />
          {t('masters.saved', { name: savedName })}
        </p>
      ) : null}
      <DataTable
        caption={title}
        columns={columns}
        rows={list.data?.rows ?? []}
        total={list.data?.total ?? 0}
        getRowId={(r) => r.id}
        query={query}
        onQueryChange={setQuery}
        status={list.isPending ? 'pending' : list.isError ? 'error' : 'success'}
        isFetching={list.isFetching}
        onRetry={() => {
          void list.refetch();
        }}
        pageSizeOptions={MASTER_TABLE_OPTIONS.pageSizes}
        height="calc(100dvh - 17rem)"
        toolbar={
          <TableSearch
            label={t('masters.search', { items: title })}
            value={query.search}
            onChange={(value) => {
              setQuery(setSearch(query, value));
            }}
          />
        }
        emptyState={
          unfiltered ? (
            <StatePanel
              kind="empty"
              title={t('masters.empty', { items: title })}
              action={addButton}
            />
          ) : undefined
        }
        {...(canUpdate
          ? {
              rowActionsHeader: t('masters.actions'),
              rowActions: (r: MasterRecord) => (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t('masters.editRow', { name: r.name })}
                  onClick={() => {
                    openDialog(r);
                  }}
                >
                  <Pencil aria-hidden />
                  {t('masters.edit')}
                </Button>
              ),
            }
          : {})}
      />
      <MasterFormDialog
        meta={meta}
        singular={singular}
        record={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={async (input) => {
          await save.mutateAsync(input);
        }}
      />
    </>
  );
}
