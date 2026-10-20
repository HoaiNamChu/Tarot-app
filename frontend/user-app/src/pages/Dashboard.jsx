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
    pending: 'Chờ thanh toán',
    confirmed: 'Đã xác nhận',
    completion_pending: 'Chờ bạn xác nhận',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    expired: 'Hết hạn thanh toán',
};

const PAYMENT_LABEL = {
    paid: 'Đã thanh toán',
    pending_verification: 'Chờ xác minh',
    refund_pending: 'Chờ hoàn tiền',
    refunded: 'Đã hoàn tiền',
    unpaid: 'Chưa thanh toán',
};

function bookingCode(booking) {
    return `BK-${String(booking.booking_id).padStart(4, '0')}`;
}

function openMeetingLink(link) {
    try {
        const url = new URL(link);
        if (url.protocol === 'https:') {
            window.open(url.href, '_blank', 'noopener,noreferrer');
        }
    } catch {
        // Ignore malformed or non-HTTPS meeting links.
    }
}

function paymentLabel(booking) {
    if (booking.payment_status === 'paid') return PAYMENT_LABEL.paid;
    if (booking.payment_status === 'pending_verification') return PAYMENT_LABEL.pending_verification;
    if (booking.payment_status === 'refund_pending') return PAYMENT_LABEL.refund_pending;
    if (booking.payment_status === 'refunded') return PAYMENT_LABEL.refunded;
    if (booking.latest_payment_status === 'pending') return 'Đang chờ cổng thanh toán';
    if (booking.latest_payment_status === 'failed') return 'Thanh toán thất bại';
    if (booking.latest_payment_status === 'expired') return 'Hết hạn thanh toán';
    return PAYMENT_LABEL.unpaid;
}

function nextActionText(booking) {
    if (booking.status === 'cancelled' && booking.payment_status === 'refund_pending') return 'Lịch đã hủy. Khoản thanh toán đang chờ quản trị viên hoàn tiền.';
    if (booking.status === 'cancelled') return 'Lịch đã hủy. Bạn có thể đặt lại nếu vẫn cần tư vấn.';
    if (booking.status === 'completed') return 'Buổi đọc đã hoàn thành. Bạn có thể gửi đánh giá nếu chưa đánh giá.';
    if (booking.status === 'completion_pending') return 'Reader đã đánh dấu buổi xem đã diễn ra. Vui lòng xác nhận nếu bạn đã xem, hoặc báo chưa xem để quản trị viên kiểm tra lại.';
    if (booking.payment_status === 'pending_verification') return 'Thanh toán đang chờ quản trị viên xác minh. Bạn không cần thanh toán lại lúc này.';
    if (booking.payment_status !== 'paid') return 'Vui lòng hoàn tất thanh toán trước khi hết hạn giữ lịch.';
    if (booking.status === 'pending') return 'Đã ghi nhận thanh toán. Lịch đang chờ xác nhận.';
    if (booking.status === 'confirmed' && !booking.zoom_link) return 'Lịch đã xác nhận. Đường dẫn phòng họp sẽ được cập nhật trước buổi hẹn.';
    if (booking.status === 'confirmed' && booking.zoom_link) return 'Lịch đã sẵn sàng. Bạn có thể vào phòng họp theo đường dẫn đã cập nhật.';
    return 'Theo dõi trạng thái lịch trong trang cá nhân của bạn.';
}

