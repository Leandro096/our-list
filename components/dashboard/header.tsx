"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { LogOut, User, Moon, Sun, Monitor, Menu, Heart } from "lucide-react";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  LayoutDashboard,
  Users,
  ScanLine,
  Armchair,
  Tags,
  Settings,
  History,
} from "lucide-react";
import { LanguageSwitcher } from "../language-switcher";
import { useI18n } from "@/locales/i18n-provider";

const navigationItems = [
  {
    key: "nav.dashboard" as const,
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    key: "nav.guests" as const,
    href: "/dashboard/guests",
    icon: Users,
    permission: PERMISSIONS.GUESTS_VIEW,
  },
  {
    key: "nav.scanner" as const,
    href: "/dashboard/scanner",
    icon: ScanLine,
    permission: PERMISSIONS.SCANNER_USE,
  },
  {
    key: "nav.history" as const,
    href: "/dashboard/scanner/history",
    icon: History,
    permission: PERMISSIONS.SCANNER_HISTORY,
  },
  {
    key: "nav.seating" as const,
    href: "/dashboard/seating",
    icon: Armchair,
    permission: PERMISSIONS.SEATING_VIEW,
  },
  {
    key: "nav.categories" as const,
    href: "/dashboard/categories",
    icon: Tags,
    permission: PERMISSIONS.CATEGORIES_VIEW,
  },
  {
    key: "nav.settings" as const,
    href: "/dashboard/settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_USERS,
  },
];

export function DashboardHeader() {
  const { profile, signOut, isLoading } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { t } = useI18n();

  const userPermissions = profile?.permissions || [];
  const isSuperAdmin = profile?.is_super_admin || false;

  const filteredNavigation = navigationItems.filter((item) =>
    hasPermission(userPermissions, item.permission, isSuperAdmin),
  );

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/60 md:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-16 items-center gap-3 border-b border-border px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <span className="font-serif text-lg font-semibold">
              Wedding Manager
            </span>
          </div>
          <nav className="space-y-1 p-3">
            {filteredNavigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Page title area - can be used for breadcrumbs */}
      <div className="flex-1" />

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Theme toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            {t("common.light")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            {t("common.dark")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            {t("common.system")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary">
                {isLoading ? "..." : getInitials(profile?.display_name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">
                {profile?.display_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
              {profile?.is_super_admin && (
                <span className="mt-1 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Super Admin
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings/profile">
              <User className="mr-2 h-4 w-4" />
              {t("settings.account")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("common.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
