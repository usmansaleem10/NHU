import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type ColorScheme,
} from '@hims/ui';
import { Building2, ChevronDown, Languages, LogOut, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { isLanguage, LANGUAGES, setLanguage } from '../i18n/i18n';
import { useSession } from '../session/session-provider';
import { useColorScheme } from '../theme';

export function BranchSwitcher() {
  const { t } = useTranslation();
  const { session, switchBranch, switchingBranch, switchBranchFailed } = useSession();
  const active = session.branches.find((b) => b.id === session.activeBranchId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="max-w-56"
            aria-label={t('shell.branchSwitcher', { branch: active?.name ?? '' })}
            disabled={switchingBranch}
          >
            <Building2 aria-hidden />
            <span className="truncate" data-testid="active-branch">
              {active?.name}
            </span>
            <ChevronDown className="opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t('shell.branch')}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={session.activeBranchId} onValueChange={switchBranch}>
            {session.branches.map((b) => (
              <DropdownMenuRadioItem key={b.id} value={b.id}>
                {b.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {switchBranchFailed ? (
        <span role="alert" className="text-xs text-destructive">
          {t('shell.branchSwitchFailed')}
        </span>
      ) : null}
    </>
  );
}

export function UserMenu() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [scheme, setScheme] = useColorScheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t('shell.userMenu')}>
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UserRound className="size-4" aria-hidden />
          </span>
          <span className="hidden max-w-40 truncate md:inline">{session.user.displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground">{session.user.displayName}</span>
          <span>{session.user.roleLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('shell.theme')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={scheme}
          onValueChange={(v) => {
            setScheme(v as ColorScheme);
          }}
        >
          <DropdownMenuRadioItem value="light">{t('shell.themeLight')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">{t('shell.themeDark')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">{t('shell.themeSystem')}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {/* Sign-out is wired by the auth ticket (P01); disabled rather than a dead click. */}
        <DropdownMenuItem disabled className="text-destructive">
          <LogOut aria-hidden />
          {t('shell.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = isLanguage(i18n.language) ? i18n.language : 'en';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t('shell.language')}>
          <Languages aria-hidden />
          <span className="hidden sm:inline">{t(`language.${current}`)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('shell.language')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(v) => {
            if (isLanguage(v)) setLanguage(v);
          }}
        >
          {LANGUAGES.map((lng) => (
            <DropdownMenuRadioItem key={lng} value={lng} lang={lng}>
              {t(`language.${lng}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
