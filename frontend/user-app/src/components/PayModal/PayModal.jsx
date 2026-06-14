import { useEffect, useState } from 'react';

import styles from './PayModal.module.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

const DEFAULT_BANK_INFO = {
    bank: import.meta.env.VITE_BANK_NAME || 'Vietcombank',
    bin: import.meta.env.VITE_BANK_BIN || '970436',
    accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || '1234 5678 9012',
    accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || 'LUNA ARCANA',
    prefix: import.meta.env.VITE_BANK_TRANSFER_PREFIX || 'LUNA',
};

function PayModal({ booking, onClose }) {
    const { payBooking } = useAuth();
    const showToast = useToast();
    const [method, setMethod] = useState('vnpay');
    const [proofCode, setProofCode] = useState('');
    const [proofNote, setProofNote] = useState('');
    const [bankInfo, setBankInfo] = useState(DEFAULT_BANK_INFO);

    useEffect(() => {
        api.settings.payment()
            .then(data => setBankInfo({
                bank: data.bank_name || DEFAULT_BANK_INFO.bank,
                bin: data.bank_bin || DEFAULT_BANK_INFO.bin,
                accountNumber: data.bank_account_number || DEFAULT_BANK_INFO.accountNumber,
                accountName: data.bank_account_name || DEFAULT_BANK_INFO.accountName,
                prefix: data.bank_transfer_prefix || DEFAULT_BANK_INFO.prefix,
            }))
            .catch(() => { });
    }, []);

    if (!booking) return null;

    const transferContent = `${bankInfo.prefix} ${booking.id}`;
    const amount = Number(booking.amount || 0);
    const qrUrl = bankInfo.bin && bankInfo.accountNumber
        ? `https://img.vietqr.io/image/${encodeURIComponent(bankInfo.bin)}-${encodeURIComponent(bankInfo.accountNumber)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankInfo.accountName || '')}`
        : '';

    async function confirm() {
        try {
            if (method === 'bank' && !proofCode.trim()) {
                showToast('Vui long nhap ma giao dich hoac thoi gian chuyen khoan.');
                return;
            }

            await payBooking(
                booking.booking_id,
                method,
                method === 'bank'
                    ? { proof_code: proofCode.trim(), proof_note: proofNote.trim() }
                    : {}
            );

            if (method !== 'vnpay') {
                onClose();
                showToast('Da ghi nhan chuyen khoan. Admin se xac nhan trong 15 phut.');
            }
        } catch (e) {
            showToast(e.message || 'Thanh toan that bai');
        }
    }

    return (
        <div className={`${styles['pay-modal-bg']} ${styles.open}`} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles['pay-modal']}>
                <div className={styles['pay-modal-header']}>
                    <div>
                        <div className={styles['pay-modal-title']}>Thanh toan lich dat</div>
                        <div className={styles['pay-modal-sub']}>{booking.id}</div>
                    </div>
                    <button className={styles['pay-close']} onClick={onClose}>x</button>
                </div>

                <div className={styles['pay-summary']}>
                    <div className={styles['pay-summary-label']}>Chi tiet dat lich</div>
                    <div className={styles['pay-summary-row']}><span>Dich vu</span><span>{booking.svc}</span></div>
                    <div className={styles['pay-summary-row']}><span>Reader</span><span>{booking.reader}</span></div>
                    <div className={styles['pay-summary-row']}><span>Thoi gian</span><span>{booking.date} luc {booking.time}</span></div>
                    <div className={styles['pay-summary-row']}><span>Thoi luong</span><span>{booking.dur}</span></div>
                    <div className={styles['pay-summary-row']}>
                        <span>Tong thanh toan</span>
                        <span className={styles['pay-summary-val']}>{booking.price}</span>
                    </div>
                </div>

                <div className={styles['pay-methods']}>
                    <div className={styles['pay-methods-label']}>Chon phuong thuc thanh toan</div>
                    <div className={styles['pay-method-grid']}>
                        {[
                            { id: 'vnpay', icon: 'QR', label: 'VNPay QR' },
                            { id: 'bank', icon: 'BK', label: 'VietQR ngan hang' },
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
                        {qrUrl && (
                            <div className={styles['pay-vietqr']}>
                                <img src={qrUrl} alt="VietQR chuyen khoan" />
                                <div>Quet ma bang app ngan hang de tu dien so tien va noi dung.</div>
                            </div>
                        )}
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Ngan hang</span><span className={styles['pay-bank-val']}>{bankInfo.bank}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Bank BIN</span><span className={styles['pay-bank-val']}>{bankInfo.bin}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>So tai khoan</span><span className={styles['pay-bank-val']}>{bankInfo.accountNumber}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Chu tai khoan</span><span className={styles['pay-bank-val']}>{bankInfo.accountName}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Noi dung CK</span><span className={styles['pay-bank-val']}>{transferContent}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>So tien</span><span className={styles['pay-bank-val']}>{booking.price}</span></div>
                        <input
                            className={styles['pay-input']}
                            type="text"
                            placeholder="Ma giao dich hoac thoi gian chuyen khoan"
                            value={proofCode}
                            onChange={e => setProofCode(e.target.value)}
                        />
                        <textarea
                            className={styles['pay-textarea']}
                            placeholder="Ghi chu them cho admin (tuy chon)"
                            value={proofNote}
                            onChange={e => setProofNote(e.target.value)}
                        />
                    </div>
                )}

                <button className={styles['pay-confirm-btn']} onClick={confirm}>
                    {method === 'vnpay' ? 'Xac nhan thanh toan qua VNPay' : 'Toi da chuyen khoan'}
                </button>
                <div className={styles['pay-note']}>
                    Sau khi thanh toan, chung toi se xac nhan trong vong 15 phut qua email cua ban.
                </div>
            </div>
        </div>
    );
}

export default PayModal;
