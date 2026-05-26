"use client";

import {
  Input,
  Label,
  Button,
  Dialog,
  Select,
  DialogTitle,
  DialogHeader,
  DialogContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
  DialogDescription,
} from "@/components/ui";
import { useState } from "react";
import type { Role } from "@/lib";
import { toast } from "@/hooks";
import { Mail, UserPlus } from "lucide-react";
import { useTranslation } from "@/locales";
import { useRouter } from "next/navigation";
import { inviteUserAction } from "@/app/dashboard/settings/users/actions";

interface InviteUserDialogProps {
  roles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({
  roles,
  open,
  onOpenChange,
}: InviteUserDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("none");
  const [isInviting, setIsInviting] = useState(false);

  const reset = () => {
    setEmail("");
    setRoleId("none");
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsInviting(true);
    try {
      await inviteUserAction(email, roleId === "none" ? null : roleId);
      toast({
        title: t("settings.users_section.inviteSuccess"),
        description: t("settings.users_section.inviteSuccessDesc").replace(
          "{email}",
          email,
        ),
      });
      router.refresh();
      handleClose(false);
    } catch (err) {
      toast({
        title: t("settings.users_section.inviteError"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
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
            {t("settings.users_section.inviteUser")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.users_section.inviteDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-5 pt-2">
          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="invite-email">
              {t("settings.users_section.inviteEmail")}
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

          {/* Role */}
          <div className="grid gap-2">
            <Label htmlFor="invite-role">
              {t("settings.users_section.inviteRole")}
              <span className="ml-1 text-xs text-muted-foreground">
                ({t("common.optional")})
              </span>
            </Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="invite-role">
                <SelectValue
                  placeholder={t("settings.users_section.inviteNoRole")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t("settings.users_section.inviteNoRole")}
                </SelectItem>
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
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isInviting || !email}>
              {isInviting
                ? t("settings.users_section.inviting")
                : t("settings.users_section.inviteUser")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
