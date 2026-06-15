import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api.js';

export default function PaymentResult() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const status = params.get('status');
    const bookingId = params.get('booking_id');
    const gateway = params.get('gateway') || 'vnpay';
    const { refreshBookings } = useAuth();
    const [retrying, setRetrying] = useState(false);
    const [retryError, setRetryError] = useState('');

    useEffect(() => {
        let timer;

        async function init() {
            if (status !== 'success') return;

            await refreshBookings();

            timer = setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
        }

        init();

        return () => clearTimeout(timer);
    }, [status, navigate, refreshBookings]);

    async function retryPayment() {
        if (!bookingId || retrying) return;

        setRetrying(true);
        setRetryError('');

        try {
            const res = await api.bookings.pay(bookingId, gateway);

            if (res.payment_url) {
                window.location.href = res.payment_url;
            }
        } catch (e) {
            setRetryError(e.message || 'Không thể thanh toán lại. Vui lòng thử lại.');
            setRetrying(false);
        }
    }

    const canRetry = bookingId && ['failed', 'invalid-signature'].includes(status);

    return (
        <div
            style={{
                minHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '20px'
            }}
        >
            {status === 'success' && (
                <>
                    <h1>Thanh toán thành công</h1>

                    <p>
                        Lịch hẹn của bạn đã được xác nhận.
                    </p>

                    <p>
                        Đang chuyển về Dashboard...
                    </p>
                </>
            )}

            {status === 'failed' && (
                <>
                    <h1>Thanh toán thất bại</h1>

                    <p>
                        Bạn có thể thanh toán lại nếu lịch hẹn chưa bị huỷ, chưa hoàn thành và chưa hết hạn.
                    </p>
                </>
            )}

            {status === 'invalid-signature' && (
                <>
                    <h1>Dữ liệu thanh toán không hợp lệ</h1>

                    <p>
                        Vui lòng tạo lại giao dịch VNPay mới để tiếp tục.
                    </p>
                </>
            )}

            {canRetry && (
                <button onClick={retryPayment} disabled={retrying}>
                    {retrying ? 'Đang tạo giao dịch...' : 'Thanh toán lại bằng VNPay'}
                </button>
            )}

            {retryError && (
                <p style={{ color: '#c94b4b', maxWidth: '420px', textAlign: 'center' }}>
                    {retryError}
                </p>
            )}

            <Link to="/dashboard">
                Về trang cá nhân
            </Link>
        </div>
    );
}
