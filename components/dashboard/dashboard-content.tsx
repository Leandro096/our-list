'use client';

import { formatDistanceToNow } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { Users, Clock, UserX, ScanLine, UserCheck } from 'lucide-react';
import {
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  BarChart,
  PieChart,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

import type { DashboardStats, RecentActivityItem } from '@/lib/types';

import { Card, CardTitle, CardHeader, CardContent, CardDescription } from '@/components/ui/card';

import { useLocale, useTranslation } from '@/locales/i18n-provider';

interface DashboardContentProps {
  stats: DashboardStats;
}

export function DashboardContent({ stats }: DashboardContentProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const dateFnsLocale = locale === 'es' ? esLocale : undefined;
  const TooltipContent = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color?: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground shadow-md">
        {label && <p className="mb-1 font-medium">{label}</p>}
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  const statusColors: Record<string, string> = {
    Confirmed: 'var(--chart-2)',
    Pending: 'var(--chart-1)',
    Declined: 'var(--chart-5)',
    Tentative: 'var(--chart-3)',
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.totalGuests')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalGuests}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.invitedToWedding')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.confirmed')}
            </CardTitle>
            <UserCheck className="h-4 w-4 text-sage" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sage">{stats.confirmedGuests}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalGuests > 0
                ? t('dashboard.percentConfirmed', {
                    percent: Math.round((stats.confirmedGuests / stats.totalGuests) * 100),
                  })
                : t('dashboard.noGuestsYet')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.pending')}
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.pendingGuests}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.awaitingResponse')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.declined')}
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.declinedGuests}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.unableToAttend')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Check-in Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.ceremonyCheckIns')}
            </CardTitle>
            <ScanLine className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.checkedInCeremony}</div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmedGuests > 0
                ? t('dashboard.percentOfConfirmed', {
                    percent: Math.round((stats.checkedInCeremony / stats.confirmedGuests) * 100),
                  })
                : t('dashboard.noConfirmedGuests')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dashboard.receptionCheckIns')}
            </CardTitle>
            <ScanLine className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.checkedInReception}</div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmedGuests > 0
                ? t('dashboard.percentOfConfirmed', {
                    percent: Math.round((stats.checkedInReception / stats.confirmedGuests) * 100),
                  })
                : t('dashboard.noConfirmedGuests')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">{t('dashboard.rsvpStatus')}</CardTitle>
            <CardDescription>{t('dashboard.guestResponseBreakdown')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.guestsByStatus.filter((s) => s.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    labelLine={false}
                  >
                    {stats.guestsByStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={statusColors[entry.status] || 'var(--chart-5)'}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipContent />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">{t('dashboard.guestsByCategory')}</CardTitle>
            <CardDescription>{t('dashboard.guestsByCategoryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.guestsByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip content={<TooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.guestsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">{t('dashboard.recentActivity')}</CardTitle>
          <CardDescription>{t('dashboard.latestActivity')}</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t('dashboard.noScanActivity')}
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentActivity.map((scan: RecentActivityItem) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        scan.is_duplicate ? 'bg-destructive/10' : 'bg-sage/20'
                      }`}
                    >
                      <ScanLine
                        className={`h-5 w-5 ${
                          scan.is_duplicate ? 'text-destructive' : 'text-sage'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium">
                        {scan.guests?.first_name} {scan.guests?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {scan.event_type === 'ceremony'
                          ? t('scanner.ceremony')
                          : t('scanner.reception')}{' '}
                        {t('dashboard.checkIn')}
                        {scan.is_duplicate && ` (${t('dashboard.duplicate')})`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>
                      {formatDistanceToNow(new Date(scan.scanned_at), {
                        addSuffix: true,
                        locale: dateFnsLocale,
                      })}
                    </p>
                    <p>
                      {t('dashboard.scannedBy', {
                        name: scan.users?.display_name || t('common.unknown'),
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
