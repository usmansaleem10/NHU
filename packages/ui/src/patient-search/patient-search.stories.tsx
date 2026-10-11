import type { Story } from '@ladle/react';
import { useState } from 'react';

import { PatientSearch } from './patient-search.js';
import type { PatientSearchResult } from './query.js';

export default { title: 'Patient search' };

const FIXTURE: PatientSearchResult[] = [
  { id: '1', mrn: 'MR-000123', name: 'Demo Patient One', details: 'F · 34y' },
  { id: '2', mrn: 'MR-000124', name: 'Demo Patient Two', details: 'M · 61y' },
];

export const Default: Story = () => {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="max-w-2xl">
      <PatientSearch
        onSearch={(q) =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              if (q.value === 'ERROR') reject(new Error('boom'));
              else resolve(q.value === 'NONE' ? [] : FIXTURE);
            }, 400);
          })
        }
        onSelect={(p) => {
          setPicked(p.name);
        }}
      />
      <p className="mt-4 text-sm">Selected: {picked ?? '—'}</p>
    </div>
  );
};
