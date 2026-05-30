'use client';

import { useState } from 'react';
import { Lock, User } from 'lucide-react';

import { toast } from '@/hooks';
import { useTranslation } from '@/locales';
import type { UserWithRoles } from '@/lib';
import { updateUserProfileAction, updatePasswordAction } from '@/app/dashboard/settings/actions';

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

export function ProfileForm({ profile }: ProfileFormProps) {
  const { t } = useTranslation();

  // --- Profile state ---
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>(
    profile.theme_preference ?? 'system'
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- Password state ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
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
      setIsSavingProfile(false);
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
    setIsSavingPassword(true);
    try {
      const error = await updatePasswordAction(newPassword).then(() => null).catch((e) => e);
      if (error) throw error;
      toast({ title: t('profile.passwordUpdated') });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsSavingPassword(false);
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
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* Theme preference */}
            <div className="grid gap-2">
              <Label htmlFor="profile-theme">{t('common.theme')}</Label>
              <Select
                value={themePreference}
                onValueChange={(v) => setThemePreference(v as 'light' | 'dark' | 'system')}
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
                onChange={(e) => setNewPassword(e.target.value)}
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
                onChange={(e) => setConfirmPassword(e.target.value)}
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
