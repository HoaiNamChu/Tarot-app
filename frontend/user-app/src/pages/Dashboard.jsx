import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PayModal from '../components/PayModal/PayModal.jsx';
import PasswordInput from '../components/PasswordInput/PasswordInput.jsx';
import ReviewModal from '../components/ReviewModal/ReviewModal.jsx';
import styles from './Dashboard.module.css';
import { api } from '../services/api.js';

const STATUS_LABEL = {
    pending: 'Cho thanh toan',
    confirmed: 'Da xac nhan',
    completion_pending: 'Cho ban xac nhan',
    completed: 'Hoan thanh',
    cancelled: 'Da huy',
    expired: 'Het han thanh toan',
};

const PAYMENT_LABEL = {
    paid: 'Da thanh toan',
    pending_verification: 'Cho xac minh',
    refund_pending: 'Cho hoan tien',
    refunded: 'Da hoan tien',
    unpaid: 'Chua thanh toan',
};

function bookingCode(booking) {
    return `BK-${String(booking.booking_id).padStart(4, '0')}`;
}

function paymentLabel(booking) {
    if (booking.payment_status === 'paid') return PAYMENT_LABEL.paid;
    if (booking.payment_status === 'pending_verification') return PAYMENT_LABEL.pending_verification;
    if (booking.payment_status === 'refund_pending') return PAYMENT_LABEL.refund_pending;
    if (booking.payment_status === 'refunded') return PAYMENT_LABEL.refunded;
    if (booking.latest_payment_status === 'pending') return 'Dang cho cong thanh toan';
    if (booking.latest_payment_status === 'failed') return 'Thanh toan that bai';
    if (booking.latest_payment_status === 'expired') return 'Het han thanh toan';
    return PAYMENT_LABEL.unpaid;
}

function nextActionText(booking) {
    if (booking.status === 'cancelled' && booking.payment_status === 'refund_pending') return 'Lich da huy. Khoan thanh toan dang cho admin hoan tien.';
    if (booking.status === 'cancelled') return 'Lich da huy. Ban co the dat lai neu van can tu van.';
    if (booking.status === 'completed') return 'Buoi doc da hoan thanh. Ban co the gui danh gia neu chua danh gia.';
    if (booking.status === 'completion_pending') return 'Reader da danh dau buoi xem da dien ra. Vui long xac nhan neu ban da xem, hoac bao chua xem de admin kiem tra lai.';
    if (booking.payment_status === 'pending_verification') return 'Thanh toan dang cho admin xac minh. Ban khong can thanh toan lai luc nay.';
    if (booking.payment_status !== 'paid') return 'Vui long hoan tat thanh toan truoc khi het han giu lich.';
    if (booking.status === 'pending') return 'Thanh toan da ghi nhan. Lich dang cho xac nhan.';
    if (booking.status === 'confirmed' && !booking.zoom_link) return 'Lich da xac nhan. Link phong hop se duoc cap nhat truoc buoi hen.';
    if (booking.status === 'confirmed' && booking.zoom_link) return 'Lich da san sang. Ban co the vao phong hop theo link da cap nhat.';
    return 'Theo doi trang thai lich trong dashboard cua ban.';
}

function timeline(booking) {
    const paid = booking.payment_status === 'paid';
    const pendingVerification = booking.payment_status === 'pending_verification';
    const cancelled = booking.status === 'cancelled';
    const completed = booking.status === 'completed';
    const completionPending = booking.status === 'completion_pending';
    const confirmed = booking.status === 'confirmed' || completionPending || completed;

    return [
        { label: 'Tao lich', state: 'done' },
        {
            label: paid ? 'Da thanh toan' : pendingVerification ? 'Cho xac minh' : 'Cho thanh toan',
            state: paid || pendingVerification ? 'done' : cancelled ? 'muted' : 'active',
        },
        {
            label: confirmed ? 'Da xac nhan' : cancelled ? 'Da huy' : 'Cho xac nhan',
            state: confirmed ? 'done' : cancelled ? 'muted' : paid || pendingVerification ? 'active' : 'pending',
        },
        {
            label: completed ? 'Hoan thanh' : completionPending ? 'Cho xac nhan' : booking.zoom_link ? 'Co link hop' : 'Cho link hop',
            state: completed ? 'done' : completionPending ? 'active' : booking.zoom_link ? 'active' : cancelled ? 'muted' : 'pending',
        },
    ];
}

