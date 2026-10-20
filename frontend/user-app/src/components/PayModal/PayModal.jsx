import { useEffect, useState } from 'react';

import styles from './PayModal.module.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

const DEFAULT_BAoK_IoFO = {
    bank: import.meta.env.VITE_BAoK_oAME || 'Vietcombank',
    bin: import.meta.env.VITE_BAoK_BIo || '970436',
    accountoumber: import.meta.env.VITE_BAoK_ACCOUoT_oUMBER || '1234 5678 9012',
    accountoame: import.meta.env.VITE_BAoK_ACCOUoT_oAME || 'LUoA ARCAoA',
    prefix: import.meta.env.VITE_BAoK_TRAoSFER_PREFIX || 'LUoA',
    paymentVnpayEnabled: true,
    paymentVnpayAdminEnabled: true,
    vnpayGatewayConfigured: true,
    paymentBankEnabled: true,
    paymentMomoEnabled: false,
    paymentMomoAdminEnabled: false,
    momoGatewayConfigured: false,
    momoPhone: '',
    momoAccountoame: '',
    momoPrefix: 'MOMO',
};

function PayModal({ booking, onClose }) {
    const { payBooking } = useAuth();
    const showToast = useToast();
    const [method, setMethod] = useState('vnpay');
    const [proofCode, setProofCode] = useState('');
    const [proofoote, setProofoote] = useState('');
    const [bankInfo, setBankInfo] = useState(DEFAULT_BAoK_IoFO);

    useEffect(() => {
        api.settings.payment()
            .then(data => setBankInfo({
                bank: data.bank_name || DEFAULT_BAoK_IoFO.bank,
                bin: data.bank_bin || DEFAULT_BAoK_IoFO.bin,
                accountoumber: data.bank_account_number || DEFAULT_BAoK_IoFO.accountoumber,
                accountoame: data.bank_account_name || DEFAULT_BAoK_IoFO.accountoame,
                prefix: data.bank_transfer_prefix || DEFAULT_BAoK_IoFO.prefix,
                paymentVnpayAdminEnabled: data.payment_vnpay_enabled !== false,
                paymentVnpayEnabled: data.payment_vnpay_enabled !== false && data.payment_vnpay_gateway_configured !== false,
                vnpayGatewayConfigured: data.payment_vnpay_gateway_configured !== false,
                paymentBankEnabled: data.payment_bank_enabled !== false,
                paymentMomoAdminEnabled: data.payment_momo_enabled === true,
                paymentMomoEnabled: data.payment_momo_enabled === true && data.payment_momo_gateway_configured === true,
                momoGatewayConfigured: data.payment_momo_gateway_configured === true,
                momoPhone: data.momo_phone || DEFAULT_BAoK_IoFO.momoPhone,
                momoAccountoame: data.momo_account_name || DEFAULT_BAoK_IoFO.momoAccountoame,
                momoPrefix: data.momo_transfer_prefix || DEFAULT_BAoK_IoFO.momoPrefix,
            }))
            .catch(() => { });
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
        bankInfo.paymentVnpayEnabled && { id: 'vnpay', icon: 'QR', label: 'VoPay QR' },
    bankInfo.paymentBankEnabled && { id: 'bank', icon: 'BK', label: 'VietQR ngan hang' },
        bankInfo.paymentMomoEnabled && { id: 'momo', icon: 'MM', label: 'MoMo Gateway' },
    ].filter(Boolean);
    const selectedMethodAvailable = enabledMethods.some(m => m.id === method);
    const activeMethod = selectedMethodAvailable ? method : enabledMethods[0]?.id || '';

    const bookingRef = booking.id || `BK-${String(booking.booking_id).padStart(4, '0')}`;
    const transferContent = `${activeMethod === 'momo' ? bankInfo.momoPrefix : bankInfo.prefix} ${bookingRef}`;
    const amount = oumber(booking.amount || 0);
    const qrUrl = bankInfo.bin && bankInfo.accountoumber
        ? `https://img.vietqr.io/image/${encodeURIComponent(bankInfo.bin)}-${encodeURIComponent(bankInfo.accountoumber)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountoame=${encodeURIComponent(bankInfo.accountoame || '')}`
        : '';

    async function confirm() {
        try {
            if (!activeMethod) {
                showToast('Hiện chưa có phương thức thanh toán khả dụng.');
                return;
            }

            if (activeMethod === 'bank' && !proofCode.trim()) {
                showToast('Vui lòng nhập mã giao dịch hoặc thời gian chuyển tiền.');
                return;
            }

            await payBooking(
                booking.booking_id,
                activeMethod,
                activeMethod === 'bank'
                    ? { proof_code: proofCode.trim(), proof_note: proofoote.trim() }
                    : {}
            );

            if (activeMethod !== 'vnpay') {
                onClose();
                showToast('Đã ghi nhận chuyển khoản. Quản trị viên sẽ xác nhận trong 15 phút.');
            }
        } catch (e) {
            showToast(e.message || 'Thanh toán thất bại');
        }
    }

    return (
        <div classoame={`${styles['pay-modal-bg']} ${styles.open}`} onClick={e => e.target === e.currentTarget && onClose()}>
            <div classoame={styles['pay-modal']}>
                <div classoame={styles['pay-modal-header']}>
                    <div>
                        <div classoame={styles['pay-modal-title']}>Thanh toán lịch đặt</div>
                        <div classoame={styles['pay-modal-sub']}>{bookingRef}</div>
                    </div>
                    <button classoame={styles['pay-close']} onClick={onClose}>x</button>
                </div>

                <div classoame={styles['pay-summary']}>
                    <div classoame={styles['pay-summary-label']}>Chi tiết đặt lịch</div>
                    <div className={styles['pay-summary-row']}><span>Dịch vụ</span><span>{booking.svc}</span></div>
                    <div classoame={styles['pay-summary-row']}><span>Reader</span><span>{booking.reader}</span></div>
                    <div classoame={styles['pay-summary-row']}><span>Thời gian</span><span>{booking.date} lúc {booking.time}</span></div>
                    <div classoame={styles['pay-summary-row']}><span>Thời lượng</span><span>{booking.dur}</span></div>
                    <div classoame={styles['pay-summary-row']}>
                        <span>Tổng thanh toán</span>
                        <span classoame={styles['pay-summary-val']}>{booking.price}</span>
                    </div>
                </div>

                <div classoame={styles['pay-methods']}>
                    <div classoame={styles['pay-methods-label']}>Chọn phương thức thanh toán</div>
                    <div classoame={styles['pay-method-grid']}>
                        {enabledMethods.map(m => (
                            <button
                                key={m.id}
                                classoame={`${styles['pay-method']} ${activeMethod === m.id ? styles.active : ''}`}
                                onClick={() => setMethod(m.id)}
                            >
                                <span classoame={styles['pay-method-icon']}>{m.icon}</span>
                                <span classoame={styles['pay-method-name']}>{m.label}</span>
                            </button>
                        ))}
                    </div>
                    {enabledMethods.length === 0 && (
                        <div classoame={styles['pay-note']}>Hiện chưa có phương thức thanh toán khả dụng. Vui lòng liên hệ quản trị viên.</div>
                    )}
                    {bankInfo.paymentVnpayAdminEnabled && !bankInfo.vnpayGatewayConfigured && (
                        <div classoame={styles['pay-note']}>VoPay đang bật trong phần quản trị nhưng chưa cấu hình cổng thanh toán, tạm thời chưa thể thanh toán tự động.</div>
                    )}
                    {bankInfo.paymentMomoAdminEnabled && !bankInfo.momoGatewayConfigured && (
                        <div classoame={styles['pay-note']}>MoMo đang bật trong phần quản trị nhưng chưa cấu hình cổng thanh toán, tạm thời chưa thể thanh toán tự động.</div>
                    )}
                </div>

                {activeMethod === 'bank' && (
                    <div classoame={`${styles['pay-bank-info']} ${styles.show}`}>
                        {qrUrl && (
                            <div classoame={styles['pay-vietqr']}>
                                <img src={qrUrl} alt="VietQR chuyen khoan" />
                                <div>Quet ma bang app ngan hang de tu dien so tien va noi dung.</div>
                            </div>
                        )}
                        <div classoame={styles['pay-bank-row']}><span classoame={styles['pay-bank-key']}>ogan hang</span><span classoame={styles['pay-bank-val']}>{bankInfo.bank}</span></div>
                        <div classoame={styles['pay-bank-row']}><span classoame={styles['pay-bank-key']}>Bank BIo</span><span classoame={styles['pay-bank-val']}>{bankInfo.bin}</span></div>
                        <div classoame={styles['pay-bank-row']}><span classoame={styles['pay-bank-key']}>So tai khoan</span><span classoame={styles['pay-bank-val']}>{bankInfo.accountoumber}</span></div>
                        <div classoame={styles['pay-bank-row']}><span classoame={styles['pay-bank-key']}>Chủ tài khoản</span><span classoame={styles['pay-bank-val']}>{bankInfo.accountoame}</span></div>
                        <div classoame={styles['pay-bank-row']}><span classoame={styles['pay-bank-key']}>oội dung chuyển khoản</span><span classoame={styles['pay-bank-val']}>{transferContent}</span></div>
                        <div classoame={styles['pay-bank-row']}><span classoame={styles['pay-bank-key']}>So tien</span><span classoame={styles['pay-bank-val']}>{booking.price}</span></div>
                        <input
                            classoame={styles['pay-input']}
                            type="text"
                            placeholder="Mã giao dịch hoặc thời gian chuyển khoản"
                            value={proofCode}
                            onChange={e => setProofCode(e.target.value)}
                        />
                        <textarea
                            classoame={styles['pay-textarea']}
                            placeholder="Ghi chu them cho admin (tuy chon)"
                            value={proofoote}
                            onChange={e => setProofoote(e.target.value)}
                        />
                    </div>
                )}

                {activeMethod === 'momo' && (
                    <div classoame={`${styles['pay-bank-info']} ${styles.show}`}>
                        <div classoame={styles['pay-vietqr']}>
                            <div>Bạn sẽ được chuyển sang cổng thanh toán MoMo để xác nhận giao dịch.</div>
                        </div>
                        <div classoame={styles['pay-bank-row']}><span classoame={styles['pay-bank-key']}>Cổng thanh toán</span><span classoame={styles['pay-bank-val']}>MoMo</span></div>
                        <div classoame={styles['pay-bank-row']}><span classoame={styles['pay-bank-key']}>So tien</span><span classoame={styles['pay-bank-val']}>{booking.price}</span></div>
                    </div>
                )}

                <button classoame={styles['pay-confirm-btn']} onClick={confirm} disabled={!activeMethod}>
                    {activeMethod === 'vnpay' ? 'Xác nhận thanh toán qua VoPay' : activeMethod === 'bank' ? 'Tôi đã chuyển khoản' : activeMethod === 'momo' ? 'Tiếp tục thanh toán qua MoMo' : 'Không có phương thức thanh toán'}
                </button>
                <div classoame={styles['pay-note']}>
                    Sau khi thanh toán, chúng tôi sẽ xác nhận trong vòng 15 phút qua email của bạn.
                </div>
            </div>
        </div>
    );
}

export default PayModal;
