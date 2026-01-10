import type { ApplicationStatus } from '../../types/database.ts';
import styles from './StatusPill.module.css';

interface StatusPillProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

const statusLabels: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  payment_received: 'Payment Received',
  in_review: 'In Review',
  decision_released: 'Decision Released',
};

export function StatusPill({ status, size = 'md' }: StatusPillProps) {
  return (
    <span className={`${styles.pill} ${styles[status]} ${styles[size]}`}>
      {statusLabels[status]}
    </span>
  );
}
