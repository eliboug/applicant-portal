import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import styles from './AuthPages.module.css';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp(email, password, fullName);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authHeader}>
          <h1 className={styles.logo}>Elmseed</h1>
          <p className={styles.subtitle}>Applicant Portal</p>
        </div>

        <Card className={styles.authCard}>
          <CardContent>
            <h2 className={styles.title}>Check Your Email</h2>
            <p className={styles.description}>
              We've sent a confirmation link to <strong>{email}</strong>.
              Please check your inbox and click the link to activate your account.
            </p>
            <Button onClick={() => navigate('/login')} className={styles.submitButton}>
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authHeader}>
        <h1 className={styles.logo}>Elmseed</h1>
        <p className={styles.subtitle}>Applicant Portal</p>
      </div>

      <Card className={styles.authCard}>
        <CardContent>
          <h2 className={styles.title}>Create Account</h2>
          <p className={styles.description}>
            Start your application by creating an account.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
              hint="Must be at least 8 characters"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
            />

            <Button type="submit" loading={loading} className={styles.submitButton}>
              Create Account
            </Button>
          </form>

          <p className={styles.footer}>
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
