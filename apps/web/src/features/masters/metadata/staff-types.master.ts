// Example simple master (P04 "Staff type": code, name, status, description).
// This file is ALL a new simple master needs: drop a `<id>.master.ts` here and the list screen,
// add/edit dialog, route, catalogue entry and labels are generated from it.
import { defineSimpleMaster } from '../crud/types';

export default defineSimpleMaster({
  id: 'staff-types',
  labels: {
    en: {
      title: 'Staff types',
      singular: 'staff type',
      description: 'Categories of staff used for rosters, permissions and reports.',
    },
    ur: { title: 'عملے کی اقسام', singular: 'عملے کی قسم' },
  },
});
