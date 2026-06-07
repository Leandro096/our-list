'use client';

import { useReducer } from 'react';
import { Lock, User } from 'lucide-react';

import { toast } from '@/hooks';
import { useTranslation } from '@/locales';
import type { UserWithRoles } from '@/lib';
import { updatePasswordAction, updateUserProfileAction } from '@/app/dashboard/settings/actions';

import {
  Card,
  Input,
  Label,
  Button,
  Select,
  Separator,
  CardTitle,
  CardHeader,
  SelectItem,
  CardContent,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from '@/components/ui';

interface ProfileFormProps {
  profile: UserWithRoles;
}

type State = {
  displayName: string;
  themePreference: 'light' | 'dark' | 'system';
  isSavingProfile: boolean;
  newPassword: string;
  confirmPassword: string;
  isSavingPassword: boolean;
};

type Action = { type: 'UPDATE'; payload: Partial<State> };

function reducer(state: State, action: Action): State {
  return { ...state, ...action.payload };
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const { t } = useTranslation();

  const [state, dispatch] = useReducer(reducer, {
    displayName: profile.display_name ?? '',
    themePreference: profile.theme_preference ?? 'system',
    isSavingProfile: false,
    newPassword: '',
    confirmPassword: '',
    isSavingPassword: false,
  });

  const {
    displayName,
    themePreference,
    isSavingProfile,
    newPassword,
    confirmPassword,
    isSavingPassword,
  } = state;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'UPDATE', payload: { isSavingProfile: true } });
    try {
      await updateUserProfileAction(profile.id, {
        display_name: displayName || undefined,
        theme_preference: themePreference,
      });
      toast({ title: t('profile.profileUpdated') });
    } catch (err) {
      toast({
        title: t('profile.profileUpdateError'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'UPDATE', payload: { isSavingProfile: false } });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: t('auth.passwordsMustMatch'),
        variant: 'destructive',
      });
      return;
    }
    dispatch({ type: 'UPDATE', payload: { isSavingPassword: true } });
    try {
      const error = await updatePasswordAction(newPassword)
        .then(() => null)
        .catch((err) => err);
      if (error) throw error;
      toast({ title: t('profile.passwordUpdated') });
      dispatch({ type: 'UPDATE', payload: { newPassword: '', confirmPassword: '' } });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      dispatch({ type: 'UPDATE', payload: { isSavingPassword: false } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            {t('profile.personalInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Email (read-only) */}
            <div className="grid gap-2">
              <Label htmlFor="profile-email">{t('common.email')}</Label>
              <Input
                id="profile-email"
                type="email"
                value={profile.email}
                disabled
                className="cursor-not-allowed bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">{t('profile.emailReadonly')}</p>
            </div>

            {/* Display name */}
            <div className="grid gap-2">
              <Label htmlFor="profile-name">{t('auth.displayName')}</Label>
              <Input
                id="profile-name"
                type="text"
                placeholder={t('auth.displayNamePlaceholder')}
                value={displayName}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE', payload: { displayName: e.target.value } })
                }
              />
            </div>

            {/* Theme preference */}
            <div className="grid gap-2">
              <Label htmlFor="profile-theme">{t('common.theme')}</Label>
              <Select
                value={themePreference}
                onValueChange={(v) =>
                  dispatch({
                    type: 'UPDATE',
                    payload: { themePreference: v as 'light' | 'dark' | 'system' },
                  })
                }
              >
                <SelectTrigger id="profile-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('common.light')}</SelectItem>
                  <SelectItem value="dark">{t('common.dark')}</SelectItem>
                  <SelectItem value="system">{t('common.system')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            {t('profile.changePassword')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="new-password">{t('profile.newPassword')}</Label>
              <Input
                id="new-password"
                type="password"
                minLength={6}
                required
                value={newPassword}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE', payload: { newPassword: e.target.value } })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirm-password"
                type="password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE', payload: { confirmPassword: e.target.value } })
                }
              />
              <p className="text-xs text-muted-foreground">{t('auth.passwordMinLength')}</p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingPassword || !newPassword || !confirmPassword}>
                {isSavingPassword ? t('common.saving') : t('profile.changePassword')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
