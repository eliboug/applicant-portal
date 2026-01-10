import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import styles from './Header.module.css';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoText}>Elmseed</span>
          <span className={styles.logoSubtext}>Applicant Portal</span>
        </Link>

        {user && (
          <nav className={styles.nav}>
            <div className={styles.userInfo}>
              <User size={18} />
              <span>{profile?.email || user.email}</span>
              {profile?.role && profile.role !== 'applicant' && (
                <span className={styles.roleBadge}>{profile.role}</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut size={16} />
              Sign Out
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
