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
    paymentVnpayEnabled: false,
    paymentVnpayAdminEnabled: false,
    vnpayGatewayConfigured: false,
    paymentBankEnabled: false,
    paymentMomoEnabled: false,
    paymentMomoAdminEnabled: false,
    momoGatewayConfigured: false,
    momoPhone: '',
    momoAccountName: '',
    momoPrefix: 'MOMO',
};

function PayModal({ booking, onClose }) {
    const { payBooking } = useAuth();
    const showToast = useToast();
    const [method, setMethod] = useState('vnpay');
    const [proofCode, setProofCode] = useState('');
    const [proofNote, setProofNote] = useState('');
    const [bankInfo, setBankInfo] = useState(DEFAULT_BANK_INFO);
    const [settingsLoading, setSettingsLoading] = useState(true);
    const [settingsError, setSettingsError] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let active = true;

        api.settings.payment()
            .then(data => {
                if (!active) return;

                setBankInfo({
                    bank: data.bank_name || DEFAULT_BANK_INFO.bank,
                    bin: data.bank_bin || DEFAULT_BANK_INFO.bin,
                    accountNumber: data.bank_account_number || DEFAULT_BANK_INFO.accountNumber,
                    accountName: data.bank_account_name || DEFAULT_BANK_INFO.accountName,
                    prefix: data.bank_transfer_prefix || DEFAULT_BANK_INFO.prefix,
                    paymentVnpayAdminEnabled: data.payment_vnpay_enabled !== false,
                    paymentVnpayEnabled: data.payment_vnpay_enabled !== false && data.payment_vnpay_gateway_configured !== false,
                    vnpayGatewayConfigured: data.payment_vnpay_gateway_configured !== false,
                    paymentBankEnabled: data.payment_bank_enabled !== false,
                    paymentMomoAdminEnabled: data.payment_momo_enabled === true,
                    paymentMomoEnabled: data.payment_momo_enabled === true && data.payment_momo_gateway_configured === true,
                    momoGatewayConfigured: data.payment_momo_gateway_configured === true,
                    momoPhone: data.momo_phone || DEFAULT_BANK_INFO.momoPhone,
                    momoAccountName: data.momo_account_name || DEFAULT_BANK_INFO.momoAccountName,
                    momoPrefix: data.momo_transfer_prefix || DEFAULT_BANK_INFO.momoPrefix,
                });
            })
            .catch(() => {
                if (active) setSettingsError(true);
            })
            .finally(() => {
                if (active) setSettingsLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const available = [
            bankInfo.paymentVnpayEnabled && 'vnpay',
            bankInfo.paymentBankEnabled && 'bank',
            bankInfo.paymentMomoEnabled && 'momo',
        ].filter(Boolean);

        if (!available.includes(method) && available[0]) {
            setMethod(available[0]);
        }
    }, [bankInfo.paymentBankEnabled, bankInfo.paymentMomoEnabled, bankInfo.paymentVnpayEnabled, method]);

    if (!booking) return null;

    const enabledMethods = [
        bankInfo.paymentVnpayEnabled && { id: 'vnpay', icon: 'QR', label: 'VNPay QR' },
        bankInfo.paymentBankEnabled && { id: 'bank', icon: 'BK', label: 'VietQR ngan hang' },
        bankInfo.paymentMomoEnabled && { id: 'momo', icon: 'MM', label: 'MoMo Gateway' },
    ].filter(Boolean);
    const selectedMethodAvailable = enabledMethods.some(m => m.id === method);
    const activeMethod = selectedMethodAvailable ? method : enabledMethods[0]?.id || '';

    const bookingRef = booking.id || `BK-${String(booking.booking_id).padStart(4, '0')}`;
    const transferContent = `${activeMethod === 'momo' ? bankInfo.momoPrefix : bankInfo.prefix} ${bookingRef}`;
    const amount = Number(booking.amount || 0);
    const qrUrl = bankInfo.bin && bankInfo.accountNumber
        ? `https://img.vietqr.io/image/${encodeURIComponent(bankInfo.bin)}-${encodeURIComponent(bankInfo.accountNumber)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankInfo.accountName || '')}`
        : '';

    async function confirm() {
        if (submitting) return;

        try {
            if (!activeMethod) {
                showToast('Hiện chưa có phương thức thanh toán khả dụng.');
                return;
            }

            if (activeMethod === 'bank' && !proofCode.trim()) {
                showToast('Vui lòng nhập mã giao dịch hoặc thời gian chuyển tiền.');
                return;
            }

            setSubmitting(true);
            await payBooking(
                booking.booking_id,
                activeMethod,
                activeMethod === 'bank'
                    ? { proof_code: proofCode.trim(), proof_note: proofNote.trim() }
                    : {}
            );

            if (activeMethod !== 'vnpay') {
                onClose();
                showToast('Đã ghi nhận chuyển khoản. Quản trị viên sẽ xác nhận trong 15 phút.');
            }
        } catch (e) {
            setSubmitting(false);
            showToast(e.message || 'Thanh toán thất bại');
        }
    }

    return (
        <div className={`${styles['pay-modal-bg']} ${styles.open}`} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles['pay-modal']}>
                <div className={styles['pay-modal-header']}>
                    <div>
                        <div className={styles['pay-modal-title']}>Thanh toán lịch đặt</div>
                        <div className={styles['pay-modal-sub']}>{bookingRef}</div>
                    </div>
                    <button className={styles['pay-close']} onClick={onClose}>x</button>
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
                        {enabledMethods.map(m => (
                            <button
                                key={m.id}
                                className={`${styles['pay-method']} ${activeMethod === m.id ? styles.active : ''}`}
                                onClick={() => setMethod(m.id)}
                            >
                                <span className={styles['pay-method-icon']}>{m.icon}</span>
                                <span className={styles['pay-method-name']}>{m.label}</span>
                            </button>
                        ))}
                    </div>
                    {settingsLoading && (
                        <div className={styles['pay-note']}>Dang tai phuong thuc thanh toan...</div>
                    )}
                    {settingsError && (
                        <div className={styles['pay-note']}>Khong tai duoc cau hinh thanh toan. Vui long dong va thu lai.</div>
                    )}
                    {!settingsLoading && !settingsError && enabledMethods.length === 0 && (
                        <div className={styles['pay-note']}>Hiện chưa có phương thức thanh toán khả dụng. Vui lòng liên hệ quản trị viên.</div>
                    )}
                    {bankInfo.paymentVnpayAdminEnabled && !bankInfo.vnpayGatewayConfigured && (
                        <div className={styles['pay-note']}>VNPay đang bật trong phần quản trị nhưng chưa cấu hình cổng thanh toán, tạm thời chưa thể thanh toán tự động.</div>
                    )}
                    {bankInfo.paymentMomoAdminEnabled && !bankInfo.momoGatewayConfigured && (
                        <div className={styles['pay-note']}>MoMo đang bật trong phần quản trị nhưng chưa cấu hình cổng thanh toán, tạm thời chưa thể thanh toán tự động.</div>
                    )}
                </div>

                {activeMethod === 'bank' && (
                    <div className={`${styles['pay-bank-info']} ${styles.show}`}>
                        {qrUrl && (
                            <div className={styles['pay-vietqr']}>
                                <img src={qrUrl} alt="VietQR chuyen khoan" />
                                <div>Quét mã bằng ứng dụng ngân hàng để tự điền số tiền và nội dung.</div>
                            </div>
                        )}
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Ngân hàng</span><span className={styles['pay-bank-val']}>{bankInfo.bank}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Mã ngân hàng (BIN)</span><span className={styles['pay-bank-val']}>{bankInfo.bin}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Số tài khoản</span><span className={styles['pay-bank-val']}>{bankInfo.accountNumber}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Chủ tài khoản</span><span className={styles['pay-bank-val']}>{bankInfo.accountName}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Nội dung chuyển khoản</span><span className={styles['pay-bank-val']}>{transferContent}</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Số tiền</span><span className={styles['pay-bank-val']}>{booking.price}</span></div>
                        <input
                            className={styles['pay-input']}
                            type="text"
                            placeholder="Mã giao dịch hoặc thời gian chuyển khoản"
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

                {activeMethod === 'momo' && (
                    <div className={`${styles['pay-bank-info']} ${styles.show}`}>
                        <div className={styles['pay-vietqr']}>
                            <div>Bạn sẽ được chuyển sang cổng thanh toán MoMo để xác nhận giao dịch.</div>
                        </div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Cổng thanh toán</span><span className={styles['pay-bank-val']}>MoMo</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>So tien</span><span className={styles['pay-bank-val']}>{booking.price}</span></div>
                    </div>
                )}

                <button className={styles['pay-confirm-btn']} onClick={confirm} disabled={settingsLoading || settingsError || submitting || !activeMethod}>
                    {submitting ? 'Đang xử lý...' : activeMethod === 'vnpay' ? 'Xác nhận thanh toán qua VNPay' : activeMethod === 'bank' ? 'Tôi đã chuyển khoản' : activeMethod === 'momo' ? 'Tiếp tục thanh toán qua MoMo' : 'Không có phương thức thanh toán'}
                </button>
                <div className={styles['pay-note']}>
                    Sau khi thanh toán, chúng tôi sẽ xác nhận trong vòng 15 phút qua email của bạn.
                </div>
            </div>
        </div>
    );
}

export default PayModal;
