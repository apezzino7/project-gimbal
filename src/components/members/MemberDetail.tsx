import { useState, useEffect } from 'react';
import type { MemberWithDetails, MemberTransaction, MemberVisit, VisitStats, LtvBreakdown } from '@/types/member';
import {
  getMemberWithDetails,
  getMemberTransactions,
  getMemberVisits,
  getVisitStats,
  getLtvBreakdown,
} from '@/services/members/memberService';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface MemberDetailProps {
  /** Member ID to display */
  memberId: string;
  /** Called when edit button is clicked */
  onEdit?: () => void;
  /** Called when back button is clicked */
  onBack?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function UserIcon() {
  return (
    <svg className="w-20 h-20 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'success' | 'warning' | 'error';
}

function StatCard({ label, value, subValue, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'text-[#003559]',
    success: 'text-[#2e7d32]',
    warning: 'text-[#ed6c02]',
    error: 'text-[#d32f2f]',
  };

  return (
    <div className="text-center p-4 bg-[#f5f5f5] rounded-lg">
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between py-2 border-b border-[#e0e0e0] last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-[#003559]">{value || '—'}</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Member detail view with full profile, transactions, and visits.
 *
 * @example
 * <MemberDetail
 *   memberId={selectedMemberId}
 *   onEdit={() => openEditModal()}
 *   onBack={() => navigate('/members')}
 * />
 */
export function MemberDetail({
  memberId,
  onEdit,
  onBack,
  className = '',
}: MemberDetailProps) {
  const [member, setMember] = useState<MemberWithDetails | null>(null);
  const [transactions, setTransactions] = useState<MemberTransaction[]>([]);
  const [visits, setVisits] = useState<MemberVisit[]>([]);
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [ltvBreakdown, setLtvBreakdown] = useState<LtvBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'visits'>('overview');

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [memberData, transData, visitData, statsData, ltvData] = await Promise.all([
          getMemberWithDetails(memberId),
          getMemberTransactions(memberId),
          getMemberVisits(memberId),
          getVisitStats(memberId),
          getLtvBreakdown(memberId),
        ]);

        setMember(memberData);
        setTransactions(transData);
        setVisits(visitData);
        setVisitStats(statsData);
        setLtvBreakdown(ltvData);
      } catch (err) {
        console.error('Failed to fetch member:', err);
        setError('Failed to load member details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [memberId]);

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <div className="animate-pulse flex items-center gap-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !member) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <p className="text-[#d32f2f] mb-4">{error || 'Member not found'}</p>
          {onBack && (
            <Button onClick={onBack} variant="ghost" leftIcon={<ArrowLeftIcon />}>
              Go Back
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Unnamed Member';
  const fullAddress = [
    member.addressLine1,
    member.addressLine2,
    member.city && member.state ? `${member.city}, ${member.state}` : member.city || member.state,
    member.postalCode,
  ].filter(Boolean).join(', ');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeftIcon />}>
                Back
              </Button>
            )}
            <div className="w-20 h-20 bg-[#f5f5f5] rounded-full flex items-center justify-center">
              <UserIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#003559]">{fullName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={member.membershipStatus === 'active' ? 'success' : 'warning'}
                >
                  {member.membershipStatus}
                </Badge>
                {member.membershipLevel && (
                  <Badge variant="secondary">{member.membershipLevel.name}</Badge>
                )}
              </div>
            </div>
          </div>
          {onEdit && (
            <Button onClick={onEdit} variant="outline" leftIcon={<PencilIcon />}>
              Edit
            </Button>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Lifetime Value"
          value={`$${member.lifetimeValue.toLocaleString()}`}
          color="success"
        />
        <StatCard
          label="Total Visits"
          value={member.totalVisits}
          subValue={visitStats ? `${visitStats.avgVisitsPerMonth.toFixed(1)}/month avg` : undefined}
        />
        <StatCard
          label="Avg Transaction"
          value={`$${member.averageTransaction.toFixed(0)}`}
        />
        <StatCard
          label="Days Since Visit"
          value={
            member.lastVisitAt
              ? Math.floor((Date.now() - new Date(member.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24))
              : 'N/A'
          }
          color={
            member.lastVisitAt &&
            (Date.now() - new Date(member.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24) > 30
              ? 'warning'
              : 'default'
          }
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-[#e0e0e0]">
        <nav className="flex gap-8" role="tablist">
          {(['overview', 'transactions', 'visits'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'py-3 px-1 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-[#0353a4] text-[#0353a4]'
                  : 'border-transparent text-gray-500 hover:text-[#003559] hover:border-[#b9d6f2]',
              ].join(' ')}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'transactions' && ` (${transactions.length})`}
              {tab === 'visits' && ` (${visits.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>Contact Information</CardHeader>
            <div className="p-4 space-y-1">
              <InfoRow label="Email" value={member.email} />
              <InfoRow label="Phone" value={member.phone} />
              <InfoRow label="Address" value={fullAddress} />
              <InfoRow
                label="Date of Birth"
                value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : null}
              />
            </div>
          </Card>

          {/* Membership Info */}
          <Card>
            <CardHeader>Membership</CardHeader>
            <div className="p-4 space-y-1">
              <InfoRow label="Site" value={member.site?.name} />
              <InfoRow label="Level" value={member.membershipLevel?.name} />
              <InfoRow label="Status" value={<Badge variant={member.membershipStatus === 'active' ? 'success' : 'warning'}>{member.membershipStatus}</Badge>} />
              <InfoRow
                label="Start Date"
                value={member.membershipStartDate ? new Date(member.membershipStartDate).toLocaleDateString() : null}
              />
              <InfoRow
                label="Expiry Date"
                value={member.membershipExpiryDate ? new Date(member.membershipExpiryDate).toLocaleDateString() : null}
              />
            </div>
          </Card>

          {/* Acquisition */}
          <Card>
            <CardHeader>Acquisition</CardHeader>
            <div className="p-4 space-y-1">
              <InfoRow label="Source" value={member.acquisitionSource} />
              <InfoRow label="Promo Code" value={member.acquisitionPromoCode} />
              <InfoRow label="CAC" value={member.acquisitionCost ? `$${member.acquisitionCost.toFixed(2)}` : null} />
              <InfoRow
                label="Acquisition Date"
                value={member.acquisitionDate ? new Date(member.acquisitionDate).toLocaleDateString() : null}
              />
            </div>
          </Card>

          {/* LTV Breakdown */}
          {ltvBreakdown.length > 0 && (
            <Card>
              <CardHeader>LTV Breakdown</CardHeader>
              <div className="p-4 space-y-1">
                {ltvBreakdown.map((item) => (
                  <InfoRow
                    key={item.transactionType}
                    label={item.transactionType.replace('_', ' ')}
                    value={`$${item.totalAmount.toLocaleString()} (${item.transactionCount} txns)`}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Tags */}
          {member.tags.length > 0 && (
            <Card>
              <CardHeader>Tags</CardHeader>
              <div className="p-4 flex flex-wrap gap-2">
                {member.tags.map((tag) => (
                  <Badge key={tag} variant="default">{tag}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Consent */}
          {member.consent && (
            <Card>
              <CardHeader>Consent</CardHeader>
              <div className="p-4 space-y-1">
                <InfoRow
                  label="SMS"
                  value={
                    <Badge variant={member.consent.smsConsent ? 'success' : 'default'}>
                      {member.consent.smsConsent ? 'Opted In' : 'Not Opted In'}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Email"
                  value={
                    <Badge variant={member.consent.emailConsent ? 'success' : 'default'}>
                      {member.consent.emailConsent ? 'Subscribed' : 'Unsubscribed'}
                    </Badge>
                  }
                />
                <InfoRow label="Preferred Channel" value={member.consent.preferredChannel} />
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <Card padding="none">
          <CardHeader>Transaction History</CardHeader>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No transactions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#003559] uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-[#f5f5f5]">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(txn.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={txn.transactionType === 'refund' ? 'danger' : 'default'} size="sm">
                          {txn.transactionType.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{txn.description || '—'}</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${txn.transactionType === 'refund' ? 'text-[#d32f2f]' : 'text-[#2e7d32]'}`}>
                        {txn.transactionType === 'refund' ? '-' : ''}${Math.abs(txn.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'visits' && (
        <Card padding="none">
          <CardHeader>Visit History</CardHeader>
          {visits.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No visits recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-[#f5f5f5]">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(visit.visitDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {visit.checkInTime
                          ? new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default" size="sm">{visit.visitType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{visit.serviceName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[200px]">{visit.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default MemberDetail;
