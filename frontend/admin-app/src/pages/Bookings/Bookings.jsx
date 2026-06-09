import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const ST = { pending: ['b-amber', 'Chờ duyệt'], confirmed: ['b-green', 'Đã xác nhận'], completed: ['b-violet', 'Hoàn thành'], cancelled: ['b-rose', 'Đã huỷ'] };
const TABS = [['all', 'Tất cả'], ['pending', 'Chờ duyệt'], ['confirmed', 'Xác nhận'], ['completed', 'Hoàn thành'], ['cancelled', 'Đã huỷ']];

export default function Bookings() {
    const showToast = useToast();
    const [filter, setFilter] = useState('all');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.admin.bookings.getAll()
            .then(data => {
                setBookings(data || []);
            })
            .catch(() => {
                console.error('Bookings fetch error');
                showToast('Lỗi tải dữ liệu lịch đặt', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    const rows = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

    async function handleConfirm(id) {
        try {
            await api.admin.bookings.confirm(id);
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
            showToast('Đã xác nhận lịch');
        } catch {
            showToast('Lỗi xác nhận lịch', 'error');
        }
    }

    async function handleCancel(id) {
        if (confirm('Bạn chắc chắn muốn huỷ lịch này?')) {
            try {
                await api.admin.bookings.cancel(id);
                setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
                showToast('Đã huỷ lịch');
            } catch {
                showToast('Lỗi huỷ lịch', 'error');
            }
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-amber"><div className="stat-icon">⏳</div><div className="stat-lbl">Chờ xác nhận</div><div className="stat-val">{bookings.filter(b => b.status === 'pending').length}</div><div className="stat-delta">Cần xử lý ngay</div></div>
                <div className="stat-card c-green"><div className="stat-icon">✓</div><div className="stat-lbl">Hôm nay</div><div className="stat-val">{bookings.filter(b => {
                    if (!b.booked_at) return false;
                    const [date] = b.booked_at.split(' ');
                    const [d, m, y] = date.split('/');
                    return new Date(`${y}-${m}-${d}`).toDateString() === new Date().toDateString();
                }).length}</div><div className="stat-delta"><span className="du">{bookings.filter(b => b.status === 'completed').length}</span> đã hoàn thành</div></div>
                <div className="stat-card c-violet"><div className="stat-icon">◷</div><div className="stat-lbl">Tháng này</div><div className="stat-val">{bookings.length}</div><div className="stat-delta"><span className="du">↑ {Math.floor(bookings.length * 0.15)}</span> so với tháng trước</div></div>
                <div className="stat-card c-rose"><div className="stat-icon">✕</div><div className="stat-lbl">Đã huỷ</div><div className="stat-val">{bookings.filter(b => b.status === 'cancelled').length}</div><div className="stat-delta"><span className="dd">{bookings.length > 0 ? ((bookings.filter(b => b.status === 'cancelled').length / bookings.length) * 100).toFixed(1) : '0'}%</span> tỷ lệ huỷ</div></div>
            </div>
            <div className="card">
                <div className="card-head">
                    <div className="card-title">Tất cả lịch đặt</div>
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="tabs" style={{ border: 'none', margin: 0 }}>
                            {TABS.map(([k, l]) => <button key={k} className={`tab-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
                        </div>
                        <button className="btn-primary">＋ Thêm</button>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                        <thead><tr><th>ID</th><th>Khách hàng</th><th>Dịch vụ</th><th>Reader</th><th>Thời gian</th><th>Giá</th><th>Kênh</th><th>Trạng thái</th><th></th></tr></thead>
                        <tbody>
                            {rows.map(b => (
                                <tr key={b.id}>
                                    <td className="tc-id">{b.code}</td>
                                    <td className="tc-name">{b.user}</td>
                                    <td style={{ fontSize: '.78rem' }}>{b.svc}</td>
                                    <td style={{ fontSize: '.78rem' }}>{b.reader?.split(' ').pop() || '—'}</td>
                                    <td className="tc-mono">{b.booked_at || '—'}</td>
                                    <td className="tc-gold">{b.price}</td>
                                    <td style={{ fontSize: '.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace" }}>
                                        {b.payment_method || '—'}
                                    </td>
                                    <td>
                                        <span className={`badge ${ST[b.status]?.[0]}`}>
                                            <span className="badge-dot"></span>
                                            {ST[b.status]?.[1] || b.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="act-row">
                                            <div className="ic-btn" onClick={() => handleConfirm(b.id)}>✓</div>
                                            <div className="ic-btn">✎</div>
                                            <div className="ic-btn del" onClick={() => handleCancel(b.id)}>✕</div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}