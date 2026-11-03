/**
 * Message catalogue for text rendered by packages/ui itself. The app registers these as the
 * `ui` i18next namespace and passes its translate function to <UiI18nProvider>, so the shared
 * components stay framework-agnostic and Urdu-ready. Interpolation uses {{name}}.
 */
export const uiMessagesEn = {
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.retry': 'Try again',
  'common.loading': 'Loading…',
  'common.search': 'Search',
  'common.clear': 'Clear',
  'common.required': 'Required',
  'state.emptyTitle': 'Nothing here yet',
  'state.errorTitle': 'Something went wrong',
  'state.errorBody': 'We could not load this. Check your connection and try again.',
  'state.forbiddenTitle': 'You do not have access',
  'state.forbiddenBody': 'Ask your administrator for the permission needed to open this screen.',
  'table.rowsPerPage': 'Rows per page',
  'table.pageOf': 'Page {{page}} of {{pages}}',
  'table.rangeOf': '{{from}}–{{to}} of {{total}}',
  'table.loadedOf': '{{loaded}} of {{total}} loaded',
  'table.firstPage': 'First page',
  'table.previousPage': 'Previous page',
  'table.nextPage': 'Next page',
  'table.lastPage': 'Last page',
  'table.columns': 'Columns',
  'table.toggleColumns': 'Show or hide columns',
  'table.sortAscending': 'Sorted ascending',
  'table.sortDescending': 'Sorted descending',
  'table.sortBy': 'Sort by {{column}}',
  'table.filterBy': 'Filter by {{column}}',
  'table.noRows': 'No records match the current filters.',
  'table.refreshing': 'Refreshing…',
  'table.export': 'Export CSV',
  'table.exporting': 'Exporting…',
  'table.exportFailed': 'Export failed. Try again.',
  'table.exportTooLarge':
    'More than {{max}} rows — narrow the filters or request a background export.',
  'table.savedViews': 'Saved views',
  'table.saveView': 'Save current view',
  'table.viewName': 'View name',
  'table.deleteView': 'Delete view {{name}}',
  'table.noSavedViews': 'No saved views yet',
  'table.allOption': 'All',
  'typeahead.typeMore': 'Type at least {{count}} characters to search',
  'typeahead.noResults': 'No matches',
  'typeahead.searching': 'Searching…',
  'typeahead.error': 'Search failed. Keep typing to retry.',
  'typeahead.moreResults': 'Showing the first {{count}} matches — refine your search',
  'form.fixErrors': 'Please fix the highlighted fields.',
  'form.select': 'Select…',
  'patientSearch.label': 'Find patient',
  'patientSearch.searchBy': 'Search by',
  'patientSearch.type.mrn': 'MRN',
  'patientSearch.type.name': 'Name',
  'patientSearch.type.phone': 'Phone',
  'patientSearch.type.cnic': 'CNIC',
  'patientSearch.type.employeeId': 'Employee / SAP ID',
  'patientSearch.type.admissionId': 'Admission ID',
  'patientSearch.placeholder.mrn': 'e.g. MR-000123',
  'patientSearch.placeholder.name': 'First or last name',
  'patientSearch.placeholder.phone': '03xx xxxxxxx',
  'patientSearch.placeholder.cnic': '12345-1234567-1',
  'patientSearch.placeholder.employeeId': 'Employee or SAP number',
  'patientSearch.placeholder.admissionId': 'e.g. ADM-2026-0001',
  'patientSearch.error.tooShort': 'Enter at least {{count}} characters.',
  'patientSearch.error.cnic': 'CNIC must have 13 digits (5-7-1).',
  'patientSearch.error.phone': 'Enter at least 7 digits.',
  'patientSearch.results': 'Patients found: {{count}}',
  'patientSearch.noResults': 'No patient matches this search.',
  'patientSearch.idle': 'Choose what to search by, then enter a value.',
  'patientSearch.select': 'Select {{name}}',
  'patientSearch.column.mrn': 'MRN',
  'patientSearch.column.name': 'Name',
  'patientSearch.column.details': 'Details',
} as const;

export type UiMessageKey = keyof typeof uiMessagesEn;
export type UiMessages = Record<UiMessageKey, string>;

/** Urdu catalogue. Missing keys fall back to English through i18next. */
export const uiMessagesUr: Partial<UiMessages> = {
  'common.close': 'بند کریں',
  'common.cancel': 'منسوخ کریں',
  'common.save': 'محفوظ کریں',
  'common.retry': 'دوبارہ کوشش کریں',
  'common.loading': 'لوڈ ہو رہا ہے…',
  'common.search': 'تلاش کریں',
  'common.clear': 'صاف کریں',
  'common.required': 'لازمی',
  'state.emptyTitle': 'ابھی یہاں کچھ نہیں',
  'state.errorTitle': 'کچھ غلط ہو گیا',
  'state.errorBody': 'یہ لوڈ نہیں ہو سکا۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔',
  'state.forbiddenTitle': 'آپ کو رسائی حاصل نہیں',
  'state.forbiddenBody': 'یہ اسکرین کھولنے کے لیے اپنے منتظم سے اجازت لیں۔',
  'table.rowsPerPage': 'فی صفحہ قطاریں',
  'table.pageOf': 'صفحہ {{page}} از {{pages}}',
  'table.rangeOf': '{{from}}–{{to}} از {{total}}',
  'table.columns': 'کالم',
  'table.noRows': 'موجودہ فلٹرز سے کوئی ریکارڈ نہیں ملا۔',
  'table.export': 'CSV برآمد کریں',
  'table.savedViews': 'محفوظ ویوز',
  'typeahead.noResults': 'کوئی نتیجہ نہیں',
  'typeahead.searching': 'تلاش جاری ہے…',
  'form.fixErrors': 'براہ کرم نشان زدہ خانے درست کریں۔',
  'patientSearch.label': 'مریض تلاش کریں',
  'patientSearch.searchBy': 'تلاش بذریعہ',
  'patientSearch.type.name': 'نام',
  'patientSearch.type.phone': 'فون',
  'patientSearch.type.cnic': 'شناختی کارڈ',
};

/** Fallback translator used when no provider is mounted (stories, tests): English + {{vars}}. */
export function interpolate(
  template: string,
  vars: Readonly<Record<string, string | number>> | undefined,
): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, name: string) => {
    const value = vars[name];
    return value === undefined ? whole : String(value);
  });
}
