/**
 * Analytics Service
 *
 * Provides dashboard metrics and analytics data by querying
 * the CRM tables (members, transactions, visits).
 */

import { supabase } from '../../lib/supabase';

// =============================================================================
// Types
// =============================================================================

export interface DashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  avgLtv: number;
  totalVisits: number;
  visitsThisMonth: number;
  avgVisitsPerMember: number;
}

export interface MemberStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  transactions: number;
}

export interface VisitsByDay {
  date: string;
  visits: number;
}

export interface MembershipLevelBreakdown {
  levelId: string | null;
  levelName: string;
  count: number;
  totalLtv: number;
  avgLtv: number;
}

export interface TopMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  lifetimeValue: number;
  totalVisits: number;
  siteName: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// =============================================================================
// Service
// =============================================================================

export const analyticsService = {
  /**
   * Get main dashboard metrics
   */
  async getDashboardMetrics(siteId?: string): Promise<DashboardMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthISO = startOfMonth.toISOString();

    // Build base query for members
    let membersQuery = supabase
      .from('members')
      .select('id, membership_status, lifetime_value, total_visits, created_at', { count: 'exact' })
      .eq('is_active', true);

    if (siteId) {
      membersQuery = membersQuery.eq('site_id', siteId);
    }

    const { data: members, count: totalMembers } = await membersQuery;

    // Calculate metrics from members data
    const activeMembers = members?.filter(m => m.membership_status === 'active').length ?? 0;
    const newMembersThisMonth = members?.filter(m =>
      new Date(m.created_at) >= startOfMonth
    ).length ?? 0;

    const totalLtv = members?.reduce((sum, m) => sum + (m.lifetime_value || 0), 0) ?? 0;
    const avgLtv = totalMembers && totalMembers > 0 ? totalLtv / totalMembers : 0;
    const totalVisits = members?.reduce((sum, m) => sum + (m.total_visits || 0), 0) ?? 0;
    const avgVisitsPerMember = totalMembers && totalMembers > 0 ? totalVisits / totalMembers : 0;

    // Get transactions for revenue
    let transactionsQuery = supabase
      .from('member_transactions')
      .select('amount, transaction_type, transaction_date');

    if (siteId) {
      transactionsQuery = transactionsQuery.eq('site_id', siteId);
    }

    const { data: transactions } = await transactionsQuery;

    // Calculate revenue
    const totalRevenue = transactions?.reduce((sum, t) => {
      if (t.transaction_type === 'refund') {
        return sum - Math.abs(t.amount);
      }
      return sum + (t.amount || 0);
    }, 0) ?? 0;

    const revenueThisMonth = transactions?.filter(t =>
      new Date(t.transaction_date) >= startOfMonth
    ).reduce((sum, t) => {
      if (t.transaction_type === 'refund') {
        return sum - Math.abs(t.amount);
      }
      return sum + (t.amount || 0);
    }, 0) ?? 0;

    // Get visits this month
    let visitsQuery = supabase
      .from('member_visits')
      .select('id', { count: 'exact' })
      .gte('visit_date', startOfMonthISO.split('T')[0]);

    if (siteId) {
      visitsQuery = visitsQuery.eq('site_id', siteId);
    }

    const { count: visitsThisMonth } = await visitsQuery;

    return {
      totalMembers: totalMembers ?? 0,
      activeMembers,
      newMembersThisMonth,
      totalRevenue,
      revenueThisMonth,
      avgLtv,
      totalVisits,
      visitsThisMonth: visitsThisMonth ?? 0,
      avgVisitsPerMember,
    };
  },

  /**
   * Get member status breakdown
   */
  async getMemberStatusBreakdown(siteId?: string): Promise<MemberStatusBreakdown[]> {
    let query = supabase
      .from('members')
      .select('membership_status')
      .eq('is_active', true);

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data: members } = await query;

    if (!members || members.length === 0) {
      return [];
    }

    // Count by status
    const statusCounts: Record<string, number> = {};
    members.forEach(m => {
      const status = m.membership_status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const total = members.length;
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / total) * 100,
    }));
  },

  /**
   * Get revenue by month for the last N months
   */
  async getRevenueByMonth(
    months: number = 6,
    siteId?: string
  ): Promise<RevenueByMonth[]> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    let query = supabase
      .from('member_transactions')
      .select('amount, transaction_type, transaction_date')
      .gte('transaction_date', startDate.toISOString());

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data: transactions } = await query;

    if (!transactions) {
      return [];
    }

    // Group by month
    const monthlyData: Record<string, { revenue: number; transactions: number }> = {};

    transactions.forEach(t => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, transactions: 0 };
      }

      if (t.transaction_type === 'refund') {
        monthlyData[monthKey].revenue -= Math.abs(t.amount);
      } else {
        monthlyData[monthKey].revenue += t.amount || 0;
      }
      monthlyData[monthKey].transactions += 1;
    });

    // Convert to array and sort
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        transactions: data.transactions,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  },

  /**
   * Get visits by day for a date range
   */
  async getVisitsByDay(
    dateRange: DateRange,
    siteId?: string
  ): Promise<VisitsByDay[]> {
    let query = supabase
      .from('member_visits')
      .select('visit_date')
      .gte('visit_date', dateRange.start.toISOString().split('T')[0])
      .lte('visit_date', dateRange.end.toISOString().split('T')[0]);

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data: visits } = await query;

    if (!visits) {
      return [];
    }

    // Group by date
    const dailyData: Record<string, number> = {};

    visits.forEach(v => {
      const dateKey = v.visit_date;
      dailyData[dateKey] = (dailyData[dateKey] || 0) + 1;
    });

    // Fill in missing days
    const result: VisitsByDay[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const dateKey = current.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        visits: dailyData[dateKey] || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  },

  /**
   * Get membership level breakdown with LTV
   */
  async getMembershipLevelBreakdown(siteId?: string): Promise<MembershipLevelBreakdown[]> {
    let membersQuery = supabase
      .from('members')
      .select(`
        membership_level_id,
        lifetime_value,
        membership_levels (
          name
        )
      `)
      .eq('is_active', true);

    if (siteId) {
      membersQuery = membersQuery.eq('site_id', siteId);
    }

    const { data: members } = await membersQuery;

    if (!members) {
      return [];
    }

    // Group by level
    const levelData: Record<string, {
      levelName: string;
      count: number;
      totalLtv: number;
    }> = {};

    members.forEach((m: any) => {
      const levelId = m.membership_level_id || 'none';
      const levelName = m.membership_levels?.name || 'No Level';

      if (!levelData[levelId]) {
        levelData[levelId] = { levelName, count: 0, totalLtv: 0 };
      }

      levelData[levelId].count += 1;
      levelData[levelId].totalLtv += m.lifetime_value || 0;
    });

    return Object.entries(levelData).map(([levelId, data]) => ({
      levelId: levelId === 'none' ? null : levelId,
      levelName: data.levelName,
      count: data.count,
      totalLtv: data.totalLtv,
      avgLtv: data.count > 0 ? data.totalLtv / data.count : 0,
    }));
  },

  /**
   * Get top members by LTV
   */
  async getTopMembersByLtv(
    limit: number = 10,
    siteId?: string
  ): Promise<TopMember[]> {
    let query = supabase
      .from('members')
      .select(`
        id,
        first_name,
        last_name,
        email,
        lifetime_value,
        total_visits,
        sites (
          name
        )
      `)
      .eq('is_active', true)
      .order('lifetime_value', { ascending: false })
      .limit(limit);

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data: members } = await query;

    if (!members) {
      return [];
    }

    return members.map((m: any) => ({
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      email: m.email,
      lifetimeValue: m.lifetime_value || 0,
      totalVisits: m.total_visits || 0,
      siteName: m.sites?.name || 'Unknown',
    }));
  },

  /**
   * Get engagement trends (visits over time)
   */
  async getEngagementTrends(
    dateRange: DateRange,
    siteId?: string
  ): Promise<{ date: string; visits: number; transactions: number }[]> {
    const startDate = dateRange.start.toISOString().split('T')[0];
    const endDate = dateRange.end.toISOString().split('T')[0];

    // Get visits
    let visitsQuery = supabase
      .from('member_visits')
      .select('visit_date')
      .gte('visit_date', startDate)
      .lte('visit_date', endDate);

    if (siteId) {
      visitsQuery = visitsQuery.eq('site_id', siteId);
    }

    // Get transactions
    let transactionsQuery = supabase
      .from('member_transactions')
      .select('transaction_date')
      .gte('transaction_date', `${startDate}T00:00:00`)
      .lte('transaction_date', `${endDate}T23:59:59`);

    if (siteId) {
      transactionsQuery = transactionsQuery.eq('site_id', siteId);
    }

    const [visitsResult, transactionsResult] = await Promise.all([
      visitsQuery,
      transactionsQuery,
    ]);

    // Count by date
    const dailyData: Record<string, { visits: number; transactions: number }> = {};

    visitsResult.data?.forEach(v => {
      const date = v.visit_date;
      if (!dailyData[date]) {
        dailyData[date] = { visits: 0, transactions: 0 };
      }
      dailyData[date].visits += 1;
    });

    transactionsResult.data?.forEach(t => {
      const date = t.transaction_date.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { visits: 0, transactions: 0 };
      }
      dailyData[date].transactions += 1;
    });

    // Fill in missing days and sort
    const result: { date: string; visits: number; transactions: number }[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const dateKey = current.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        visits: dailyData[dateKey]?.visits || 0,
        transactions: dailyData[dateKey]?.transactions || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  },
};
