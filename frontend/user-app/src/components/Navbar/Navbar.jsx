import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import styles from './Navbar.module.css';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
    { href: '#free-reading', label: 'Thu mien phi' },
    { href: '#services', label: 'Dịch vụ' },
    { href: '#readers', label: 'Tarot Reader' },
    { href: '#booking', label: 'Đặt lịch' },
];

function Navbar() {
    const { isLoggedIn, currentUser, openModal, handleLogout, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const initials = currentUser?.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    function handleNavClick(e, href) {
        e.preventDefault();
        const id = href.replace('#', '');
        setMenuOpen(false);
        if (location.pathname === '/') {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        } else {
            navigate('/');
            setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 300);
        }
    }

    function handleLogoutClick() {
        setMenuOpen(false);
        handleLogout();
    }

    return (
        <>
            <nav className={styles.nav}>
                <Link to="/" className={styles['nav-logo']}>Luna Arcana</Link>

                <ul className={styles['nav-links']}>
                    {NAV_LINKS.map(link => (
                        <li key={link.href}>
                            <a href={link.href} onClick={e => handleNavClick(e, link.href)}>{link.label}</a>
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
                            <button className={styles['nav-cta']} onClick={() => navigate('/dashboard')}>Tài khoản</button>
                            <button className={styles['nav-login']} onClick={handleLogout}>Đăng xuất</button>
                        </div>
                    ) : (
                        <div className={`${styles['nav-auth-btns']} ${styles.desktopOnly}`}>
                            <button className={styles['nav-login']} onClick={() => openModal('login')}>Đăng nhập</button>
                            <button className={styles['nav-cta']} onClick={() => openModal('register')}>Đăng ký</button>
                        </div>
                    )}

                    <button
                        className={`${styles.hamburger} ${menuOpen ? styles.open : ''}`}
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="Mo menu"
                        aria-expanded={menuOpen}
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </nav>

            <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ''}`}>
                {NAV_LINKS.map(link => (
                    <a
                        key={link.href}
                        href={link.href}
                        className={styles.mobileMenuItem}
                        onClick={e => handleNavClick(e, link.href)}
                    >
                        {link.label}
                    </a>
                ))}

                <div className={styles.mobileDivider} />

                {loading ? (
                    <div className={styles.mobileMenuItem}>Đang đồng bộ tài khoản...</div>
                ) : isLoggedIn ? (
                    <>
                        <div style={{ padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                            <div className={styles['user-avatar']}>{initials}</div>
                            <div>
                                <div style={{ color: 'var(--cream)', fontSize: '.85rem' }}>{currentUser?.name}</div>
                                <div style={{ color: 'var(--muted)', fontSize: '.72rem' }}>{currentUser?.email}</div>
                            </div>
                        </div>
                        <button className={styles.mobileMenuItem} onClick={() => { navigate('/dashboard'); setMenuOpen(false); }}>
                            Tài khoản của tôi
                        </button>
                        <button className={styles.mobileMenuItem} onClick={handleLogoutClick} style={{ color: 'var(--rose)' }}>
                            Đăng xuất
                        </button>
                    </>
                ) : (
                    <>
                        <button className={styles.mobileMenuItem} onClick={() => { openModal('login'); setMenuOpen(false); }}>
                            Đăng nhập
                        </button>
                        <button className={styles.mobileMenuItem} onClick={() => { openModal('register'); setMenuOpen(false); }}
                            style={{ color: 'var(--gold)', borderColor: 'var(--border)' }}>
                            Đăng ký miễn phí
                        </button>
                    </>
                )}
            </div>
        </>
    );
}

export default Navbar;
