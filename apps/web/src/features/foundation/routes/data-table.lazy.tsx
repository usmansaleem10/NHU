import {
  applySavedView,
  Badge,
  Button,
  DataTable,
  ExportButton,
  PageHeader,
  SavedViewsMenu,
  savedViewScope,
  sensitivePart,
  serializeTableQuery,
  setSearch,
  TableSearch,
  useFormatters,
  useSavedViews,
  useTableExport,
  withoutPage,
  withSensitive,
  type DataTableColumn,
  type ExportColumn,
  type TableQuery,
} from '@hims/ui';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createLazyRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { services } from '../../../app/services';
import { useSession } from '../../../app/session/session-provider';
import { DEMO_WARDS, type DemoPatient } from '../model';
import {
  PATIENT_TABLE_DEFAULTS,
  PATIENT_URL_POLICY,
  queryFromSearch,
  type TableMode,
} from './data-table.search';

export const Route = createLazyRoute('/foundation/data-table')({ component: DataTableScreen });

const TABLE_ID = 'foundation.patients';
const CONTINUOUS_PAGE = 200;

const STATUS_TONE = { admitted: 'info', discharged: 'neutral', transferred: 'warning' } as const;

function usePatientColumns() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  return useMemo(() => {
    const columns: DataTableColumn<DemoPatient>[] = [
      {
        id: 'mrn',
        header: t('foundation.table.col.mrn'),
        cell: (r) => <span className="font-mono">{r.mrn}</span>,
        sortable: true,
        filter: { kind: 'text' },
        width: 140,
        hideable: false,
      },
      {
        id: 'name',
        header: t('foundation.table.col.name'),
        cell: (r) => r.name,
        sortable: true,
        filter: { kind: 'text' },
        width: 220,
      },
      {
        id: 'gender',
        header: t('foundation.table.col.gender'),
        cell: (r) => t(`foundation.gender.${r.gender}`),
        filter: {
          kind: 'select',
          options: [
            { value: 'female', label: t('foundation.gender.female') },
            { value: 'male', label: t('foundation.gender.male') },
          ],
        },
        width: 120,
      },
      {
        id: 'ward',
        header: t('foundation.table.col.ward'),
        cell: (r) => r.ward,
        sortable: true,
        filter: { kind: 'select', options: DEMO_WARDS.map((w) => ({ value: w, label: w })) },
        width: 140,
      },
      {
        id: 'admittedAt',
        header: t('foundation.table.col.admittedAt'),
        cell: (r) => fmt.dateTime(r.admittedAt),
        sortable: true,
        width: 200,
      },
      {
        id: 'status',
        header: t('foundation.table.col.status'),
        cell: (r) => (
          <Badge tone={STATUS_TONE[r.status]}>{t(`foundation.status.${r.status}`)}</Badge>
        ),
        filter: {
          kind: 'select',
          options: (['admitted', 'discharged', 'transferred'] as const).map((s) => ({
            value: s,
            label: t(`foundation.status.${s}`),
          })),
        },
        width: 150,
      },
      {
        id: 'balance',
        header: t('foundation.table.col.balance'),
        cell: (r) => fmt.currency(r.balance),
        sortable: true,
        align: 'end',
        width: 160,
      },
    ];
    const exportColumns: ExportColumn<DemoPatient>[] = [
      { header: t('foundation.table.col.mrn'), value: (r) => r.mrn },
      { header: t('foundation.table.col.name'), value: (r) => r.name },
      { header: t('foundation.table.col.gender'), value: (r) => r.gender },
      { header: t('foundation.table.col.ward'), value: (r) => r.ward },
      { header: t('foundation.table.col.admittedAt'), value: (r) => r.admittedAt },
      { header: t('foundation.table.col.status'), value: (r) => r.status },
      { header: t('foundation.table.col.balance'), value: (r) => r.balance },
    ];
    return { columns, exportColumns };
  }, [t, fmt]);
}