function Dashboard() {
    const navigate = useNavigate();
    const showToast = useToast();
    const {
        currentUser,
        isLoggedIn,
        bookings,
        reviews,
        bookingsLoading,
        bookingsError,
        refreshBookings,
        cancelBooking,
        confirmBookingCompletion,
        disputeBookingCompletion,
        loading,
        updateUser,
    } = useAuth();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [payBooking, setPayBooking] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [reviewBooking, setReviewBooking] = useState(null);
    const [profileForm, setProfileForm] = useState({ name: currentUser?.name || '' });
    const [passForm, setPassForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
    const [profileLoading, setProfileLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [disputeTarget, setDisputeTarget] = useState(null);
    const [nowMs] = useState(() => Date.now());

    useEffect(() => {
        if (!loading && !isLoggedIn) navigate('/');
    }, [loading, isLoggedIn, navigate]);

    useEffect(() => {
        setProfileForm({ name: currentUser?.name || '' });
    }, [currentUser]);

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles['ud-nav']}>
                    <div className={styles['ud-logo']}>Luna Arcana</div>
                    <button className={styles['ud-back']} onClick={() => navigate('/')}>Ve trang chu</button>
                </div>
                <div className={styles['dashboard-loading']}>
                    <div className={styles['dashboard-loading-card']}>
                        <div className={styles['loading-mark']}></div>
                        <h1>Dang tai tai khoan</h1>
                        <p>Chung toi dang dong bo lich dat va thong tin dang nhap cua ban.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isLoggedIn || !currentUser) return null;

    const initials = currentUser.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    const upcoming = bookings.filter(booking => ['confirmed', 'pending', 'completion_pending'].includes(booking.status));
    const history = bookings.filter(booking => booking.status === 'completed' || booking.status === 'cancelled');
    const completedCount = bookings.filter(booking => booking.status === 'completed').length;

    const canPayBooking = (booking) => {
        if (booking.payment_status !== 'unpaid') return false;
        if (booking.paid || !['pending', 'confirmed'].includes(booking.status)) return false;
        if (booking.status === 'pending' && booking.expires_at && new Date(booking.expires_at).getTime() <= nowMs) return false;

        return true;
    };

    const canCancelBooking = (booking) => (
        ['pending', 'confirmed'].includes(booking.status)
        && booking.latest_payment_status !== 'pending'
    );

    const canConfirmCompletion = (booking) => booking.status === 'completion_pending';

    async function handleConfirmCompletion(booking) {
        setActionLoading(`complete-${booking.booking_id}`);
        try {
            await confirmBookingCompletion(booking.booking_id);
            setSelectedBooking(null);
        } finally {
            setActionLoading('');
        }
    }

    async function handleDisputeCompletion() {
        if (!disputeTarget) return;

        setActionLoading(`dispute-${disputeTarget.booking_id}`);
        try {
            await disputeBookingCompletion(disputeTarget.booking_id);
            setDisputeTarget(null);
            setSelectedBooking(null);
        } finally {
            setActionLoading('');
        }
    }

    async function handleCancelBooking() {
        if (!cancelTarget) return;

        setActionLoading(`cancel-${cancelTarget.booking_id}`);
        try {
            await cancelBooking(cancelTarget.booking_id, cancelReason.trim());
            setCancelTarget(null);
            setCancelReason('');
        } finally {
            setActionLoading('');
        }
    }

    function openCancelModal(booking) {
        setCancelTarget(booking);
        setCancelReason('');
    }

    function closeCancelModal() {
        if (actionLoading.startsWith('cancel-')) return;
        setCancelTarget(null);
        setCancelReason('');
    }

    function openDisputeModal(booking) {
        setDisputeTarget(booking);
    }

    function closeDisputeModal() {
        if (actionLoading.startsWith('dispute-')) return;
        setDisputeTarget(null);
    }

    function renderActionModals() {
        return (
            <>
                {cancelTarget && (
                    <div className={styles['detail-overlay']} role="dialog" aria-modal="true">
                        <div className={`${styles['detail-modal']} ${styles['compact-modal']}`}>
                            <div className={styles['detail-head']}>
                                <div>
                                    <div className={styles['detail-kicker']}>Huy lich</div>
                                    <h2>{bookingCode(cancelTarget)}</h2>
                                </div>
                                <button className={styles['detail-close']} onClick={closeCancelModal} aria-label="Dong">x</button>
                            </div>
                            <div className={styles['confirm-body']}>
                                <p>Ban co chac muon huy lich nay khong? Neu co ly do, hay ghi lai de reader va admin nam duoc tinh huong.</p>
                                <textarea
                                    className={styles['modal-textarea']}
                                    value={cancelReason}
                                    onChange={event => setCancelReason(event.target.value)}
                                    placeholder="Ly do huy lich (tuy chon)"
                                    rows={4}
                                />
                            </div>
                            <div className={styles['detail-actions']}>
                                <button className={styles['bk-btn-ghost']} onClick={closeCancelModal} disabled={actionLoading.startsWith('cancel-')}>Dong</button>
                                <button className={styles['bk-btn-review']} onClick={handleCancelBooking} disabled={actionLoading === `cancel-${cancelTarget.booking_id}`}>
                                    {actionLoading === `cancel-${cancelTarget.booking_id}` ? 'Dang huy...' : 'Xac nhan huy'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {disputeTarget && (
                    <div className={styles['detail-overlay']} role="dialog" aria-modal="true">
                        <div className={`${styles['detail-modal']} ${styles['compact-modal']}`}>
                            <div className={styles['detail-head']}>
                                <div>
                                    <div className={styles['detail-kicker']}>Bao chua xem</div>
                                    <h2>{bookingCode(disputeTarget)}</h2>
                                </div>
                                <button className={styles['detail-close']} onClick={closeDisputeModal} aria-label="Dong">x</button>
                            </div>
                            <div className={styles['confirm-body']}>
                                <p>Ban xac nhan chua xem buoi nay? Lich se duoc dua ve trang thai da xac nhan de admin kiem tra lai voi reader.</p>
                            </div>
                            <div className={styles['detail-actions']}>
                                <button className={styles['bk-btn-ghost']} onClick={closeDisputeModal} disabled={actionLoading.startsWith('dispute-')}>Dong</button>
                                <button className={styles['bk-btn-review']} onClick={handleDisputeCompletion} disabled={actionLoading === `dispute-${disputeTarget.booking_id}`}>
                                    {actionLoading === `dispute-${disputeTarget.booking_id}` ? 'Dang gui...' : 'Bao chua xem'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    function closeDetailModal() {
        setSelectedBooking(null);
    }

    const tabs = [
        { id: 'upcoming', label: 'Lich sap toi' },
        { id: 'history', label: 'Lich su' },
        { id: 'reviews', label: 'Danh gia' },
        { id: 'profile', label: 'Tai khoan' },
    ];

    async function handleUpdateProfile() {
        if (!profileForm.name.trim()) {
            showToast('Vui long nhap ho ten.');
            return;
        }

        setProfileLoading(true);
        try {
            const res = await api.profile.update({ name: profileForm.name });
            updateUser(res.user);
            showToast('Da cap nhat thong tin.');
        } catch (error) {
            showToast(error.message);
        } finally {
            setProfileLoading(false);
        }
    }

    async function handleChangePassword() {
        if (!passForm.current_password || !passForm.new_password) {
            showToast('Vui long dien day du thong tin.');
            return;
        }

        if (passForm.new_password !== passForm.new_password_confirmation) {
            showToast('Xac nhan mat khau khong khop.');
            return;
        }

        setPassLoading(true);
        try {
            await api.profile.changePassword(passForm);
            showToast('Da doi mat khau thanh cong.');
            setPassForm({ current_password: '', new_password: '', new_password_confirmation: '' });
        } catch (error) {
            showToast(error.message);
        } finally {
            setPassLoading(false);
        }
    }

    async function copyBookingCode(booking) {
        try {
            await navigator.clipboard.writeText(bookingCode(booking));
            showToast('Da sao chep ma dat lich.');
        } catch {
            showToast(bookingCode(booking));
        }
    }

    function renderBookingCard(booking, mode = 'upcoming') {
        const alreadyReviewed = booking.reviewed || reviews.some(review => review.bookingId === booking.booking_id);

        return (
            <div key={`${mode}-${booking.booking_id}`} className={styles['bk-card']}>
                <div className={styles['bk-card-head']}>
                    <div className={styles['bk-status-row']}>
                        <span className={styles['bk-id']}>{bookingCode(booking)}</span>
                        <span className={`${styles['bk-status']} ${styles[booking.status]}`}>
                            <span className={styles['bk-status-dot']}></span>
                            {STATUS_LABEL[booking.status] || booking.status}
                        </span>
                        <span className={`${styles['bk-status']} ${booking.payment_status === 'paid' ? styles.paid : styles.pending}`}>
                            <span className={styles['bk-status-dot']}></span>
                            {paymentLabel(booking)}
                        </span>
                    </div>

                    {mode === 'upcoming' && canCancelBooking(booking) && (
                        <button
                            className={styles['bk-btn-ghost']}
                            onClick={() => openCancelModal(booking)}
                            disabled={actionLoading === `cancel-${booking.booking_id}`}
                        >
                            {actionLoading === `cancel-${booking.booking_id}` ? 'Dang huy...' : 'Huy lich'}
                        </button>
                    )}
                </div>

                <div className={styles['bk-card-body']}>
                    <div className={styles['bk-reader']}>
                        <span className={styles['bk-reader-em']}>{booking.readerEm}</span>
                        <div>
                            <div className={styles['bk-reader-name']}>{booking.reader}</div>
                            <div className={styles['bk-reader-type']}>{booking.svc}</div>
                        </div>
                    </div>
                    <div className={styles['bk-meta']}>
                        <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>Date</span>{booking.date}</div>
                        <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>Time</span>{booking.time}</div>
                        <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>Dur</span>{booking.dur}</div>
                        <div className={styles['bk-meta-row']}><span className={styles['bk-meta-icon']}>Fee</span><span className={styles['bk-price']}>{booking.price}</span></div>
                    </div>
                </div>

                <div className={styles['bk-actions']}>
                    <button className={styles['bk-btn-ghost']} onClick={() => setSelectedBooking(booking)}>
                        Chi tiet
                    </button>

                    {canPayBooking(booking) && (
                        <button className={styles['bk-btn-pay']} onClick={() => setPayBooking(booking)}>
                            {booking.latest_payment_status ? 'Thanh toan lai' : 'Thanh toan ngay'}
                        </button>
                    )}

                    {canConfirmCompletion(booking) && (
                        <>
                            <button className={styles['bk-btn-review']} onClick={() => handleConfirmCompletion(booking)}>
                                {actionLoading === `complete-${booking.booking_id}` ? 'Dang xu ly...' : 'Da xem xong'}
                            </button>
                            <button className={styles['bk-btn-ghost']} onClick={() => openDisputeModal(booking)} disabled={actionLoading === `dispute-${booking.booking_id}`}>
                                Chua xem
                            </button>
                        </>
                    )}

                    {booking.paid && booking.zoom_link ? (
                        <button className={styles['bk-btn-ghost']} onClick={() => window.open(booking.zoom_link)}>
                            Mo link hop
                        </button>
                    ) : mode === 'upcoming' && (
                        <button className={styles['bk-btn-ghost']} disabled>
                            Chua co link hop
                        </button>
                    )}

                    {mode === 'history' && booking.status === 'completed' && !alreadyReviewed && (
                        <button className={styles['bk-btn-review']} onClick={() => setReviewBooking(booking)}>
                            Viet danh gia
                        </button>
                    )}

                    {mode === 'history' && booking.status === 'completed' && alreadyReviewed && (
                        <span className={styles['reviewed-note']}>Da danh gia</span>
                    )}

                    <button className={styles['bk-btn-ghost']} onClick={() => copyBookingCode(booking)}>
                        Sao chep ma
                    </button>
                </div>
            </div>
        );
    }

    function renderDetailModal() {
        if (!selectedBooking) return null;

        return (
            <div className={styles['detail-overlay']} role="dialog" aria-modal="true">
                <div className={styles['detail-modal']}>
                    <div className={styles['detail-head']}>
                        <div>
                            <div className={styles['detail-kicker']}>Chi tiet lich</div>
                            <h2>{bookingCode(selectedBooking)}</h2>
                        </div>
                        <button className={styles['detail-close']} onClick={closeDetailModal} aria-label="Dong">x</button>
                    </div>

                    <div className={styles.timeline}>
                        {timeline(selectedBooking).map((item, index) => (
                            <div key={`${item.label}-${index}`} className={`${styles['timeline-step']} ${styles[item.state]}`}>
                                <span className={styles['timeline-dot']}></span>
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles['detail-note']}>
                        {nextActionText(selectedBooking)}
                    </div>

                    <div className={styles['detail-grid']}>
                        <div><span>Reader</span><strong>{selectedBooking.reader}</strong></div>
                        <div><span>Dich vu</span><strong>{selectedBooking.svc}</strong></div>
                        <div><span>Ngay</span><strong>{selectedBooking.date}</strong></div>
                        <div><span>Gio</span><strong>{selectedBooking.time}</strong></div>
                        <div><span>Thoi luong</span><strong>{selectedBooking.dur}</strong></div>
                        <div><span>Chi phi</span><strong>{selectedBooking.price}</strong></div>
                        <div><span>Trang thai lich</span><strong>{STATUS_LABEL[selectedBooking.status] || selectedBooking.status}</strong></div>
                        <div><span>Thanh toan</span><strong>{paymentLabel(selectedBooking)}</strong></div>
                        {selectedBooking.status === 'cancelled' && (
                            <>
                                <div><span>Nguoi huy</span><strong>{selectedBooking.cancelled_by || '-'}</strong></div>
                                <div><span>Ly do huy</span><strong>{selectedBooking.cancel_reason || '-'}</strong></div>
                            </>
                        )}
                        <div><span>Han giu lich</span><strong>{selectedBooking.expires_at ? new Date(selectedBooking.expires_at).toLocaleString('vi-VN') : '-'}</strong></div>
                        <div><span>Link hop</span><strong>{selectedBooking.zoom_link ? 'Da co' : 'Chua co'}</strong></div>
                    </div>

                    <div className={styles['detail-actions']}>
                        {canPayBooking(selectedBooking) && (
                            <button className={styles['bk-btn-pay']} onClick={() => { setPayBooking(selectedBooking); setSelectedBooking(null); }}>
                                Thanh toan ngay
                            </button>
                        )}
                        {canConfirmCompletion(selectedBooking) && (
                            <>
                                <button className={styles['bk-btn-review']} onClick={() => handleConfirmCompletion(selectedBooking)} disabled={actionLoading === `complete-${selectedBooking.booking_id}`}>
                                    {actionLoading === `complete-${selectedBooking.booking_id}` ? 'Dang xu ly...' : 'Da xem xong'}
                                </button>
                                <button className={styles['bk-btn-ghost']} onClick={() => openDisputeModal(selectedBooking)} disabled={actionLoading === `dispute-${selectedBooking.booking_id}`}>
                                    Chua xem
                                </button>
                            </>
                        )}
                        {selectedBooking.zoom_link && (
                            <button className={styles['bk-btn-ghost']} onClick={() => window.open(selectedBooking.zoom_link)}>
                                Mo link hop
                            </button>
                        )}
                        <button className={styles['bk-btn-ghost']} onClick={closeDetailModal}>
                            Dong
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles['ud-nav']}>
                <div className={styles['ud-logo']}>Luna Arcana</div>
                <button className={styles['ud-back']} onClick={() => navigate('/')}>Ve trang chu</button>
            </div>

            <div className={styles['ud-inner']}>
                <div className={styles['ud-header']}>
                    <div className={styles['ud-avatar']}>{initials}</div>
                    <div className={styles['ud-info']}>
                        <div className={styles['ud-welcome']}>Chao mung tro lai</div>
                        <div className={styles['ud-name']}>{currentUser.name}</div>
                        <div className={styles['ud-email']}>{currentUser.email}</div>
                    </div>
                    <div className={styles['ud-stats']}>
                        <div className={styles['ud-stat']}><div className={styles['ud-stat-val']}>{bookings.length}</div><div className={styles['ud-stat-lbl']}>Lich dat</div></div>
                        <div className={styles['ud-stat']}><div className={styles['ud-stat-val']}>{completedCount}</div><div className={styles['ud-stat-lbl']}>Hoan thanh</div></div>
                        <div className={styles['ud-stat']}><div className={styles['ud-stat-val']}>{reviews.length}</div><div className={styles['ud-stat-lbl']}>Danh gia</div></div>
                    </div>
                </div>

                <div className={styles['ud-tabs']}>
                    {tabs.map(tab => (
                        <button key={tab.id} className={`${styles['ud-tab']} ${activeTab === tab.id ? styles.active : ''}`} onClick={() => setActiveTab(tab.id)}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {bookingsError && (
                    <div className={styles['sync-alert']} role="alert">
                        <span>{bookingsError}</span>
                        <button onClick={() => refreshBookings()} disabled={bookingsLoading}>
                            {bookingsLoading ? 'Dang tai...' : 'Thu lai'}
                        </button>
                    </div>
                )}

                {activeTab === 'upcoming' && (
                    <div>
                        {!upcoming.length ? (
                            <div className={styles['bk-empty']}>
                                <div className={styles['bk-empty-icon']}>LA</div>
                                <div className={styles['bk-empty-text']}>Ban chua co lich dat sap toi nao.</div>
                                <button className="btn-primary" onClick={() => navigate('/#booking')}>Dat lich ngay</button>
                            </div>
                        ) : upcoming.map(booking => renderBookingCard(booking, 'upcoming'))}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div>
                        {!history.length ? (
                            <div className={styles['bk-empty']}>
                                <div className={styles['bk-empty-icon']}>BK</div>
                                <div className={styles['bk-empty-text']}>Chua co lich su dat bai nao.</div>
                            </div>
                        ) : history.map(booking => renderBookingCard(booking, 'history'))}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div>
                        {!reviews.length ? (
                            <div className={styles['bk-empty']}>
                                <div className={styles['bk-empty-icon']}>RV</div>
                                <div className={styles['bk-empty-text']}>Ban chua co danh gia nao. Hoan thanh mot buoi doc bai de chia se trai nghiem.</div>
                            </div>
                        ) : reviews.map((review, index) => (
                            <div key={`${review.bookingId}-${index}`} className={styles['my-review-card']}>
                                <div className={styles['mrc-top']}>
                                    <div className={styles['mrc-reader']}>
                                        <span className={styles['mrc-em']}>{review.readerEm}</span>
                                        <div className={styles['mrc-info']}>
                                            <div className={styles['mrc-name']}>{review.readerName}</div>
                                            <div className={styles['mrc-svc']}>{review.svc}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className={styles['mrc-stars']}>{'*'.repeat(review.stars)}</div>
                                        <div className={styles['mrc-date']}>{review.date}</div>
                                    </div>
                                </div>
                                <div className={styles['mrc-text']}>"{review.text}"</div>
                                {review.adminReply && (
                                    <div className={styles['admin-reply']}>
                                        <div className={styles['admin-reply-title']}>Phan hoi tu admin</div>
                                        <div>{review.adminReply}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div>
                        <div className={styles['bk-card']}>
                            <div className={styles['bk-card-head']}><span className={styles['section-label']}>Thong tin tai khoan</span></div>
                            <div className={styles['profile-panel']}>
                                <label className={styles['profile-label']}>Ho va ten</label>
                                <input className={styles['profile-input']} value={profileForm.name} onChange={event => setProfileForm({ name: event.target.value })} />
                                <label className={styles['profile-label']}>Email</label>
                                <input className={styles['profile-input']} value={currentUser.email} disabled />
                                <button className="btn-primary" onClick={handleUpdateProfile} disabled={profileLoading}>
                                    {profileLoading ? 'Dang luu...' : 'Luu thay doi'}
                                </button>
                            </div>
                        </div>

                        <div className={styles['bk-card']}>
                            <div className={styles['bk-card-head']}><span className={styles['section-label']}>Doi mat khau</span></div>
                            <div className={styles['profile-panel']}>
                                {[
                                    ['Mat khau hien tai', 'current_password'],
                                    ['Mat khau moi', 'new_password'],
                                    ['Xac nhan mat khau moi', 'new_password_confirmation'],
                                ].map(([label, key]) => (
                                    <div key={key}>
                                        <label className={styles['profile-label']}>{label}</label>
                                        <PasswordInput className={styles['profile-input']} value={passForm[key]} onChange={event => setPassForm(prev => ({ ...prev, [key]: event.target.value }))} />
                                    </div>
                                ))}
                                <button className="btn-primary" onClick={handleChangePassword} disabled={passLoading}>
                                    {passLoading ? 'Dang xu ly...' : 'Doi mat khau'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <PayModal booking={payBooking} onClose={() => setPayBooking(null)} />
            {renderDetailModal()}
            {renderActionModals()}
            <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} />
        </div>
    );
}

export default Dashboard;
