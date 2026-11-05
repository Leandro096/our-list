'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, UserPlus, KeyRound } from 'lucide-react';

import { toast } from '@/hooks';
import type { Role } from '@/lib';
import { useTranslation } from '@/locales';
import { createUserAction } from '@/app/dashboard/settings/users/actions';

import {
  Input,
  Label,
  Button,
  Dialog,
  Select,
  SelectItem,
  DialogTitle,
  SelectValue,
  DialogHeader,
  DialogContent,
  SelectTrigger,
  SelectContent,
  DialogDescription,
} from '@/components/ui';

interface CreateUserDialogProps {
  roles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ roles, open, onOpenChange }: CreateUserDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<string>('none');
  const [isInviting, setIsInviting] = useState(false);

  const reset = () => {
    setEmail('');
    setName('');
    setPassword('');
    setRoleId('none');
  };

  const generatePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint32Array(12));
    setPassword(Array.from(bytes, (b) => chars[b % chars.length]).join(''));
  };

  const handleClose = (opened: boolean) => {
    if (!opened) reset();
    onOpenChange(opened);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsInviting(true);
    try {
      await createUserAction({
        email,
        password,
        displayName: name,
        roleIds: roleId === 'none' ? [] : [roleId],
        isSuperAdmin: false,
      });
      toast({
        title: t('settings.users_section.createSuccess'),
        description: t('settings.users_section.createSuccessDesc').replace('{email}', email),
      });
      router.refresh();
      handleClose(false);
    } catch (err) {
      toast({
        title: t('settings.users_section.createError'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t('settings.users_section.createUser')}
          </DialogTitle>
          <DialogDescription>{t('settings.users_section.createDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-5 pt-2">
          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="invite-email">
              {t('settings.users_section.createEmail')}
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                required
                className="pl-9"
                placeholder="colaborador@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="invite-name">{t('settings.users_section.createName')}</Label>
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="invite-password">
              {t('settings.users_section.createPassword')}
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-password"
                  required
                  minLength={6}
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" onClick={generatePassword}>
                {t('settings.users_section.generatePassword')}
              </Button>
            </div>
          </div>

          {/* Role */}
          <div className="grid gap-2">
            <Label htmlFor="invite-role">
              {t('settings.users_section.inviteRole')}
              <span className="ml-1 text-xs text-muted-foreground">({t('common.optional')})</span>
            </Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="invite-role">
                <SelectValue placeholder={t('settings.users_section.inviteNoRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('settings.users_section.inviteNoRole')}</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                    {role.description && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        — {role.description}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isInviting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isInviting || !email || password.length < 6}>
              {isInviting
                ? t('settings.users_section.creating')
                : t('settings.users_section.createUser')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
