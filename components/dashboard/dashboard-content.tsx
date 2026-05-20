'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, Clock, UserX, ScanLine } from 'lucide-react'
import type { DashboardStats } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'

interface DashboardContentProps {
  stats: DashboardStats
}

export function DashboardContent({ stats }: DashboardContentProps) {
  const statusColors: Record<string, string> = {
    Confirmed: 'var(--chart-2)',
    Pending: 'var(--chart-1)',
    Declined: 'var(--chart-5)',
    Tentative: 'var(--chart-3)',
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Guests
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalGuests}</div>
            <p className="text-xs text-muted-foreground">
              Invited to your wedding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmed
            </CardTitle>
            <UserCheck className="h-4 w-4 text-sage" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sage">{stats.confirmedGuests}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalGuests > 0
                ? `${Math.round((stats.confirmedGuests / stats.totalGuests) * 100)}% confirmed`
                : 'No guests yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.pendingGuests}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Declined
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.declinedGuests}</div>
            <p className="text-xs text-muted-foreground">
              Unable to attend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Check-in Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ceremony Check-ins
            </CardTitle>
            <ScanLine className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.checkedInCeremony}</div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmedGuests > 0
                ? `${Math.round((stats.checkedInCeremony / stats.confirmedGuests) * 100)}% of confirmed guests`
                : 'No confirmed guests'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reception Check-ins
            </CardTitle>
            <ScanLine className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.checkedInReception}</div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmedGuests > 0
                ? `${Math.round((stats.checkedInReception / stats.confirmedGuests) * 100)}% of confirmed guests`
                : 'No confirmed guests'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">RSVP Status</CardTitle>
            <CardDescription>Guest response breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.guestsByStatus.filter(s => s.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${status}: ${count}`}
                    labelLine={false}
                  >
                    {stats.guestsByStatus.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={statusColors[entry.status] || 'var(--chart-5)'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Guests by Category</CardTitle>
            <CardDescription>Distribution across guest categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.guestsByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 4, 4, 0]}
                  >
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
          <CardTitle className="font-serif">Recent Activity</CardTitle>
          <CardDescription>Latest check-ins and scans</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No scan activity yet. Start checking in guests!
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentActivity.map((scan: {
                id: string
                scanned_at: string
                event_type: string
                is_duplicate: boolean
                guests: { first_name: string; last_name: string }
                users: { display_name: string }
              }) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      scan.is_duplicate ? 'bg-destructive/10' : 'bg-sage/20'
                    }`}>
                      <ScanLine className={`h-5 w-5 ${
                        scan.is_duplicate ? 'text-destructive' : 'text-sage'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {scan.guests?.first_name} {scan.guests?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {scan.event_type === 'ceremony' ? 'Ceremony' : 'Reception'} check-in
                        {scan.is_duplicate && ' (Duplicate)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatDistanceToNow(new Date(scan.scanned_at), { addSuffix: true })}</p>
                    <p>by {scan.users?.display_name || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
