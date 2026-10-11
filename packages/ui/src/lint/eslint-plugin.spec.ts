import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import plugin from '../../eslint-plugin.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('hims/no-raw-colours', plugin.rules['no-raw-colours'], {
  valid: [
    'const c = "bg-primary text-primary-foreground border-border";',
    'const c = "hover:bg-accent/50 text-destructive";',
    'const id = "#main";', // anchor, not a colour
    'const label = "Ward #12";',
    'const c = `bg-${tone}`;',
  ],
  invalid: [
    { code: 'const c = "bg-blue-600";', errors: 1 },
    { code: 'const c = "hover:text-red-500/80";', errors: 1 },
    { code: 'const c = "text-white";', errors: 1 },
    { code: 'const c = "border-s-slate-200";', errors: 1 },
    { code: 'const style = { color: "#ff0000" };', errors: 1 },
    { code: 'const style = { color: "#fff" };', errors: 1 },
    { code: 'const c = "bg-[#123abc]";', errors: 1 },
    { code: 'const style = { color: "rgb(1 2 3)" };', errors: 1 },
    { code: 'const style = { color: "oklch(0.5 0.1 200)" };', errors: 1 },
    { code: 'const c = `p-2 ${x} bg-emerald-50`;', errors: 1 },
  ],
});

tester.run('hims/no-literal-ui-strings', plugin.rules['no-literal-ui-strings'], {
  valid: [
    'const a = <p>{t("home.title")}</p>;',
    'const a = <span className="font-mono">{value}</span>;',
    'const a = <p> · </p>;', // punctuation only
    'const a = <input placeholder={t("x")} type="text" />;',
    'const a = <Icon aria-hidden />;',
  ],
  invalid: [
    { code: 'const a = <p>Patients</p>;', errors: 1 },
    { code: 'const a = <p>{"Save"}</p>;', errors: 1 },
    { code: 'const a = <p>مریض</p>;', errors: 1 },
    { code: 'const a = <input placeholder="Search…" />;', errors: 1 },
    { code: 'const a = <button aria-label="Close" />;', errors: 1 },
    { code: 'const a = <img alt={"Logo"} />;', errors: 1 },
  ],
});
