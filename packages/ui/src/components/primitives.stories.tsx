import type { Story } from '@ladle/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { COLOR_TOKENS } from '../theme/tokens.js';
import { applyTenantTheme } from '../theme/theme-css.js';
import { Button } from './button.js';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from './display.js';
import { Checkbox, Input, Label, NativeSelect, Textarea } from './inputs.js';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './overlays.js';
import { StatePanel } from './state-panel.js';

export default { title: 'Foundation' };

export const Tokens: Story = () => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {COLOR_TOKENS.map((token) => (
      <div key={token} className="flex items-center gap-2 text-xs">
        <span className="size-8 rounded border" style={{ background: `var(--${token})` }} />
        <code>--{token}</code>
      </div>
    ))}
  </div>
);

/** Tenant theming is a variable swap: this is what F0-TEN-05 will do with tenant config. */
export const TenantOverride: Story = () => {
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={() => {
          const next = !on;
          setOn(next);
          applyTenantTheme(next ? { light: { primary: 'teal', radius: '1rem' } } : {});
        }}
      >
        Toggle demo tenant theme
      </Button>
      <div className="flex gap-2">
        <Button>Primary</Button>
        <Badge tone="primary">Brand badge</Badge>
      </div>
    </div>
  );
};

export const Buttons: Story = () => (
  <div className="flex flex-wrap gap-2">
    <Button>Default</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="destructive">Delete</Button>
    <Button variant="link">Link</Button>
    <Button size="icon" aria-label="Add">
      <Plus />
    </Button>
    <Button disabled>Disabled</Button>
  </div>
);

export const Badges: Story = () => (
  <div className="flex flex-wrap gap-2">
    <Badge>Neutral</Badge>
    <Badge tone="success">Active</Badge>
    <Badge tone="warning">Pending</Badge>
    <Badge tone="danger">Inactive</Badge>
    <Badge tone="info">Info</Badge>
  </div>
);

export const Inputs: Story = () => (
  <div className="flex max-w-sm flex-col gap-3">
    <Label htmlFor="a">Name</Label>
    <Input id="a" placeholder="Type…" />
    <Input aria-invalid placeholder="Invalid" />
    <Textarea placeholder="Notes" />
    <NativeSelect>
      <option>One</option>
      <option>Two</option>
    </NativeSelect>
    <div className="flex items-center gap-2">
      <Checkbox id="c" />
      <Label htmlFor="c">Active</Label>
    </div>
  </div>
);

export const Overlays: Story = () => (
  <div className="flex gap-2">
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent title="Dialog title" description="Supporting text">
        <p>Body</p>
      </DialogContent>
    </Dialog>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export const States: Story = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {(['loading', 'empty', 'error', 'forbidden'] as const).map((kind) => (
      <Card key={kind}>
        <CardHeader>
          <CardTitle>{kind}</CardTitle>
          <CardDescription>StatePanel kind="{kind}"</CardDescription>
        </CardHeader>
        <CardContent>
          <StatePanel kind={kind} onRetry={() => undefined} />
        </CardContent>
      </Card>
    ))}
  </div>
);
