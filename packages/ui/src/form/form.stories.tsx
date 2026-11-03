import { zodResolver } from '@hookform/resolvers/zod';
import type { Story } from '@ladle/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../components/button.js';
import { CheckboxField, DateField, SelectField, TextField, TypeaheadField } from './fields.js';
import { Form } from './form.js';
import { ProblemError } from './problem.js';
import type { TypeaheadSearch } from './typeahead.js';

export default { title: 'Form kit' };

const schema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(2, 'At least 2 characters'),
  gender: z.string().min(1, 'Pick one'),
  dob: z.string().min(1, 'Required'),
  department: z.object({ value: z.string(), label: z.string() }).nullable(),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;

const departments = Array.from({ length: 300 }, (_, i) => ({
  value: String(i),
  label: `Department ${String(i)}`,
}));
const search: TypeaheadSearch = (q, { limit }) =>
  new Promise((r) =>
    setTimeout(() => {
      r(departments.filter((d) => d.label.toLowerCase().includes(q.toLowerCase())).slice(0, limit));
    }, 200),
  );

export const ServerErrorMapping: Story = () => {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', gender: '', dob: '', department: null, active: true },
  });
  return (
    <Form
      form={form}
      className="max-w-md"
      onSubmit={async () => {
        await new Promise((r) => setTimeout(r, 300));
        // Simulated API 422: one field error, one form-level error.
        throw new ProblemError({
          status: 422,
          title: 'Validation failed',
          errors: [
            { pointer: '/code', message: 'Code already exists' },
            { pointer: '/branchId', message: 'Branch is closed for edits' },
          ],
        });
      }}
    >
      <TextField<Values> name="code" label="Code" required />
      <TextField<Values> name="name" label="Name" required />
      <SelectField<Values>
        name="gender"
        label="Gender"
        required
        options={[
          { value: 'f', label: 'Female' },
          { value: 'm', label: 'Male' },
        ]}
      />
      <DateField<Values> name="dob" label="Date of birth" required />
      <TypeaheadField<Values> name="department" label="Department" search={search} />
      <CheckboxField<Values> name="active" label="Active" />
      <Button type="submit">Save</Button>
    </Form>
  );
};
