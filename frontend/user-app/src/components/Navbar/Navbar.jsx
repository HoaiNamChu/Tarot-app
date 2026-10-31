import { Link, useLocation, useNavigate } from 'react-router-dom';

import styles from './Navbar.module.css';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes.js';

const NAV_LINKS = [
    { to: ROUTES.HOME, label: 'Trang chủ' },
    { to: ROUTES.SERVICES, label: 'Dịch vụ' },
    { to: ROUTES.READERS, label: 'Tarot Reader' },
    { to: ROUTES.BOOKING, label: 'Đặt lịch' },
];

const MOBILE_LINKS = [
    { to: ROUTES.HOME, label: 'Trang chủ', icon: '⌂' },
    { to: ROUTES.SERVICES, label: 'Dịch vụ', icon: '◇' },
    { to: ROUTES.READERS, label: 'Reader', icon: '☾' },
    { to: ROUTES.BOOKING, label: 'Đặt lịch', icon: '♡' },
];

function Navbar() {
    const { isLoggedIn, currentUser, openModal, handleLogout, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const initials = currentUser?.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    function handleHomeClick() {
        if (location.pathname === ROUTES.HOME) {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
    }

    return (
        <>
            <nav className={styles.nav}>
                <Link to={ROUTES.HOME} className={styles['nav-logo']}>Luna Arcana</Link>

                <ul className={styles['nav-links']}>
                    {NAV_LINKS.map(link => (
                        <li key={link.to}>
                            <Link
                                to={link.to}
                                className={location.pathname === link.to ? styles.active : undefined}
                                aria-current={location.pathname === link.to ? 'page' : undefined}
                                onClick={link.to === ROUTES.HOME ? handleHomeClick : undefined}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className={styles['nav-right']}>
                    {loading ? (
                        <div className={`${styles['nav-auth-placeholder']} ${styles.desktopOnly}`} aria-hidden="true" />
                    ) : isLoggedIn ? (
                        <div className={`${styles['nav-user']} ${styles.desktopOnly}`}>
                            <div className={styles['user-avatar']}>{initials}</div>
                            <span className={styles['user-name']}>{currentUser?.name.split(' ').pop()}</span>
                            <button className={styles['nav-cta']} onClick={() => navigate(ROUTES.DASHBOARD)}>Tài khoản</button>
                            <button className={styles['nav-login']} onClick={handleLogout}>Đăng xuất</button>
                        </div>
                    ) : (
                        <div className={`${styles['nav-auth-btns']} ${styles.desktopOnly}`}>
                            <button className={styles['nav-login']} onClick={() => openModal('login')}>Đăng nhập</button>
                            <button className={styles['nav-cta']} onClick={() => openModal('register')}>Đăng ký</button>
                        </div>
                    )}
                </div>
            </nav>

            <nav className={styles.mobileNav} aria-label="Điều hướng chính">
                {MOBILE_LINKS.map(link => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={`${styles.mobileNavItem} ${location.pathname === link.to ? styles.active : ''}`}
                        aria-current={location.pathname === link.to ? 'page' : undefined}
                        onClick={link.to === ROUTES.HOME ? handleHomeClick : undefined}
                    >
                        <span className={styles.mobileNavIcon} aria-hidden="true">{link.icon}</span>
                        <span>{link.label}</span>
                    </Link>
                ))}
                <button
                    className={styles.mobileNavItem}
                    onClick={() => isLoggedIn ? navigate(ROUTES.DASHBOARD) : openModal('login')}
                    aria-label={isLoggedIn ? 'Tài khoản' : 'Đăng nhập'}
                >
                    <span className={styles.mobileNavIcon} aria-hidden="true">♙</span>
                    <span>{isLoggedIn ? 'Tài khoản' : 'Đăng nhập'}</span>
                </button>
            </nav>
        </>
    );
}

export default Navbar;