function timeline(booking) {
    const paid = booking.payment_status === 'paid';
    const pendingVerification = booking.payment_status === 'pending_verification';
    const cancelled = booking.status === 'cancelled';
    const completed = booking.status === 'completed';
    const completionPending = booking.status === 'completion_pending';
    const confirmed = booking.status === 'confirmed' || completionPending || completed;

    return [
        { label: 'Tạo lịch', state: 'done' },
        {
            label: paid ? 'Đã thanh toán' : pendingVerification ? 'Chờ xác minh' : 'Chờ thanh toán',
            state: paid || pendingVerification ? 'done' : cancelled ? 'muted' : 'active',
        },
        {
            label: confirmed ? 'Đã xác nhận' : cancelled ? 'Đã hủy' : 'Chờ xác nhận',
            state: confirmed ? 'done' : cancelled ? 'muted' : paid || pendingVerification ? 'active' : 'pending',
        },
        {
            label: completed ? 'Hoàn thành' : completionPending ? 'Chờ xác nhận' : booking.zoom_link ? 'Có đường dẫn họp' : 'Chờ đường dẫn họp',
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
                    <button className={styles['ud-back']} onClick={() => navigate('/')}>Về trang chủ</button>
                </div>
                <div className={styles['dashboard-loading']}>
                    <div className={styles['dashboard-loading-card']}>
                        <div className={styles['loading-mark']}></div>
                        <h1>Đang tải tài khoản</h1>
                        <p>Chúng tôi đang đồng bộ lịch đặt và thông tin đăng nhập của bạn.</p>
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
                                    <div className={styles['detail-kicker']}>Hủy lịch</div>
                                    <h2>{bookingCode(cancelTarget)}</h2>
                                </div>
                                <button className={styles['detail-close']} onClick={closeCancelModal} aria-label="Dong">x</button>
                            </div>
                            <div className={styles['confirm-body']}>
                                <p>Bạn có chắc muốn hủy lịch này không? Nếu có lý do, hãy ghi lại để reader và quản trị viên nắm được tình huống.</p>
                                <textarea
                                    className={styles['modal-textarea']}
                                    value={cancelReason}
                                    onChange={event => setCancelReason(event.target.value)}
                                    placeholder="Lý do hủy lịch (tùy chọn)"
                                    rows={4}
                                />
                            </div>
                            <div className={styles['detail-actions']}>
                                <button className={styles['bk-btn-ghost']} onClick={closeCancelModal} disabled={actionLoading.startsWith('cancel-')}>Dong</button>
                                <button className={styles['bk-btn-review']} onClick={handleCancelBooking} disabled={actionLoading === `cancel-${cancelTarget.booking_id}`}>
                                    {actionLoading === `cancel-${cancelTarget.booking_id}` ? 'Đang hủy...' : 'Xác nhận hủy'}
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
                                    <div className={styles['detail-kicker']}>Báo chưa xem</div>
                                    <h2>{bookingCode(disputeTarget)}</h2>
                                </div>
                                <button className={styles['detail-close']} onClick={closeDisputeModal} aria-label="Dong">x</button>
                            </div>
                            <div className={styles['confirm-body']}>
                                <p>Bạn xác nhận chưa xem buổi này? Lịch sẽ được chuyển về trạng thái đã xác nhận để quản trị viên kiểm tra lại với reader.</p>
                            </div>
                            <div className={styles['detail-actions']}>
                                <button className={styles['bk-btn-ghost']} onClick={closeDisputeModal} disabled={actionLoading.startsWith('dispute-')}>Dong</button>
                                <button className={styles['bk-btn-review']} onClick={handleDisputeCompletion} disabled={actionLoading === `dispute-${disputeTarget.booking_id}`}>
                                    {actionLoading === `dispute-${disputeTarget.booking_id}` ? 'Đang gửi...' : 'Báo chưa xem'}
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
        { id: 'upcoming', label: 'Lịch sắp tới' },
        { id: 'history', label: 'Lịch sử' },
        { id: 'reviews', label: 'Đánh giá' },
        { id: 'profile', label: 'Tài khoản' },
    ];

    async function handleUpdateProfile() {
        if (!profileForm.name.trim()) {
            showToast('Vui lòng nhập họ tên.');
            return;
        }

        setProfileLoading(true);
        try {
            const res = await api.profile.update({ name: profileForm.name });
            updateUser(res.user);
            showToast('Đã cập nhật thông tin.');
        } catch (error) {
            showToast(error.message);
        } finally {
            setProfileLoading(false);
        }
    }

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
        } catch (error) {
            showToast(error.message);
        } finally {
            setPassLoading(false);
        }
    }

    async function copyBookingCode(booking) {
        try {
            await navigator.clipboard.writeText(bookingCode(booking));
            showToast('Đã sao chép mã đặt lịch.');
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
                            {actionLoading === `cancel-${booking.booking_id}` ? 'Đang hủy...' : 'Hủy lịch'}
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
                            {booking.latest_payment_status ? 'Thanh toán lại' : 'Thanh toán ngay'}
                        </button>
                    )}

                    {canConfirmCompletion(booking) && (
                        <>
                            <button className={styles['bk-btn-review']} onClick={() => handleConfirmCompletion(booking)}>
                                {actionLoading === `complete-${booking.booking_id}` ? 'Đang xử lý...' : 'Đã xem xong'}
                            </button>
                            <button className={styles['bk-btn-ghost']} onClick={() => openDisputeModal(booking)} disabled={actionLoading === `dispute-${booking.booking_id}`}>
                                Chưa xem
                            </button>
                        </>
                    )}

                    {booking.paid && booking.zoom_link ? (
                        <button className={styles['bk-btn-ghost']} onClick={() => openMeetingLink(booking.zoom_link)}>
                            Mo link hop
                        </button>
                    ) : mode === 'upcoming' && (
                        <button className={styles['bk-btn-ghost']} disabled>
                            Chưa có đường dẫn họp
                        </button>
                    )}

                    {mode === 'history' && booking.status === 'completed' && !alreadyReviewed && (
                        <button className={styles['bk-btn-review']} onClick={() => setReviewBooking(booking)}>
                            Viết đánh giá
                        </button>
                    )}

                    {mode === 'history' && booking.status === 'completed' && alreadyReviewed && (
                        <span className={styles['reviewed-note']}>Đã đánh giá</span>
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
                            <div className={styles['detail-kicker']}>Chi tiết lịch</div>
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
                        <div><span>Dịch vụ</span><strong>{selectedBooking.svc}</strong></div>
                        <div><span>Ngày</span><strong>{selectedBooking.date}</strong></div>
                        <div><span>Giờ</span><strong>{selectedBooking.time}</strong></div>
                        <div><span>Thời lượng</span><strong>{selectedBooking.dur}</strong></div>
                        <div><span>Chi phí</span><strong>{selectedBooking.price}</strong></div>
                        <div><span>Trạng thái lịch</span><strong>{STATUS_LABEL[selectedBooking.status] || selectedBooking.status}</strong></div>
                        <div><span>Thanh toán</span><strong>{paymentLabel(selectedBooking)}</strong></div>
                        {selectedBooking.status === 'cancelled' && (
                            <>
                                <div><span>Người hủy</span><strong>{selectedBooking.cancelled_by || '-'}</strong></div>
                                <div><span>Lý do hủy</span><strong>{selectedBooking.cancel_reason || '-'}</strong></div>
                            </>
                        )}
                        <div><span>Hạn giữ lịch</span><strong>{selectedBooking.expires_at ? new Date(selectedBooking.expires_at).toLocaleString('vi-VN') : '-'}</strong></div>
                        <div><span>Đường dẫn họp</span><strong>{selectedBooking.zoom_link ? 'Đã có' : 'Chưa có'}</strong></div>
                    </div>

                    <div className={styles['detail-actions']}>
                        {canPayBooking(selectedBooking) && (
                            <button className={styles['bk-btn-pay']} onClick={() => { setPayBooking(selectedBooking); setSelectedBooking(null); }}>
                                Thanh toán ngay
                            </button>
                        )}
                        {canConfirmCompletion(selectedBooking) && (
                            <>
                                <button className={styles['bk-btn-review']} onClick={() => handleConfirmCompletion(selectedBooking)} disabled={actionLoading === `complete-${selectedBooking.booking_id}`}>
                                    {actionLoading === `complete-${selectedBooking.booking_id}` ? 'Đang xử lý...' : 'Đã xem xong'}
                                </button>
                                <button className={styles['bk-btn-ghost']} onClick={() => openDisputeModal(selectedBooking)} disabled={actionLoading === `dispute-${selectedBooking.booking_id}`}>
                                    Chưa xem
                                </button>
                            </>
                        )}
                        {selectedBooking.zoom_link && (
                            <button className={styles['bk-btn-ghost']} onClick={() => openMeetingLink(selectedBooking.zoom_link)}>
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
                <button className={styles['ud-back']} onClick={() => navigate('/')}>Về trang chủ</button>
            </div>

            <div className={styles['ud-inner']}>
                <div className={styles['ud-header']}>
                    <div className={styles['ud-avatar']}>{initials}</div>
                    <div className={styles['ud-info']}>
                        <div className={styles['ud-welcome']}>Chào mừng trở lại</div>
                        <div className={styles['ud-name']}>{currentUser.name}</div>
                        <div className={styles['ud-email']}>{currentUser.email}</div>
                    </div>
                    <div className={styles['ud-stats']}>
                        <div className={styles['ud-stat']}><div className={styles['ud-stat-val']}>{bookings.length}</div><div className={styles['ud-stat-lbl']}>Lịch đặt</div></div>
                        <div className={styles['ud-stat']}><div className={styles['ud-stat-val']}>{completedCount}</div><div className={styles['ud-stat-lbl']}>Hoàn thành</div></div>
                        <div className={styles['ud-stat']}><div className={styles['ud-stat-val']}>{reviews.length}</div><div className={styles['ud-stat-lbl']}>Đánh giá</div></div>
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
                            {bookingsLoading ? 'Đang tải...' : 'Thử lại'}
                        </button>
                    </div>
                )}

                {activeTab === 'upcoming' && (
                    <div>
                        {!upcoming.length ? (
                            <div className={styles['bk-empty']}>
                                <div className={styles['bk-empty-icon']}>LA</div>
                                <div className={styles['bk-empty-text']}>Bạn chưa có lịch đặt sắp tới.</div>
                                <button className="btn-primary" onClick={() => navigate('/#booking')}>Đặt lịch ngay</button>
                            </div>
                        ) : upcoming.map(booking => renderBookingCard(booking, 'upcoming'))}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div>
                        {!history.length ? (
                            <div className={styles['bk-empty']}>
                                <div className={styles['bk-empty-icon']}>BK</div>
                                <div className={styles['bk-empty-text']}>Chưa có lịch sử đặt bài nào.</div>
                            </div>
                        ) : history.map(booking => renderBookingCard(booking, 'history'))}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div>
                        {!reviews.length ? (
                            <div className={styles['bk-empty']}>
                                <div className={styles['bk-empty-icon']}>RV</div>
                                <div className={styles['bk-empty-text']}>Bạn chưa có đánh giá nào. Hãy hoàn thành một buổi đọc bài để chia sẻ trải nghiệm.</div>
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
                                        <div className={styles['admin-reply-title']}>Phản hồi từ quản trị viên</div>
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
                            <div className={styles['bk-card-head']}><span className={styles['section-label']}>Thông tin tài khoản</span></div>
                            <div className={styles['profile-panel']}>
                                <label className={styles['profile-label']}>Họ và tên</label>
                                <input className={styles['profile-input']} value={profileForm.name} onChange={event => setProfileForm({ name: event.target.value })} />
                                <label className={styles['profile-label']}>Email</label>
                                <input className={styles['profile-input']} value={currentUser.email} disabled />
                                <button className="btn-primary" onClick={handleUpdateProfile} disabled={profileLoading}>
                                    {profileLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>

                        <div className={styles['bk-card']}>
                            <div className={styles['bk-card-head']}><span className={styles['section-label']}>Đổi mật khẩu</span></div>
                            <div className={styles['profile-panel']}>
                                {[
                                    ['Mật khẩu hiện tại', 'current_password'],
                                    ['Mật khẩu mới', 'new_password'],
                                    ['Xác nhận mật khẩu mới', 'new_password_confirmation'],
                                ].map(([label, key]) => (
                                    <div key={key}>
                                        <label className={styles['profile-label']}>{label}</label>
                                        <PasswordInput className={styles['profile-input']} value={passForm[key]} onChange={event => setPassForm(prev => ({ ...prev, [key]: event.target.value }))} />
                                    </div>
                                ))}
                                <button className="btn-primary" onClick={handleChangePassword} disabled={passLoading}>
                                    {passLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
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
