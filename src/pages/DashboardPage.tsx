import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../stores/authStore';
import { useToast } from '../hooks/useToast';
import { auditLogger, AuditEventType } from '../utils/auditLog';
import { clearRememberMe } from '../utils/rememberMe';

// Layout
import { AppLayout } from '../components/layout';
import { useNavigation } from '../hooks/useNavigation';

// Dashboard Components
import {
  MetricCard,
  LineChart,
  BarChart,
  DonutChart,
  DataTable,
  DateRangePicker,
} from '../components/dashboard';
import type { DateRange, DataTableColumn } from '../components/dashboard';

// Analytics Hooks
import {
  useDashboardMetrics,
  useEngagementTrends,
  useRevenueByMonth,
  useMembershipLevelBreakdown,
  useTopMembersByLtv,
} from '../services/analytics';

// Skeleton component
import { Skeleton } from '../components/Skeleton';

// =============================================================================
// Constants
// =============================================================================

const JUST_LOGGED_IN_KEY = 'gimbal-just-logged-in';

// =============================================================================
// Types
// =============================================================================

interface TopMemberRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  lifetimeValue: number;
  totalVisits: number;
  siteName: string;
}

// =============================================================================
// Helper Components
// =============================================================================

function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-[#e0e0e0] p-4">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white rounded-lg border border-[#e0e0e0] p-4">
      <Skeleton className="h-5 w-40 mb-4" />
      <Skeleton width="100%" height={height} />
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export const DashboardPage = memo(function DashboardPage() {
  const { user } = useAuth();
  const { navItems } = useNavigation();
  const navigate = useNavigate();
  const toast = useToast();
  const hasShownWelcome = useRef(false);

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  });

  // Fetch dashboard data using React Query
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: engagementTrends, isLoading: engagementLoading } = useEngagementTrends(dateRange);
  const { data: revenueByMonth, isLoading: revenueLoading } = useRevenueByMonth(6);
  const { data: membershipBreakdown, isLoading: membershipLoading } = useMembershipLevelBreakdown();
  const { data: topMembers, isLoading: topMembersLoading } = useTopMembersByLtv(10);

  // Show welcome toast on fresh login
  useEffect(() => {
    if (!hasShownWelcome.current && sessionStorage.getItem(JUST_LOGGED_IN_KEY)) {
      sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
      hasShownWelcome.current = true;
      toast.success('Welcome back!');
    }
  }, [toast]);

  // Transform engagement data for line chart
  const engagementChartData = useMemo(() => {
    if (!engagementTrends) return [];
    return engagementTrends.map(item => ({
      name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visits: item.visits,
      transactions: item.transactions,
    }));
  }, [engagementTrends]);

  const engagementSeries = [
    { dataKey: 'visits', name: 'Visits', color: '#0353a4' },
    { dataKey: 'transactions', name: 'Transactions', color: '#2e7d32' },
  ];

  // Transform revenue data for bar chart
  const revenueChartData = useMemo(() => {
    if (!revenueByMonth) return [];
    return revenueByMonth.map(item => {
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return {
        name: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue: Math.round(item.revenue),
        transactions: item.transactions,
      };
    });
  }, [revenueByMonth]);

  const revenueSeries = [
    { dataKey: 'revenue', name: 'Revenue', color: '#0353a4' },
    { dataKey: 'transactions', name: 'Transactions', color: '#006daa' },
  ];

  // Transform membership breakdown for donut chart
  const membershipChartData = useMemo(() => {
    if (!membershipBreakdown) return [];
    return membershipBreakdown.map(item => ({
      name: item.levelName,
      value: item.count,
    }));
  }, [membershipBreakdown]);

  // Top members table columns
  const memberColumns: DataTableColumn<TopMemberRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Member',
      accessor: (row) => (
        <div>
          <div className="font-medium text-[#003559]">
            {row.firstName || row.lastName
              ? `${row.firstName || ''} ${row.lastName || ''}`.trim()
              : 'Unknown'}
          </div>
          <div className="text-xs text-gray-500">{row.email || 'No email'}</div>
        </div>
      ),
      sortable: true,
      sortAccessor: (row) => `${row.firstName || ''} ${row.lastName || ''}`,
    },
    {
      key: 'site',
      header: 'Site',
      accessor: (row) => row.siteName,
      sortable: true,
      sortAccessor: (row) => row.siteName,
    },
    {
      key: 'ltv',
      header: 'Lifetime Value',
      accessor: (row) => `$${row.lifetimeValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sortable: true,
      sortAccessor: (row) => row.lifetimeValue,
      align: 'right',
    },
    {
      key: 'visits',
      header: 'Visits',
      accessor: (row) => row.totalVisits.toLocaleString(),
      sortable: true,
      sortAccessor: (row) => row.totalVisits,
      align: 'right',
    },
  ], []);

  async function handleLogout() {
    toast.info('Logging out...');
    auditLogger.log(AuditEventType.LOGOUT, user?.email);
    clearRememberMe();
    await supabase.auth.signOut();
    navigate('/login');
  }

  function handleUserAction(action: 'profile' | 'settings' | 'logout') {
    if (action === 'logout') {
      handleLogout();
    } else if (action === 'settings') {
      navigate('/admin/settings');
    }
  }

  // Calculate trends (mock for now - would compare to previous period)
  const memberTrend = metrics?.newMembersThisMonth ?? 0;
  const revenueTrend = metrics?.revenueThisMonth && metrics.totalRevenue
    ? ((metrics.revenueThisMonth / (metrics.totalRevenue - metrics.revenueThisMonth)) * 100)
    : 0;

  return (
    <AppLayout
      navItems={navItems}
      pageTitle="Dashboard"
      breadcrumbs={[{ label: 'Dashboard' }]}
      user={user ? { name: user.email?.split('@')[0] || 'User', email: user.email || '' } : null}
      onUserAction={handleUserAction}
      logo={
        <span className="text-lg font-bold text-[#003559]">Gimbal</span>
      }
      logoCollapsed={
        <span className="text-lg font-bold text-[#003559]">G</span>
      }
    >
      {/* Header with Date Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003559]">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome back, <span className="font-medium">{user?.email?.split('@')[0]}</span>
          </p>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          presets={['7d', '30d', '90d', 'mtd', 'ytd']}
        />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metricsLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              label="Total Members"
              value={(metrics?.totalMembers ?? 0).toLocaleString()}
              trend={memberTrend}
              icon={
                <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              }
            />
            <MetricCard
              label="Active Members"
              value={(metrics?.activeMembers ?? 0).toLocaleString()}
              trend={metrics?.totalMembers ? ((metrics.activeMembers / metrics.totalMembers) * 100) : 0}
              trendDirection="neutral"
              icon={
                <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              }
            />
            <MetricCard
              label="Total Revenue"
              value={`$${(metrics?.totalRevenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              trend={revenueTrend > 0 ? Math.round(revenueTrend) : 0}
              icon={
                <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              }
            />
            <MetricCard
              label="Average LTV"
              value={`$${(metrics?.avgLtv ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              trend={0}
              trendDirection="neutral"
              icon={
                <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Line Chart - Engagement Over Time */}
        <div className="lg:col-span-2">
          {engagementLoading ? (
            <ChartSkeleton height={300} />
          ) : engagementChartData.length > 0 ? (
            <LineChart
              title="Engagement Over Time"
              data={engagementChartData}
              series={engagementSeries}
              height={300}
            />
          ) : (
            <div className="bg-white rounded-lg border border-[#e0e0e0] p-4 h-[300px] flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                <p>No engagement data for this period</p>
              </div>
            </div>
          )}
        </div>

        {/* Donut Chart - Membership Distribution */}
        {membershipLoading ? (
          <ChartSkeleton height={300} />
        ) : membershipChartData.length > 0 ? (
          <DonutChart
            title="Membership Levels"
            data={membershipChartData}
            height={300}
            centerLabel={(metrics?.totalMembers ?? 0).toLocaleString()}
            centerSublabel="Total Members"
          />
        ) : (
          <div className="bg-white rounded-lg border border-[#e0e0e0] p-4 h-[300px] flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <p>No members yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart - Revenue by Month */}
      <div className="mb-6">
        {revenueLoading ? (
          <ChartSkeleton height={300} />
        ) : revenueChartData.length > 0 ? (
          <BarChart
            title="Revenue by Month"
            data={revenueChartData}
            series={revenueSeries}
            height={300}
          />
        ) : (
          <div className="bg-white rounded-lg border border-[#e0e0e0] p-4 h-[300px] flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <p>No revenue data yet</p>
            </div>
          </div>
        )}
      </div>

      {/* Data Table - Top Members */}
      {topMembersLoading ? (
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-4">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : topMembers && topMembers.length > 0 ? (
        <DataTable<TopMemberRow>
          title="Top Members by Lifetime Value"
          data={topMembers}
          columns={memberColumns}
          rowKey={(row) => row.id}
          pageSize={5}
          searchable
          searchFilter={(row, query) =>
            `${row.firstName || ''} ${row.lastName || ''} ${row.email || ''} ${row.siteName}`
              .toLowerCase()
              .includes(query)
          }
          emptyMessage="No members found"
        />
      ) : (
        <div className="bg-white rounded-lg border border-[#e0e0e0] p-8 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No members yet</h3>
          <p className="text-gray-500 mb-4">Import members to see analytics and insights.</p>
          <button
            onClick={() => navigate('/data-sources')}
            className="inline-flex items-center px-4 py-2 bg-[#0353a4] text-white rounded-lg hover:bg-[#003559] transition-colors"
          >
            Import Members
          </button>
        </div>
      )}
    </AppLayout>
  );
});
