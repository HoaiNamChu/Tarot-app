import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PayModal from '../components/PayModal/PayModal.jsx';
import PasswordInput from '../components/PasswordInput/PasswordInput.jsx';
import ReviewModal from '../components/ReviewModal/ReviewModal.jsx';
import styles from './Dashboard.module.css';
import { api } from '../services/api.js';


const ST_LABEL = {
    confirmed: 'Đã xác nhận',
    pending: 'Chờ thanh toán',
    completed: 'Hoàn thành',
    cancelled: 'Đã huỷ'
};

function Dashboard() {
    const navigate = useNavigate();
    const showToast = useToast();
    const { currentUser, isLoggedIn, bookings, reviews, cancelBooking, loading, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [payBooking, setPayBooking] = useState(null);
    const [reviewBooking, setReviewBooking] = useState(null);
    const [profileForm, setProfileForm] = useState({ name: currentUser?.name || '' });
    const [passForm, setPassForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
    const [profileLoading, setProfileLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [nowMs] = useState(() => Date.now());

    useEffect(() => {
        if (!loading && !isLoggedIn) navigate('/');
    }, [loading, isLoggedIn, navigate]);
    if (loading) return null;

    if (!isLoggedIn || !currentUser) return null;
    const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const upcoming = bookings.filter(
        b =>
            b.status === 'confirmed' ||
            b.status === 'pending'
    );
    const history = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
    const canPayBooking = (booking) => {
        if (booking.paid || booking.status !== 'pending') return false;
        if (booking.payment_status === 'pending_verification') return false;
        if (booking.expires_at && new Date(booking.expires_at).getTime() <= nowMs) return false;

        return true;
    };
    const TABS = [
        { id: 'upcoming', label: '📅 Lịch sắp tới' },
        { id: 'history', label: '🕐 Lịch sử đặt bài' },
        { id: 'reviews', label: '⭐ Đánh giá của tôi' },
        { id: 'profile', label: '👤 Tài khoản' },
    ];

    // Hàm cập nhật profile
    async function handleUpdateProfile() {
        if (!profileForm.name.trim()) { showToast('Vui lòng nhập họ tên.'); return; }
        setProfileLoading(true);
        try {
            const res = await api.profile.update({ name: profileForm.name });
            // Cập nhật currentUser trong context
            updateUser(res.user);
            showToast('Đã cập nhật thông tin.');
        } catch (e) {
            showToast(e.message);
        } finally {
            setProfileLoading(false);
        }
    }

    // Hàm đổi mật khẩu
    async function handleChangePassword() {
        if (!passForm.current_password || !passForm.new_password) {
            showToast('Vui lòng điền đầy đủ thông tin.');
            return;
        }
        if (passForm.new_password !== passForm.new_password_confirmation) {
            showToast('Xác nhận mật khẩu không khớp.');
            return;
        }
        setPassLoading(true);
        try {
            await api.profile.changePassword(passForm);
            showToast('Đã đổi mật khẩu thành công.');
            setPassForm({ current_password: '', new_password: '', new_password_confirmation: '' });
        } catch (e) {
            showToast(e.message);
        } finally {
            setPassLoading(false);
        }
    }

    return (
        <div className={styles.page}>
            {/* Nav */}
            <div className={styles['ud-nav']}>
                <div className={styles['ud-logo']}>🌙 Luna Arcana</div>
                <button className={styles['ud-back']} onClick={() => navigate('/')}>
                    ← Quay về trang chủ
                </button>
            </div>

            <div className={styles['ud-inner']}>
                {/* Header */}
                <div className={styles['ud-header']}>
                    <div className={styles['ud-avatar']}>{initials}</div>
                    <div className={styles['ud-info']}>
                        <div className={styles['ud-welcome']}>Chào mừng trở lại</div>
                        <div className={styles['ud-name']}>{currentUser.name}</div>
                        <div className={styles['ud-email']}>{currentUser.email}</div>
                    </div>
                    <div className={styles['ud-stats']}>
                        <div className={styles['ud-stat']}>
                            <div className={styles['ud-stat-val']}>{bookings.length}</div>
                            <div className={styles['ud-stat-lbl']}>Lịch đặt</div>
                        </div>
                        <div className={styles['ud-stat']}>
                            <div className={styles['ud-stat-val']}>{bookings.filter(b => b.status === 'completed').length}</div>
                            <div className={styles['ud-stat-lbl']}>Hoàn thành</div>
                        </div>
                        <div className={styles['ud-stat']}>
                            <div className={styles['ud-stat-val']}>{reviews.length}</div>
                            <div className={styles['ud-stat-lbl']}>Đánh giá</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles['ud-tabs']}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`${styles['ud-tab']} ${activeTab === tab.id ? styles.active : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Upcoming */}
                {activeTab === 'upcoming' && (
                    <div>
                        {!upcoming.length ? (
                            <div className={styles['bk-empty']}>
                                <div className={styles['bk-empty-icon']}>🌙</div>
                                <div className={styles['bk-empty-text']}>Bạn chưa có lịch đặt sắp tới nào.</div>
                                <button className="btn-primary" onClick={() => navigate('/#booking')}>
                                    Đặt lịch ngay
                                </button>
                            </div>
                        ) : upcoming.map(b => (
                            <div key={b.booking_id} className={styles['bk-card']}>
                                <div className={styles['bk-card-head']}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                                        <span className={styles['bk-id']}>{b.booking_id}</span>
                                        <span
                                            className={`${styles['bk-status']} ${styles[b.status]}`}
                                        >
                                            <span
                                                className={styles['bk-status-dot']}
                                            ></span>

                                            {b.status === 'expired'
                                                ? 'Hết hạn thanh toán'
                                                : ST_LABEL[b.status]
                                            }
                                        </span>
                                        <span className={`${styles['bk-status']} ${b.payment_status === 'paid' ? styles.paid :
                                            b.payment_status === 'pending_verification' ? styles.pending :
                                                styles.pending
                                            }`}>
                                            <span className={styles['bk-status-dot']}></span>
                                            {b.payment_status === 'paid'
                                                ? 'Đã thanh toán'
                                                : b.latest_payment_status === 'pending'
                                                    ? 'Đang chờ thanh toán'
                                                    : b.latest_payment_status === 'failed'
                                                        ? 'Thanh toán thất bại'
                                                        : b.latest_payment_status === 'expired'
                                                            ? 'Hết hạn thanh toán'
                                                            : 'Chưa thanh toán'}
                                        </span>
                                    </div>

                                    {b.latest_payment_status !== 'pending' &&
                                        b.status !== 'cancelled' && (
                                            <button
                                                className={styles['bk-btn-ghost']}
                                                onClick={() => {
                                                    if (window.confirm('Bạn có chắc muốn huỷ lịch này không?')) {
                                                        cancelBooking(b.booking_id);
                                                    }
                                                }}
                                            >
                                                Huỷ lịch
                                            </button>
                                        )}
                                </div>
                                <div className={styles['bk-card-body']}>
                                    <div className={styles['bk-reader']}>
                                        <span className={styles['bk-reader-em']}>{b.readerEm}</span>
                                        <div>
                                            <div className={styles['bk-reader-name']}>{b.reader}</div>
                                            <div className={styles['bk-reader-type']}>{b.svc}</div>
                                        </div>
                                    </div>
                                    <div className={styles['bk-meta']}>
                                        <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>📅</span>{b.date}</div>
                                        <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>⏰</span>{b.time}</div>
                                        <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>⌛</span>{b.dur}</div>
                                        <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>💰</span><span className={styles['bk-price']}>{b.price}</span></div>
                                    </div>
                                </div>
                                <div className={styles['bk-actions']}>
                                    {canPayBooking(b) && (
                                        <button
                                            className={styles['bk-btn-pay']}
                                            onClick={() => setPayBooking(b)}
                                        >
                                            {b.latest_payment_status ? '✦ Thanh toán lại' : '✦ Thanh toán ngay'}
                                        </button>
                                    )}
                                    {b.paid && b.zoom_link ? (
                                        <button
                                            className={styles['bk-btn-ghost']}
                                            onClick={() => window.open(b.zoom_link)}
                                        >
                                            Xem link Zoom
                                        </button>
                                    ) : (
                                        <button
                                            className={styles['bk-btn-ghost']}
                                            disabled
                                        >
                                            Chưa có link Zoom
                                        </button>
                                    )}
                                    <button className={styles['bk-btn-ghost']} onClick={() => showToast('Đã sao chép mã đặt lịch!')}>
                                        Sao chép mã
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab: History */}
                {activeTab === 'history' && (
                    <div>
                        {!history.length ? (
                            <div className={styles['bk-empty']}>
                                <div className={styles['bk-empty-icon']}>🕐</div>
                                <div className={styles['bk-empty-text']}>Chưa có lịch sử đặt bài nào.</div>
                            </div>
                        ) : history.map(b => {
                            const alreadyReviewed = b.reviewed || reviews.some(r => r.bookingId === b.booking_id);
                            return (
                                <div key={b.booking_id} className={styles['bk-card']}>
                                    <div className={styles['bk-card-head']}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                                            <span className={styles['bk-id']}>{b.booking_id}</span>
                                            <span className={`${styles['bk-status']} ${styles[b.status]}`}>
                                                <span className={styles['bk-status-dot']}></span>
                                                {ST_LABEL[b.status]}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{b.date}</span>
                                    </div>
                                    <div className={styles['bk-card-body']}>
                                        <div className={styles['bk-reader']}>
                                            <span className={styles['bk-reader-em']}>{b.readerEm}</span>
                                            <div>
                                                <div className={styles['bk-reader-name']}>{b.reader}</div>
                                                <div className={styles['bk-reader-type']}>{b.svc}</div>
                                            </div>
                                        </div>
                                        <div className={styles['bk-meta']}>
                                            <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>⏰</span>{b.time}</div>
                                            <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>⌛</span>{b.dur}</div>
                                            <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>💰</span><span className={styles['bk-price']}>{b.price}</span></div>
                                        </div>
                                    </div>
                                    <div className={styles['bk-actions']}>
                                        {b.status === 'completed' && !alreadyReviewed ? (
                                            <button className={styles['bk-btn-review']} onClick={() => setReviewBooking(b)}>
                                                ✦ Viết đánh giá
                                            </button>
                                        ) : b.status === 'completed' && (
                                            <span style={{ fontSize: '.7rem', color: 'var(--muted)', letterSpacing: '.08em' }}>✓ Đã đánh giá</span>
                                        )}
                                        <button className={styles['bk-btn-ghost']} onClick={() => { navigate('/'); showToast('Điền form bên dưới để đặt lịch mới!'); }}>
                                            Đặt lại
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tab: Reviews */}
                {activeTab === 'reviews' && (
                    <div>
                        {!reviews.length ? (
                            <div className={styles['bk-empty']}>
                                <div className={styles['bk-empty-icon']}>⭐</div>
                                <div className={styles['bk-empty-text']}>
                                    Bạn chưa có đánh giá nào. Hoàn thành một buổi đọc bài để chia sẻ trải nghiệm!
                                </div>
                            </div>
                        ) : reviews.map((r, i) => (
                            <div key={i} className={styles['my-review-card']}>
                                <div className={styles['mrc-top']}>
                                    <div className={styles['mrc-reader']}>
                                        <span className={styles['mrc-em']}>{r.readerEm}</span>
                                        <div className={styles['mrc-info']}>
                                            <div className={styles['mrc-name']}>{r.readerName}</div>
                                            <div className={styles['mrc-svc']}>{r.svc}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className={styles['mrc-stars']}>{'★'.repeat(r.stars)}</div>
                                        <div className={styles['mrc-date']}>{r.date}</div>
                                    </div>
                                </div>
                                <div className={styles['mrc-text']}>"{r.text}"</div>
                                {r.adminReply && (
                                    <div style={{ marginTop: '.75rem', padding: '.8rem .9rem', border: '1px solid rgba(200,169,110,.18)', background: 'rgba(200,169,110,.06)', borderRadius: 4 }}>
                                        <div style={{ fontSize: '.62rem', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.35rem' }}>Phan hoi tu admin</div>
                                        <div style={{ fontSize: '.82rem', lineHeight: 1.55, color: 'var(--muted-2)' }}>{r.adminReply}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {/* Tab Profile */}
                {activeTab === 'profile' && (
                    <div>
                        {/* Thông tin cơ bản */}
                        <div className={styles['bk-card']}>
                            <div className={styles['bk-card-head']}>
                                <span style={{ fontSize: '.65rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                                    Thông tin tài khoản
                                </span>
                            </div>
                            <div style={{ padding: '1.25rem 1.4rem' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.45rem' }}>
                                        Họ và tên
                                    </label>
                                    <input
                                        style={{ width: '100%', background: 'var(--ink-3)', border: '1px solid rgba(200,169,110,.15)', color: 'var(--cream)', fontFamily: "'DM Sans', sans-serif", fontSize: '.88rem', padding: '.75rem 1rem', borderRadius: '2px', outline: 'none' }}
                                        type="text"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm({ name: e.target.value })}
                                        onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(200,169,110,.15)'}
                                    />
                                </div>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.45rem' }}>
                                        Email
                                    </label>
                                    <input
                                        style={{ width: '100%', background: 'var(--ink-3)', border: '1px solid rgba(200,169,110,.08)', color: 'var(--muted-2)', fontFamily: "'DM Sans', sans-serif", fontSize: '.88rem', padding: '.75rem 1rem', borderRadius: '2px', outline: 'none', cursor: 'not-allowed' }}
                                        type="email"
                                        value={currentUser?.email}
                                        disabled
                                    />
                                </div>
                                <button
                                    className="btn-primary"
                                    onClick={handleUpdateProfile}
                                    disabled={profileLoading}
                                >
                                    {profileLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>

                        {/* Đổi mật khẩu */}
                        <div className={styles['bk-card']}>
                            <div className={styles['bk-card-head']}>
                                <span style={{ fontSize: '.65rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                                    Đổi mật khẩu
                                </span>
                            </div>
                            <div style={{ padding: '1.25rem 1.4rem' }}>
                                {[
                                    { label: 'Mật khẩu hiện tại', key: 'current_password' },
                                    { label: 'Mật khẩu mới', key: 'new_password' },
                                    { label: 'Xác nhận mật khẩu mới', key: 'new_password_confirmation' },
                                ].map(field => (
                                    <div key={field.key} style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '.62rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '.45rem' }}>
                                            {field.label}
                                        </label>
                                        <PasswordInput
                                            style={{ width: '100%', background: 'var(--ink-3)', border: '1px solid rgba(200,169,110,.15)', color: 'var(--cream)', fontFamily: "'DM Sans', sans-serif", fontSize: '.88rem', padding: '.75rem 1rem', borderRadius: '2px', outline: 'none' }}
                                            value={passForm[field.key]}
                                            onChange={e => setPassForm(p => ({ ...p, [field.key]: e.target.value }))}
                                            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(200,169,110,.15)'}
                                        />
                                    </div>
                                ))}
                                <button
                                    className="btn-primary"
                                    onClick={handleChangePassword}
                                    disabled={passLoading}
                                >
                                    {passLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <PayModal booking={payBooking} onClose={() => setPayBooking(null)} />
            <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} />
        </div >
    );
}

export default Dashboard;
