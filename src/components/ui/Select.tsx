import type { SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  hint,
  id,
  className = '',
  options,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`${styles.selectGroup} ${className}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`${styles.select} ${error ? styles.selectError : ''}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        {...props}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <p id={`${selectId}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${selectId}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
