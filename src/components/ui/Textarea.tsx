import type { TextareaHTMLAttributes } from 'react';
import styles from './Textarea.module.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`${styles.textareaGroup} ${className}`}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`${styles.textarea} ${error ? styles.textareaError : ''}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        {...props}
      />
      {hint && !error && (
        <p id={`${textareaId}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${textareaId}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
