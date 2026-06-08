import { useState } from 'react';
import styles from './ReviewModal.module.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

function ReviewModal({ booking, onClose }) {
    const { markReviewed } = useAuth();
    const showToast = useToast();
    const [stars, setStars] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [text, setText] = useState('');
    const [success, setSuccess] = useState(false);

    if (!booking) return null;

    async function submit() {
    if (!stars) { showToast('Vui lòng chọn số sao đánh giá.'); return; }
    if (!text.trim()) { showToast('Vui lòng viết nhận xét của bạn.'); return; }

    try {
        await markReviewed(booking.booking_id, {  // dùng booking_id thật
            stars,
            text: text.trim(),
            readerEm:   booking.readerEm,
            readerName: booking.reader,
            svc:        booking.svc,
        });
        setSuccess(true);
        setTimeout(() => {
            onClose();
            setSuccess(false);
            setStars(0);
            setText('');
            showToast('✦ Cảm ơn bạn đã đánh giá!');
        }, 2000);
    } catch (e) {
        showToast(e.message);
    }
}

    return (
        <div className={`${styles['review-modal-bg']} ${styles.open}`} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles['review-modal']}>
                <div className={styles['review-modal-head']}>
                    <div className={styles['review-modal-title']}>✦ Đánh giá buổi đọc bài</div>
                    <button className={styles['review-close']} onClick={onClose}>✕</button>
                </div>

                {!success ? (
                    <div className={styles['review-body']}>
                        <div className={styles['review-for']}>
                            <span className={styles['review-for-em']}>{booking.readerEm}</span>
                            <div>
                                <div className={styles['review-for-name']}>{booking.reader}</div>
                                <div className={styles['review-for-svc']}>{booking.svc} · {booking.date}</div>
                            </div>
                        </div>

                        <div className={styles['review-stars-label']}>Đánh giá của bạn</div>
                        <div className={styles['review-stars']}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <span
                                    key={n}
                                    className={`${styles['review-star']} ${n <= (hovered || stars) ? styles.lit : ''}`}
                                    onClick={() => setStars(n)}
                                    onMouseEnter={() => setHovered(n)}
                                    onMouseLeave={() => setHovered(0)}
                                >★</span>
                            ))}
                        </div>

                        <label className={styles['review-label']}>Nhận xét của bạn</label>
                        <textarea
                            className={styles['review-textarea']}
                            placeholder="Chia sẻ trải nghiệm của bạn về buổi đọc bài này..."
                            value={text}
                            onChange={e => setText(e.target.value)}
                        />

                        <button className={styles['review-submit']} onClick={submit}>
                            Gửi đánh giá
                        </button>
                    </div>
                ) : (
                    <div className={`${styles['review-success']} ${styles.show}`}>
                        <div className={styles['review-success-icon']}>✨</div>
                        <div className={styles['review-success-title']}>Cảm ơn bạn!</div>
                        <div className={styles['review-success-sub']}>Đánh giá của bạn giúp chúng tôi ngày càng hoàn thiện hơn.</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReviewModal;