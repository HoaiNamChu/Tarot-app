import { useState } from 'react';


import styles from './PayModal.module.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// function buildQRPattern() {
//     return Array.from({ length: 49 }, (_, i) => {
//         const row = Math.floor(i / 7), col = i % 7;
//         const inCorner = (row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3);
//         return inCorner || Math.random() > 0.45;
//     });
// }

function PayModal({ booking, onClose }) {
    const { payBooking } = useAuth();
    const showToast = useToast();
    const [method, setMethod] = useState('vnpay');


    if (!booking) return null;


    async function confirm() {

        try {

            await payBooking(
                booking.booking_id,
                method
            );

            if (method !== 'vnpay') {

                const message = 'Đã ghi nhận chuyển khoản. Admin sẽ xác nhận trong 15 phút.';

                onClose();

                showToast(message);
            }

        } catch (e) {

            showToast(
                e.message || 'Thanh toán thất bại'
            );
        }
    }

    return (
        <div className={`${styles['pay-modal-bg']} ${styles.open}`} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles['pay-modal']}>
                <div className={styles['pay-modal-header']}>
                    <div>
                        <div className={styles['pay-modal-title']}>Thanh toán lịch đặt</div>
                        <div className={styles['pay-modal-sub']}>{booking.id}</div>
                    </div>
                    <button className={styles['pay-close']} onClick={onClose}>✕</button>
                </div>

                <div className={styles['pay-summary']}>
                    <div className={styles['pay-summary-label']}>Chi tiết đặt lịch</div>
                    <div className={styles['pay-summary-row']}><span>Dịch vụ</span><span>{booking.svc}</span></div>
                    <div className={styles['pay-summary-row']}><span>Reader</span><span>{booking.reader}</span></div>
                    <div className={styles['pay-summary-row']}><span>Thời gian</span><span>{booking.date} lúc {booking.time}</span></div>
                    <div className={styles['pay-summary-row']}><span>Thời lượng</span><span>{booking.dur}</span></div>
                    <div className={styles['pay-summary-row']}>
                        <span>Tổng thanh toán</span>
                        <span className={styles['pay-summary-val']}>{booking.price}</span>
                    </div>
                </div>

                <div className={styles['pay-methods']}>
                    <div className={styles['pay-methods-label']}>Chọn phương thức thanh toán</div>
                    <div className={styles['pay-method-grid']}>
                        {[
                            { id: 'vnpay', icon: '📱', label: 'VNPay QR' },
                            { id: 'bank', icon: '🏦', label: 'Chuyển khoản' },
                        ].map(m => (
                            <button
                                key={m.id}
                                className={`${styles['pay-method']} ${method === m.id ? styles.active : ''}`}
                                onClick={() => setMethod(m.id)}
                            >
                                <span className={styles['pay-method-icon']}>{m.icon}</span>
                                <span className={styles['pay-method-name']}>{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {method === 'bank' && (
                    <div className={`${styles['pay-bank-info']} ${styles.show}`}>
                        <div className={styles['pay-bank-row']}>
                            <span className={styles['pay-bank-key']}>Ngân hàng</span>
                            <span className={styles['pay-bank-val']}>Vietcombank</span>
                        </div>
                        <div className={styles['pay-bank-row']}>
                            <span className={styles['pay-bank-key']}>Số tài khoản</span>
                            <span className={styles['pay-bank-val']}>1234 5678 9012</span>
                        </div>
                        <div className={styles['pay-bank-row']}>
                            <span className={styles['pay-bank-key']}>Chủ tài khoản</span>
                            <span className={styles['pay-bank-val']}>LUNA ARCANA</span>
                        </div>
                        <div className={styles['pay-bank-row']}>
                            <span className={styles['pay-bank-key']}>Nội dung CK</span>
                            <span className={styles['pay-bank-val']}>LUNA {booking.id}</span>
                        </div>
                        <div className={styles['pay-bank-row']}>
                            <span className={styles['pay-bank-key']}>Số tiền</span>
                            <span className={styles['pay-bank-val']}>{booking.price}</span>
                        </div>
                    </div>
                )}


                <button className={styles['pay-confirm-btn']} onClick={confirm}>
                    {method === 'vnpay' ? 'Xác nhận thanh toán qua VNPay' : 'Tôi đã chuyển khoản'}
                </button>
                <div className={styles['pay-note']}>
                    Sau khi thanh toán, chúng tôi sẽ xác nhận trong vòng 15 phút qua email của bạn.
                </div>
            </div>
        </div>
    );
}

export default PayModal;
