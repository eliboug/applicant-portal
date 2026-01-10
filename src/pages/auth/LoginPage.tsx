import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import styles from './AuthPages.module.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authHeader}>
        <h1 className={styles.logo}>Elmseed</h1>
        <p className={styles.subtitle}>Applicant Portal</p>
      </div>

      <Card className={styles.authCard}>
        <CardContent>
          <h2 className={styles.title}>Sign In</h2>
          <p className={styles.description}>
            Enter your credentials to access your application.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

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
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <Button type="submit" loading={loading} className={styles.submitButton}>
              Sign In
            </Button>
          </form>

          <p className={styles.footer}>
            Don't have an account?{' '}
            <Link to="/signup">Create one</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
