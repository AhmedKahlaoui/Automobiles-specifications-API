import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './NavBar.module.css'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
    >
      {label}
    </NavLink>
  )
}

export function NavBar() {
  const { auth, logout } = useAuth()

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="Automobile Specs">
          <img className={styles.logo} src="/logo.png" alt="Automobile Specs" />
          <span>Automobile Specs</span>
        </Link>

        <div className={styles.actions}>
          <nav className={styles.nav}>
            <NavItem to="/search" label="Search" />
            <NavItem to="/compare" label="Compare" />
            <NavItem to="/rankings" label="Rankings" />
            <NavItem to="/browse" label="Browse" />
            {auth.isAuthenticated ? <NavItem to="/favorites" label="Favorites" /> : null}
            {auth.isAdmin ? <NavItem to="/admin/cars" label="Admin" /> : null}
          </nav>

          <div className={styles.right}>
            {auth.isAuthenticated ? (
              <>
                <span className={styles.user}>
                  {auth.username ?? 'User'}
                  {auth.role ? ` · ${auth.role}` : ''}
                </span>
                <button className={styles.button} onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className={styles.button} to="/auth/login">
                  Login
                </Link>
                <Link className={styles.buttonSecondary} to="/auth/register">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
