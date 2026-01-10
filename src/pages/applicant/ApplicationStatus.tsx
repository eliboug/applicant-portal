import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertCircle, DollarSign, Search, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Application, ApplicationDocument, ApplicationStatus as Status } from '../../types/database.ts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';
import styles from './ApplicationStatus.module.css';

interface TimelineStep {
  status: Status;
  label: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
}

const statusOrder: Status[] = ['draft', 'submitted', 'payment_received', 'in_review', 'decision_released'];

export function ApplicationStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [document, setDocument] = useState<ApplicationDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decisionRevealed, setDecisionRevealed] = useState(false);

  // Redirect to dashboard if application is in draft status
  useEffect(() => {
    if (application && application.current_status === 'draft') {
      navigate('/');
    }
  }, [application, navigate]);

  const triggerConfetti = () => {
    const durationSeconds = 5000;
    const animationEnd = Date.now() + durationSeconds;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / durationSeconds);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleViewDecision = () => {
    setDecisionRevealed(true);
    if (application?.decision === 'accepted') {
      triggerConfetti();
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplication();
    }
  }, [user]);

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

  function getTimelineSteps(): TimelineStep[] {
    const currentIndex = application
      ? statusOrder.indexOf(application.current_status as Status)
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
        label: application?.applying_for_financial_aid 
          ? 'Financial Aid Request Approved' 
          : 'Payment Received',
        description: application?.applying_for_financial_aid 
          ? 'Application Fee Waived' 
          : 'Application fee verified',
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

  if (!application) {
    return (
      <div className={styles.error}>
        <AlertCircle size={48} />
        <h2>No Application Found</h2>
        <p>You haven't started an application yet.</p>
      </div>
    );
  }

  const timelineSteps = getTimelineSteps();

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1>My Application</h1>
          <p className={styles.subtitle}>Application Cycle 2026</p>
        </div>
        <StatusPill status={application.current_status as Status} />
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
              <StatusPill status={application.current_status as Status} size="md" />
              <p className={styles.statusMessage}>
                {application.current_status === 'submitted' ? (
                  <>
                    Your application has been submitted. Please wait as our team confirms your application fee has been received. Email our team at <a href="mailto:elmseedconsulting@gmail.com" style={{ color: 'blue' }}>elmseedconsulting@gmail.com</a> if you think you've made a mistake on your application.
                  </>
                ) : (
                  getStatusMessage(application)
                )}
              </p>
            </div>

            {application.current_status === 'submitted' && (
              <div className={styles.paymentReminder}>
                <DollarSign size={20} />
                <div>
                  {application.applying_for_financial_aid ? (
                    <p><strong>Processing Your Financial Aid Information</strong></p>
                  ) : (
                    <p><strong>Payment Required:</strong> Send application fee via Venmo to <strong>@placeholder-ash-venmo</strong></p>
                  )}
                </div>
              </div>
            )}

            {application.current_status === 'decision_released' && application.decision && (
              <>
                {!decisionRevealed ? (
                  <div className={styles.decisionPrompt}>
                    <Award size={24} />
                    <div>
                      <p><strong>Your decision is ready</strong></p>
                      <button 
                        className={styles.viewDecisionButton}
                        onClick={handleViewDecision}
                      >
                        View Decision
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`${styles.decisionBanner} ${styles[application.decision]}`}>
                    {application.decision === 'accepted' ? (
                      <>
                        <CheckCircle size={24} />
                        <span>Congratulations! You have been accepted! We will email you with next steps soon. </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={24} />
                        <span>Thank you for applying. Unfortunately, we are unable to offer you admission at this time.</span>
                      </>
                    )}
                  </div>
                )}
              </>
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
  const messages: Record<Status, string> = {
    draft: 'Complete your application form to submit.',
    submitted: 'Your application has been submitted.',
    payment_received: 'Payment verified! Your application is now in the queue for review.',
    in_review: 'Your application is currently being reviewed by our admissions team.',
    decision_released: 'A decision has been made on your application.',
  };
  return messages[application.current_status as Status];
}
