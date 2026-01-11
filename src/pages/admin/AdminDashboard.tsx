import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, DollarSign, Search, Eye, AlertCircle, Send, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Application, ApplicationStatus } from '../../types/database.ts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import styles from './AdminDashboard.module.css';

interface StatusCounts {
  total: number;
  draft: number;
  submitted: number;
  payment_received: number;
  in_review: number;
  decision_released: number;
  pending_payment: number;
  accepted: number;
  rejected: number;
}

interface ApplicationWithProfile extends Application {
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    total: 0,
    draft: 0,
    submitted: 0,
    payment_received: 0,
    in_review: 0,
    decision_released: 0,
    pending_payment: 0,
    accepted: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all' | 'pending_payment'>('all');
  const [releasingDecision, setReleasingDecision] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [releasingAll, setReleasingAll] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          profiles!applications_user_id_fkey (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const apps = (data as unknown as ApplicationWithProfile[]) || [];
      setApplications(apps);

      // Calculate status counts
      const counts: StatusCounts = {
        total: apps.length,
        draft: 0,
        submitted: 0,
        payment_received: 0,
        in_review: 0,
        decision_released: 0,
        pending_payment: 0,
        accepted: 0,
        rejected: 0,
      };

      apps.forEach(app => {
        const status = app.current_status as ApplicationStatus;
        if (status in counts) {
          counts[status as keyof Omit<StatusCounts, 'total' | 'pending_payment' | 'accepted' | 'rejected'>]++;
        }
        // Count apps awaiting payment verification
        if (status === 'submitted' && !app.payment_verified) {
          counts.pending_payment++;
        }
        // Count accepted and rejected decisions
        if (app.decision === 'accepted') {
          counts.accepted++;
        } else if (app.decision === 'rejected') {
          counts.rejected++;
        }
      });

      setStatusCounts(counts);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function releaseDecision(applicationId: string) {
    if (!user) return;
    
    setReleasingDecision(applicationId);
    
    try {
      const { error } = await supabase
        .from('applications')
        .update({ current_status: 'decision_released' })
        .eq('id', applicationId);

      if (error) throw error;

      // Refresh applications list
      await fetchApplications();
    } catch (err) {
      console.error('Failed to release decision:', err);
      alert('Failed to release decision. Please try again.');
    } finally {
      setReleasingDecision(null);
    }
  }

  async function handleStatusChange(applicationId: string, newStatus: ApplicationStatus) {
    if (!user) return;
    
    setUpdatingStatus(applicationId);
    
    try {
      const { error } = await supabase
        .from('applications')
        .update({ current_status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      // Refresh applications list
      await fetchApplications();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function releaseAllDecisions() {
    if (!user) return;

    // Find all applications with decisions that haven't been released yet
    const applicationsWithDecisions = applications.filter(
      app => app.current_status === 'in_review' && app.decision
    );

    if (applicationsWithDecisions.length === 0) {
      alert('No decisions ready to release.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to release ${applicationsWithDecisions.length} decision(s)? This will notify all applicants and cannot be undone.`
    );

    if (!confirmed) return;

    setReleasingAll(true);

    try {
      // Update all applications with decisions to decision_released status
      const { error } = await supabase
        .from('applications')
        .update({ 
          current_status: 'decision_released',
          decision_released_at: new Date().toISOString()
        })
        .eq('current_status', 'in_review')
        .not('decision', 'is', null);

      if (error) throw error;

      alert(`Successfully released ${applicationsWithDecisions.length} decision(s).`);
      await fetchApplications();
    } catch (err) {
      console.error('Failed to release all decisions:', err);
      alert('Failed to release decisions. Please try again.');
    } finally {
      setReleasingAll(false);
    }
  }

  const filteredApplications = statusFilter === 'all'
    ? applications
    : statusFilter === 'pending_payment'
      ? applications.filter(app => app.current_status === 'submitted' && !app.payment_verified)
      : applications.filter(app => app.current_status === statusFilter);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading applications...</p>
      </div>
    );
  }

  const decisionsReadyToRelease = applications.filter(
    app => app.current_status === 'in_review' && app.decision
  ).length;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1>Admin Dashboard</h1>
          <p className={styles.subtitle}>Application Management</p>
        </div>
        {decisionsReadyToRelease > 0 && (
          <Button
            variant="primary"
            onClick={releaseAllDecisions}
            loading={releasingAll}
          >
            <Send size={18} />
            Release All Decisions ({decisionsReadyToRelease})
          </Button>
        )}
      </header>

      <div className={styles.metrics}>
        <MetricCard
          icon={<Users size={24} />}
          label="Total Applications"
          value={statusCounts.total}
          color="primary"
        />
        <MetricCard
          icon={<AlertCircle size={24} />}
          label="Awaiting Payment"
          value={statusCounts.pending_payment}
          color="orange"
          highlight={statusCounts.pending_payment > 0}
        />
        <MetricCard
          icon={<Search size={24} />}
          label="In Review"
          value={statusCounts.in_review}
          color="blue"
        />
        <MetricCard
          icon={<FileText size={24} />}
          label="Decisions Released"
          value={statusCounts.decision_released}
          color="purple"
        />
        <MetricCard
          icon={<CheckCircle size={24} />}
          label="Accepted"
          value={statusCounts.accepted}
          color="green"
        />
        <MetricCard
          icon={<XCircle size={24} />}
          label="Rejected"
          value={statusCounts.rejected}
          color="red"
        />
      </div>

      <Card className={styles.tableCard}>
        <CardHeader>
          <div className={styles.tableHeader}>
            <CardTitle>Applications</CardTitle>
            <div className={styles.filters}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all' | 'pending_payment')}
                className={styles.filterSelect}
              >
                <option value="all">All Statuses</option>
                <option value="pending_payment">⚠️ Awaiting Payment</option>
                <option value="received">Received</option>
                <option value="payment_received">Payment Received</option>
                <option value="in_review">In Review</option>
                <option value="decision_released">Decision Released</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <p className={styles.noData}>No applications found.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Decision</th>
                    <th>Payment</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className={app.current_status === 'received' && !app.payment_verified ? styles.needsAttention : ''}>
                      <td className={styles.applicantName}>
                        {app.first_name && app.last_name 
                          ? `${app.first_name} ${app.last_name}`
                          : app.profiles?.full_name || 'Unknown'}
                      </td>
                      <td>{app.profiles?.email || '—'}</td>
                      <td>
                        <select
                          value={app.current_status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                          disabled={updatingStatus === app.id}
                          className={styles.statusSelect}
                        >
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="payment_received">Payment Received</option>
                          <option value="in_review">In Review</option>
                          <option value="decision_released">Decision Released</option>
                        </select>
                      </td>
                      <td>
                        {app.decision ? (
                          <span style={{ 
                            fontWeight: '500',
                            color: app.decision === 'accepted' ? '#10b981' : 
                                   app.decision === 'rejected' ? '#ef4444' : 
                                   app.decision === 'waitlisted' ? '#f59e0b' : '#6b7280'
                          }}>
                            {app.decision.charAt(0).toUpperCase() + app.decision.slice(1)}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                      <td>
                        {app.payment_verified ? (
                          <span className={styles.paymentVerified}>
                            <DollarSign size={14} />
                            Verified
                          </span>
                        ) : (
                          <span className={styles.paymentPending}>Pending</span>
                        )}
                      </td>
                      <td>{new Date(app.created_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <Link to={`/admin/application/${app.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye size={16} />
                              View
                            </Button>
                          </Link>
                          {app.decision && app.current_status !== 'decision_released' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => releaseDecision(app.id)}
                              disabled={releasingDecision === app.id}
                            >
                              <Send size={16} />
                              {releasingDecision === app.id ? 'Releasing...' : 'Release Decision'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'primary' | 'blue' | 'orange' | 'purple' | 'green' | 'red';
  highlight?: boolean;
}

function MetricCard({ icon, label, value, color, highlight }: MetricCardProps) {
  return (
    <div className={`${styles.metricCard} ${styles[color]} ${highlight ? styles.highlight : ''}`}>
      <div className={styles.metricIcon}>{icon}</div>
      <div className={styles.metricContent}>
        <span className={styles.metricValue}>{value}</span>
        <span className={styles.metricLabel}>{label}</span>
      </div>
    </div>
  );
}
