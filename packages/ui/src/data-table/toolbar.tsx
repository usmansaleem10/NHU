import { Bookmark, Download, Search, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '../components/button.js';
import { Input, Label } from '../components/inputs.js';
import {
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/overlays.js';
import { useUiI18n } from '../i18n/context.js';
import { DebouncedInput } from './data-table.js';
import type { ExportStatus } from './export.js';
import type { SavedView } from './saved-views.js';

export function TableSearch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Accessible label, e.g. "Search patients". */
  label: string;
}) {
  return (
    <div className="relative w-full max-w-xs">
      <Search
        className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <DebouncedInput
        type="search"
        aria-label={label}
        placeholder={label}
        className="h-9 ps-8"
        value={value}
        onCommit={onChange}
      />
    </div>
  );
}

export function ExportButton({
  status,
  maxRows,
  onExport,
}: {
  status: ExportStatus;
  maxRows: number;
  onExport: () => void;
}) {
  const { t } = useUiI18n();
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onExport} disabled={status === 'exporting'}>
        <Download aria-hidden />
        {status === 'exporting' ? t('table.exporting') : t('table.export')}
      </Button>
      {status === 'too-large' ? (
        <span role="alert" className="text-xs text-warning">
          {t('table.exportTooLarge', { max: maxRows })}
        </span>
      ) : null}
    </div>
  );
}

export function SavedViewsMenu({
  views,
  onApply,
  onSave,
  onRemove,
}: {
  views: readonly SavedView[];
  onApply: (view: SavedView) => void;
  onSave: (name: string) => Promise<void>;
  onRemove: (view: SavedView) => Promise<void>;
}) {
  const { t } = useUiI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const inputId = useId();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Bookmark aria-hidden />
            {t('table.savedViews')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>{t('table.savedViews')}</DropdownMenuLabel>
          {views.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{t('table.noSavedViews')}</p>
          ) : (
            views.map((view) => (
              <div key={view.id} className="flex items-center gap-1">
                <DropdownMenuItem
                  className="flex-1"
                  onSelect={() => {
                    onApply(view);
                  }}
                >
                  {view.name}
                </DropdownMenuItem>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('table.deleteView', { name: view.name })}
                  onClick={() => {
                    void onRemove(view);
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setDialogOpen(true);
            }}
          >
            {t('table.saveView')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={t('table.saveView')}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              void onSave(name).then(() => {
                setName('');
                setDialogOpen(false);
              });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId}>{t('table.viewName')}</Label>
              <Input
                id={inputId}
                value={name}
                required
                maxLength={60}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
