import { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, DollarSign, Search, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Application, ApplicationDocument, ApplicationStatus } from '../../types/database.ts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import styles from './ApplicantDashboard.module.css';

interface TimelineStep {
  status: ApplicationStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
}

const statusOrder: ApplicationStatus[] = ['draft', 'submitted', 'payment_received', 'in_review', 'decision_released'];

export function ApplicantDashboard() {
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [document, setDocument] = useState<ApplicationDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchApplication();
    }
  }, [user]);

  // Redirect to application form if status is draft
  useEffect(() => {
    if (application && application.current_status === 'draft') {
      window.location.href = `/application/${application.id}`;
    }
  }, [application]);

  async function fetchApplication() {
    try {
      const { data: apps, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (appError) throw appError;
      
      if (apps && apps.length > 0) {
        setApplication(apps[0] as Application);

        const { data: docs, error: docsError } = await supabase
          .from('application_documents')
          .select('*')
          .eq('application_id', (apps[0] as Application).id)
          .limit(1);

        if (docsError) throw docsError;
        if (docs && docs.length > 0) {
          setDocument(docs[0] as ApplicationDocument);
        }
      }
    } catch (err) {
      setError('Failed to load application data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createNewApplication() {
    if (!user) return;

    setUploading(true);
    setError('');

    try {
      const { data: newApp, error: appError } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          current_status: 'draft',
          payment_verified: false
        })
        .select()
        .single();

      if (appError) throw appError;

      setApplication(newApp as Application);
      window.location.href = `/application/${newApp.id}`;
    } catch (err) {
      setError('Failed to create application. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  function getTimelineSteps(): TimelineStep[] {
    const currentIndex = application
      ? statusOrder.indexOf(application.current_status as ApplicationStatus)
      : -1;

    return [
      {
        status: 'draft',
        label: 'Application Started',
        description: 'Fill out your application information',
        icon: <FileText size={16} />,
        completed: currentIndex > 0,
        current: currentIndex === 0
      },
      {
        status: 'submitted',
        label: 'Application Submitted',
        description: 'Your application has been submitted',
        icon: <CheckCircle size={16} />,
        completed: currentIndex > 1,
        current: currentIndex === 1
      },
      {
        status: 'payment_received',
        label: 'Payment Received',
        description: 'Application fee verified',
        icon: <DollarSign size={16} />,
        completed: currentIndex > 2,
        current: currentIndex === 2
      },
      {
        status: 'in_review',
        label: 'In Review',
        description: 'Your application is being reviewed',
        icon: <Search size={16} />,
        completed: currentIndex > 3,
        current: currentIndex === 3
      },
      {
        status: 'decision_released',
        label: 'Decision Released',
        description: 'Final decision has been made',
        icon: <Award size={16} />,
        completed: currentIndex >= 4,
        current: currentIndex === 4
      },
    ];
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading your application...</p>
      </div>
    );
  }

  // No application yet - show start UI
  if (!application) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateContent}>
          <div className={styles.emptyStateIcon}>
            <FileText size={64} strokeWidth={1.5} />
          </div>
          <h1>Welcome to Your Application Portal</h1>
          <p className={styles.emptyStateDescription}>
            Begin your journey by creating your application. We'll guide you through each step of the process.
          </p>

          {error && (
            <div className={styles.error} role="alert">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className={styles.startCard}>
            <div className={styles.startCardHeader}>
              <h2>What You'll Need</h2>
              <p>Gather these items before you begin:</p>
            </div>
            <div className={styles.requirementsGrid}>
              <div className={styles.requirementItem}>
                <div className={styles.requirementIcon}>
                  <FileText size={20} />
                </div>
                <div>
                  <strong>Personal Information</strong>
                  <p>Name, date of birth, contact details</p>
                </div>
              </div>
              <div className={styles.requirementItem}>
                <div className={styles.requirementIcon}>
                  <Award size={20} />
                </div>
                <div>
                  <strong>Academic Details</strong>
                  <p>High school name and GPA</p>
                </div>
              </div>
              <div className={styles.requirementItem}>
                <div className={styles.requirementIcon}>
                  <FileText size={20} />
                </div>
                <div>
                  <strong>Application PDF</strong>
                  <p>Your completed application document</p>
                </div>
              </div>
              <div className={styles.requirementItem}>
                <div className={styles.requirementIcon}>
                  <FileText size={20} />
                </div>
                <div>
                  <strong>Transcript PDF</strong>
                  <p>Official or unofficial transcript</p>
                </div>
              </div>
            </div>
            <button
              className={styles.startButton}
              onClick={createNewApplication}
              disabled={uploading}
            >
              {uploading ? 'Creating Application...' : 'Start Application'}
            </button>
          </div>

          <div className={styles.infoCard}>
            <DollarSign size={24} />
            <div>
              <h3>Payment Information</h3>
              <p>
                After submitting your application, send the application fee via Venmo to <strong >@INSERT ASH VENMO</strong>.
                Include your email address in the payment note for verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Application exists - show status tracking
  const timelineSteps = getTimelineSteps();

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1>My Application</h1>
          <p className={styles.subtitle}>Application Cycle 2026</p>
        </div>
        <StatusPill status={application.current_status as ApplicationStatus} />
      </header>

      {error && (
        <div className={styles.error} role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className={styles.grid}>
        <Card className={styles.statusCard}>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.statusDisplay}>
              <StatusPill status={application.current_status as ApplicationStatus} size="md" />
              <p className={styles.statusMessage}>
                {getStatusMessage(application)}
              </p>
            </div>

            {application.current_status === 'submitted' && (
              <div className={styles.paymentReminder}>
                <DollarSign size={20} />
                <div>
                  <p><strong>Payment Required:</strong> Send application fee via Venmo to <strong>@placeholder-ash-venmo</strong></p>
                </div>
              </div>
            )}

            {application.current_status === 'decision_released' && application.decision && (
              <div className={`${styles.decisionBanner} ${styles[application.decision]}`}>
                {application.decision === 'accepted' ? (
                  <>
                    <CheckCircle size={24} />
                    <span>Congratulations! You have been accepted.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={24} />
                    <span>Thank you for applying. Unfortunately, we are unable to offer you admission at this time.</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={styles.timelineCard}>
          <CardHeader>
            <CardTitle>Application Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.timeline}>
              {timelineSteps.map((step, index) => (
                <div
                  key={step.status}
                  className={`${styles.timelineStep} ${step.completed ? styles.completed : ''} ${step.current ? styles.current : ''}`}
                >
                  <div className={styles.timelineDot}>
                    {step.completed ? <CheckCircle size={16} /> : step.current ? step.icon : <Clock size={16} />}
                  </div>
                  <div className={styles.timelineContent}>
                    <span className={styles.timelineLabel}>{step.label}</span>
                    <span className={styles.timelineDescription}>{step.description}</span>
                  </div>
                  {index < timelineSteps.length - 1 && <div className={styles.timelineLine} />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {document && (
          <Card className={styles.documentsCard}>
            <CardHeader>
              <CardTitle>Your Application</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.documentItem}>
                <FileText size={24} />
                <div className={styles.documentInfo}>
                  <span className={styles.documentName}>{document.file_name}</span>
                  <span className={styles.documentMeta}>
                    Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function getStatusMessage(application: Application): string {
  const messages: Record<ApplicationStatus, string> = {
    draft: 'Complete your application form to submit.',
    submitted: 'Your application has been submitted. Please wait as our team confirms your application fee has been received..',
    payment_received: 'Payment verified! Your application is now in the queue for review.',
    in_review: 'Your application is currently being reviewed by our admissions team.',
    decision_released: 'A decision has been made on your application.',
  };
  return messages[application.current_status as ApplicationStatus];
}
