import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, DollarSign, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Application } from '../../types/database.ts';
import styles from './ApplicantDashboard.module.css';

export function ApplicantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchApplication();
    }
  }, [user]);

  // Redirect to status page if application exists and is not draft
  useEffect(() => {
    if (application && application.current_status !== 'draft') {
      navigate('/status');
    }
  }, [application, navigate]);

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

    // If application already exists, navigate to it
    if (application) {
      window.location.href = `/application/${application.id}`;
      return;
    }

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

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading your application...</p>
      </div>
    );
  }

  // Always show start UI with requirements
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
            {uploading ? 'Creating Application...' : (application ? 'Continue Application' : 'Start Application')}
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
