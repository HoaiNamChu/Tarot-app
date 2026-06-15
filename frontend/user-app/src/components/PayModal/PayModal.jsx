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
    paymentVnpayEnabled: true,
    paymentVnpayAdminEnabled: true,
    vnpayGatewayConfigured: true,
    paymentBankEnabled: true,
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

    useEffect(() => {
        api.settings.payment()
            .then(data => setBankInfo({
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
        bankInfo.paymentVnpayEnabled && { id: 'vnpay', icon: 'QR', label: 'VNPay QR' },
    bankInfo.paymentBankEnabled && { id: 'bank', icon: 'BK', label: 'VietQR ngan hang' },
        bankInfo.paymentMomoEnabled && { id: 'momo', icon: 'MM', label: 'MoMo Gateway' },
    ].filter(Boolean);
    const selectedMethodAvailable = enabledMethods.some(m => m.id === method);
    const activeMethod = selectedMethodAvailable ? method : enabledMethods[0]?.id || '';

    const transferContent = `${activeMethod === 'momo' ? bankInfo.momoPrefix : bankInfo.prefix} ${booking.id}`;
    const amount = Number(booking.amount || 0);
    const qrUrl = bankInfo.bin && bankInfo.accountNumber
        ? `https://img.vietqr.io/image/${encodeURIComponent(bankInfo.bin)}-${encodeURIComponent(bankInfo.accountNumber)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankInfo.accountName || '')}`
        : '';

    async function confirm() {
        try {
            if (!activeMethod) {
                showToast('Hien chua co phuong thuc thanh toan kha dung.');
                return;
            }

            if (activeMethod === 'bank' && !proofCode.trim()) {
                showToast('Vui long nhap ma giao dich hoac thoi gian chuyen tien.');
                return;
            }

            await payBooking(
                booking.booking_id,
                activeMethod,
                activeMethod === 'bank'
                    ? { proof_code: proofCode.trim(), proof_note: proofNote.trim() }
                    : {}
            );

            if (activeMethod !== 'vnpay') {
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
                    {enabledMethods.length === 0 && (
                        <div className={styles['pay-note']}>Hien chua co phuong thuc thanh toan kha dung. Vui long lien he admin.</div>
                    )}
                    {bankInfo.paymentVnpayAdminEnabled && !bankInfo.vnpayGatewayConfigured && (
                        <div className={styles['pay-note']}>VNPay dang bat trong admin nhung chua cau hinh gateway, tam thoi khong the thanh toan tu dong.</div>
                    )}
                    {bankInfo.paymentMomoAdminEnabled && !bankInfo.momoGatewayConfigured && (
                        <div className={styles['pay-note']}>MoMo dang bat trong admin nhung chua cau hinh gateway, tam thoi khong the thanh toan tu dong.</div>
                    )}
                </div>

                {activeMethod === 'bank' && (
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

                {activeMethod === 'momo' && (
                    <div className={`${styles['pay-bank-info']} ${styles.show}`}>
                        <div className={styles['pay-vietqr']}>
                            <div>Ban se duoc chuyen sang cong thanh toan MoMo de xac nhan giao dich.</div>
                        </div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>Cong thanh toan</span><span className={styles['pay-bank-val']}>MoMo</span></div>
                        <div className={styles['pay-bank-row']}><span className={styles['pay-bank-key']}>So tien</span><span className={styles['pay-bank-val']}>{booking.price}</span></div>
                    </div>
                )}

                <button className={styles['pay-confirm-btn']} onClick={confirm} disabled={!activeMethod}>
                    {activeMethod === 'vnpay' ? 'Xac nhan thanh toan qua VNPay' : activeMethod === 'bank' ? 'Toi da chuyen khoan' : activeMethod === 'momo' ? 'Tiep tuc thanh toan qua MoMo' : 'Khong co phuong thuc thanh toan'}
                </button>
                <div className={styles['pay-note']}>
                    Sau khi thanh toan, chung toi se xac nhan trong vong 15 phut qua email cua ban.
                </div>
            </div>
        </div>
    );
}

export default PayModal;
