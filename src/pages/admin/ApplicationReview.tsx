import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Clock, User, AlertCircle, DollarSign, CheckCircle, XCircle, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Application, ApplicationDocument, ApplicationStatusHistory, ApplicationStatus } from '../../types/database.ts';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import { PDFViewer } from '../../components/ui/PDFViewer.tsx';
import styles from './ApplicationReview.module.css';

interface ApplicationWithProfile extends Application {
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export function ApplicationReview() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [application, setApplication] = useState<ApplicationWithProfile | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [statusHistory, setStatusHistory] = useState<ApplicationStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewingPDF, setViewingPDF] = useState<{ url: string; fileName: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchApplication();
    }
  }, [id]);

  async function fetchApplication() {
    if (!id) return;
    try {
      const { data: app, error: appError } = await supabase
        .from('applications')
        .select(`
          *,
          profiles!applications_user_id_fkey (
            email,
            full_name
          )
        `)
        .eq('id', id)
        .single();

      if (appError) throw appError;

      setApplication(app as ApplicationWithProfile);

      const { data: docs } = await supabase
        .from('application_documents')
        .select('*')
        .eq('application_id', id!);

      setDocuments((docs as ApplicationDocument[]) || []);

      const { data: history } = await supabase
        .from('application_status_history')
        .select('*')
        .eq('application_id', id!)
        .order('changed_at', { ascending: false });

      setStatusHistory((history as ApplicationStatusHistory[]) || []);
    } catch (err) {
      setError('Failed to load application');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPayment() {
    if (!id || !user) return;

    const confirmed = window.confirm(
      'Are you sure you want to verify the payment for this application? This will advance the application to "Payment Received" status.'
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          payment_verified: true,
          payment_verified_at: new Date().toISOString(),
          payment_verified_by: user.id,
          current_status: 'payment_received' as ApplicationStatus
        })
        .eq('id', id);

      if (error) throw error;
      await fetchApplication();
    } catch (err) {
      setError('Failed to verify payment');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: ApplicationStatus) {
    if (!id) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('applications')
        .update({ current_status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchApplication();
    } catch (err) {
      setError('Failed to update status');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdvanceToReview() {
    if (!id) return;

    const confirmed = window.confirm(
      'Move this application to "In Review" status?'
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('applications')
        .update({ current_status: 'in_review' as ApplicationStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchApplication();
    } catch (err) {
      setError('Failed to update status');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDecision(decision: 'accepted' | 'rejected') {
    if (!id) return;

    const decisionText = decision === 'accepted' ? 'ACCEPT' : 'REJECT';
    const confirmed = window.confirm(
      `Are you sure you want to ${decisionText} this applicant? The decision will be saved but not released to the applicant yet.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          decision: decision
        })
        .eq('id', id);

      if (error) throw error;
      await fetchApplication();
    } catch (err) {
      setError('Failed to save decision');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleReleaseThisDecision() {
    if (!id || !application?.decision) return;

    const decisionText = application.decision === 'accepted' ? 'ACCEPTANCE' : 'REJECTION';
    const confirmed = window.confirm(
      `Release this ${decisionText} decision to the applicant? This will notify them and cannot be undone.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          current_status: 'decision_released' as ApplicationStatus,
          decision_released_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await fetchApplication();
    } catch (err) {
      setError('Failed to release decision');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleViewDocument(doc: ApplicationDocument) {
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('No signed URL returned');

      setViewingPDF({ url: data.signedUrl, fileName: doc.file_name });
    } catch (err) {
      setError('Failed to load document');
      console.error(err);
    }
  }

  async function handleDownloadDocument(doc: ApplicationDocument) {
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download document');
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading application...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className={styles.error}>
        <AlertCircle size={48} />
        <h2>Application Not Found</h2>
        <Button onClick={() => navigate('/admin')}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className={styles.reviewContainer}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </Button>
        <h1>Application Review</h1>
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.leftPanel}>
          <Card className={styles.applicantCard}>
            <CardHeader>
              <CardTitle>
                <User size={20} />
                Applicant Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.applicantHeader}>
                <h2>
                  {application.first_name && application.last_name 
                    ? `${application.first_name} ${application.last_name}`
                    : application.profiles?.full_name || application.profiles?.email || 'Unknown Applicant'}
                </h2>
                <StatusPill status={application.current_status as ApplicationStatus} />
              </div>
              <dl className={styles.infoList}>
                <dt>Email</dt>
                <dd>{application.profiles?.email || '—'}</dd>
                
                <dt>First Name</dt>
                <dd>{application.first_name || '—'}</dd>
                
                <dt>Last Name</dt>
                <dd>{application.last_name || '—'}</dd>
                
                <dt>Date of Birth</dt>
                <dd>{application.date_of_birth ? application.date_of_birth.split('T')[0] : '—'}</dd>
                
                <dt>High School</dt>
                <dd>{application.high_school || '—'}</dd>
                
                <dt>GPA</dt>
                <dd>{application.gpa || '—'}</dd>
                
                <dt>Country</dt>
                <dd>{application.country || '—'}</dd>
                
                <dt>State</dt>
                <dd>{application.state || '—'}</dd>
                
                <dt>Class Year</dt>
                <dd>{application.class_year || '—'}</dd>
                
                <dt>Submitted</dt>
                <dd>{new Date(application.created_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}</dd>
                
                <dt>Payment Status</dt>
                <dd>
                  {application.payment_verified ? (
                    <span className={styles.paymentVerified}>
                      <DollarSign size={14} />
                      Verified {application.payment_verified_at && `on ${new Date(application.payment_verified_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}`}
                    </span>
                  ) : (
                    <span className={styles.paymentPending}>Awaiting verification</span>
                  )}
                </dd>
                {application.decision && (
                  <>
                    <dt>Decision</dt>
                    <dd className={application.decision === 'accepted' ? styles.decisionAccepted : styles.decisionRejected}>
                      {application.decision === 'accepted' ? 'Accepted' : 'Rejected'}
                    </dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card className={styles.documentsCard}>
            <CardHeader>
              <CardTitle>
                <FileText size={20} />
                Application Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className={styles.noContent}>No documents uploaded.</p>
              ) : (
                <ul className={styles.documentList}>
                  {documents.map((doc) => (
                    <li key={doc.id} className={styles.documentItem}>
                      <div className={styles.documentInfo}>
                        <span className={styles.documentName}>{doc.file_name}</span>
                        <span className={styles.documentDate}>
                          Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                        </span>
                      </div>
                      <div className={styles.documentActions}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <Eye size={14} />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadDocument(doc)}
                        >
                          <Download size={14} />
                          Download
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className={styles.financialAidCard}>
            <CardHeader>
              <CardTitle>
                <DollarSign size={20} />
                Financial Aid Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className={styles.infoList}>
                <dt>Applying for Aid</dt>
                <dd>
                  {application.applying_for_financial_aid === null 
                    ? '—' 
                    : application.applying_for_financial_aid 
                      ? 'Yes' 
                      : 'No'}
                </dd>
                
                {application.applying_for_financial_aid === true && (
                  <>
                    <dt>Financial Circumstances</dt>
                    <dd className={styles.longText}>
                      {application.financial_circumstances_overview || '—'}
                    </dd>
                    
                    <dt>Documentation Consent</dt>
                    <dd className={styles.longText}>
                      {application.financial_documentation_consent || '—'}
                    </dd>
                  </>
                )}
                
                {application.applying_for_financial_aid === false && (
                  <>
                    <dt>Payment Certification</dt>
                    <dd className={styles.longText}>
                      {application.payment_certification || '—'}
                    </dd>
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className={styles.rightPanel}>
          <Card className={styles.actionsCard}>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statusChangeSection}>
                <label htmlFor="status-select" className={styles.statusLabel}>
                  Change Status
                </label>
                <select
                  id="status-select"
                  value={application.current_status}
                  onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                  disabled={saving}
                  className={styles.statusDropdown}
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="payment_received">Payment Received</option>
                  <option value="in_review">In Review</option>
                  <option value="decision_released">Decision Released</option>
                </select>
              </div>

              <div className={styles.actionsList}>
                {/* Payment Verification */}
                {application.current_status === 'received' && !application.payment_verified && (
                  <div className={styles.actionItem}>
                    <div className={styles.actionInfo}>
                      <DollarSign size={20} />
                      <div>
                        <strong>Verify Payment</strong>
                        <p>Confirm Zelle payment has been received</p>
                      </div>
                    </div>
                    <Button onClick={handleVerifyPayment} loading={saving}>
                      <CheckCircle size={16} />
                      Verify Payment
                    </Button>
                  </div>
                )}

                {/* Advance to Review */}
                {application.current_status === 'payment_received' && (
                  <div className={styles.actionItem}>
                    <div className={styles.actionInfo}>
                      <Clock size={20} />
                      <div>
                        <strong>Begin Review</strong>
                        <p>Move application to review stage</p>
                      </div>
                    </div>
                    <Button onClick={handleAdvanceToReview} loading={saving}>
                      Start Review
                    </Button>
                  </div>
                )}

                {/* Save Decision */}
                {application.current_status === 'in_review' && !application.decision && (
                  <div className={styles.decisionSection}>
                    <h4>Make Decision</h4>
                    <p>Select a decision for this applicant (will not be released yet):</p>
                    <div className={styles.decisionButtons}>
                      <Button
                        variant="primary"
                        onClick={() => handleSaveDecision('accepted')}
                        loading={saving}
                      >
                        <CheckCircle size={16} />
                        Accept
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleSaveDecision('rejected')}
                        loading={saving}
                      >
                        <XCircle size={16} />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Decision Saved */}
                {application.current_status === 'in_review' && application.decision && (
                  <div className={styles.decisionSaved}>
                    <div className={styles.decisionInfo}>
                      {application.decision === 'accepted' ? (
                        <>
                          <CheckCircle size={24} color="var(--color-elm-green)" />
                          <div>
                            <strong>Decision: Accept</strong>
                            <p>Decision saved. Will be released when admin releases all decisions.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle size={24} color="var(--color-status-rejected)" />
                          <div>
                            <strong>Decision: Reject</strong>
                            <p>Decision saved. Will be released when admin releases all decisions.</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className={styles.decisionActions}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveDecision(application.decision === 'accepted' ? 'rejected' : 'accepted')}
                        loading={saving}
                      >
                        Change Decision
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleReleaseThisDecision}
                        loading={saving}
                      >
                        <CheckCircle size={16} />
                        Release This Decision
                      </Button>
                    </div>
                  </div>
                )}

                {/* Decision Released */}
                {application.current_status === 'decision_released' && (
                  <div className={styles.completedStatus}>
                    <CheckCircle size={24} />
                    <div>
                      <strong>Decision Released</strong>
                      <p>
                        This applicant has been {application.decision === 'accepted' ? 'accepted' : 'rejected'}.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={styles.historyCard}>
            <CardHeader>
              <CardTitle>
                <Clock size={20} />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusHistory.length === 0 ? (
                <p className={styles.noContent}>No status changes recorded.</p>
              ) : (
                <ul className={styles.historyList}>
                  {statusHistory.map((entry) => (
                    <li key={entry.id} className={styles.historyItem}>
                      <div className={styles.historyChange}>
                        {entry.old_status && (
                          <>
                            <StatusPill status={entry.old_status as ApplicationStatus} size="sm" />
                            <span className={styles.historyArrow}>→</span>
                          </>
                        )}
                        <StatusPill status={entry.new_status as ApplicationStatus} size="sm" />
                      </div>
                      <span className={styles.historyDate}>
                        {new Date(entry.changed_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {viewingPDF && (
        <PDFViewer
          url={viewingPDF.url}
          fileName={viewingPDF.fileName}
          onClose={() => setViewingPDF(null)}
        />
      )}
    </div>
  );
}