function DataTableScreen() {
  const { t } = useTranslation();
  const search = useSearch({ from: '/foundation/data-table' });
  const navigate = useNavigate({ from: '/foundation/data-table' });
  // Search and identifying filters live only in memory (never URL, never storage).
  const [sensitive, setSensitive] = useState<Pick<TableQuery, 'search' | 'filters'>>({
    search: '',
    filters: {},
  });
  const query = useMemo(
    () => withSensitive(queryFromSearch(search), sensitive),
    [search, sensitive],
  );
  const { session } = useSession();
  const mode: TableMode = search.mode === 'continuous' ? 'continuous' : 'paged';
  const { columns, exportColumns } = usePatientColumns();
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  const setQuery = (next: TableQuery, nextMode: TableMode = mode) => {
    setSensitive(sensitivePart(next, PATIENT_URL_POLICY));
    void navigate({
      search: {
        ...serializeTableQuery(next, PATIENT_TABLE_DEFAULTS, PATIENT_URL_POLICY),
        ...(nextMode === 'continuous' ? { mode: 'continuous' as const } : {}),
      },
      replace: true,
    });
  };

  const paged = useQuery({
    queryKey: ['demo-patients', 'page', query],
    queryFn: ({ signal }) => services.demoPatients(query, signal),
    placeholderData: keepPreviousData,
    enabled: mode === 'paged',
  });

  const continuousKey = withoutPage(query);
  const continuous = useInfiniteQuery({
    queryKey: ['demo-patients', 'infinite', continuousKey],
    queryFn: ({ pageParam, signal }) =>
      services.demoPatients({ ...query, page: pageParam, pageSize: CONTINUOUS_PAGE }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) =>
      all.length * CONTINUOUS_PAGE < last.total ? all.length : undefined,
    enabled: mode === 'continuous',
  });

  const views = useSavedViews(
    savedViewScope(session.tenant.id, session.user.id, TABLE_ID),
    services.savedViews,
    PATIENT_URL_POLICY,
  );
  const exporter = useTableExport({
    fetchPage: services.demoPatients,
    columns: exportColumns,
    fileName: 'patients.csv',
  });

  const active = mode === 'paged' ? paged : continuous;
  const rows =
    mode === 'paged'
      ? (paged.data?.rows ?? [])
      : (continuous.data?.pages.flatMap((p) => p.rows) ?? []);
  const total =
    mode === 'paged' ? (paged.data?.total ?? 0) : (continuous.data?.pages[0]?.total ?? 0);

  return (
    <>
      <PageHeader
        title={t('foundation.table.title')}
        description={t('foundation.table.description')}
        actions={
          <div role="group" aria-label={t('foundation.table.mode')} className="flex gap-1">
            <Button
              size="sm"
              variant={mode === 'paged' ? 'default' : 'outline'}
              aria-pressed={mode === 'paged'}
              onClick={() => {
                setQuery({ ...query, page: 0 }, 'paged');
              }}
            >
              {t('foundation.table.modePaged')}
            </Button>
            <Button
              size="sm"
              variant={mode === 'continuous' ? 'default' : 'outline'}
              aria-pressed={mode === 'continuous'}
              onClick={() => {
                setQuery({ ...query, page: 0 }, 'continuous');
              }}
            >
              {t('foundation.table.modeContinuous')}
            </Button>
          </div>
        }
      />
      <DataTable
        caption={t('foundation.table.caption')}
        columns={columns}
        rows={rows}
        total={total}
        getRowId={(r) => r.id}
        query={query}
        onQueryChange={setQuery}
        status={active.isPending ? 'pending' : active.isError ? 'error' : 'success'}
        isFetching={active.isFetching}
        onRetry={() => {
          void active.refetch();
        }}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        mode={mode}
        onEndReached={() => {
          if (continuous.hasNextPage && !continuous.isFetchingNextPage) {
            void continuous.fetchNextPage();
          }
        }}
        height="calc(100dvh - 15rem)"
        toolbar={
          <>
            <TableSearch
              label={t('foundation.table.search')}
              value={query.search}
              onChange={(value) => {
                setQuery(setSearch(query, value));
              }}
            />
            <SavedViewsMenu
              views={views.views}
              onApply={(view) => {
                setColumnVisibility({ ...view.columnVisibility });
                setQuery(applySavedView(view));
              }}
              onSave={(name) => views.save(name, query, columnVisibility)}
              onRemove={(view) => views.remove(view.id)}
            />
            <ExportButton
              status={exporter.status}
              maxRows={exporter.maxRows}
              onExport={() => {
                void exporter.exportCsv(query, total);
              }}
            />
          </>
        }
      />
    </>
  );
}
