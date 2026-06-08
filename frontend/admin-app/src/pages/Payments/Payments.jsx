import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const ST = {
    paid: ['b-green', 'Đã thanh toán'],
    pending_verification: ['b-amber', 'Chờ xác nhận'],
    refunded: ['b-rose', 'Đã hoàn'],
};

const TABS = [
    ['all', 'Tất cả'],
    ['paid', 'Đã thanh toán'],
    ['pending_verification', 'Chờ xác nhận'],
    ['refunded', 'Hoàn tiền'],
];

export default function Payments() {
    const showToast = useToast();
    const [filter, setFilter] = useState('all');
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.admin.payments.getAll()
            .then(data => setPayments(data || []))
            .catch(() => {
                console.error('Payments fetch error');
                showToast('Lỗi tải dữ liệu thanh toán', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

    const rows = filter === 'all'
        ? payments
        : payments.filter(t => t.payment_status === filter);

    const stats = {
        revenue: payments.filter(p => p.payment_status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0),
        pending: payments.filter(p => p.payment_status === 'pending_verification').length,
        pending_amount: payments.filter(p => p.payment_status === 'pending_verification')
            .reduce((sum, p) => sum + (p.amount || 0), 0),
        refunded: payments.filter(p => p.payment_status === 'refunded')
            .reduce((sum, p) => sum + (p.amount || 0), 0),
        reader_commission: payments.filter(p => p.payment_status === 'paid')
            .reduce((sum, p) => sum + ((p.amount || 0) * 0.3), 0),
    };

    const READERS = payments
        .filter(p => p.payment_status === 'paid')
        .reduce((acc, p) => {
            const reader = acc.find(r => r.name === p.reader);
            if (reader) reader.total += p.amount || 0;
            else acc.push({ name: p.reader, total: p.amount || 0 });
            return acc;
        }, [])
        .sort((a, b) => b.total - a.total)
        .slice(0, 4)
        .map(r => [r.name?.[0]?.toUpperCase() || '🔮', r.name, (r.total / 1000000).toFixed(1)]);

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-green"><div className="stat-icon">⬡</div><div className="stat-lbl">Thu nhập tháng</div><div className="stat-val">{(stats.revenue / 1000000).toFixed(1)}tr</div><div className="stat-delta"><span className="du">↑ 18.4%</span></div></div>
                <div className="stat-card c-amber"><div className="stat-icon">⏳</div><div className="stat-lbl">Đang chờ xử lý</div><div className="stat-val">{stats.pending}</div><div className="stat-delta">{(stats.pending_amount / 1000000).toFixed(2)}tr tổng giá trị</div></div>
                <div className="stat-card c-rose"><div className="stat-icon">↩</div><div className="stat-lbl">Hoàn tiền tháng</div><div className="stat-val">{payments.filter(p => p.payment_status === 'refunded').length}</div><div className="stat-delta">{(stats.refunded / 1000000).toFixed(2)}tr đã hoàn</div></div>
                <div className="stat-card c-violet"><div className="stat-icon">%</div><div className="stat-lbl">Hoa hồng Reader</div><div className="stat-val">{(stats.reader_commission / 1000000).toFixed(1)}tr</div><div className="stat-delta">{stats.revenue > 0 ? ((stats.reader_commission / stats.revenue) * 100).toFixed(1) : '0'}% doanh thu</div></div>
            </div>

            <div className="g2">
                <div className="card">
                    <div className="card-head">
                        <div className="card-title">Giao dịch gần đây</div>
                        <div className="tabs" style={{ border: 'none', margin: 0 }}>
                            {TABS.map(([k, l]) => <button key={k} className={`tab-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="tbl">
                            <thead><tr><th>Mã GD</th><th>Khách hàng</th><th>Dịch vụ</th><th>Số tiền</th><th>Phương thức</th><th>Thời gian</th><th>Trạng thái</th></tr></thead>
                            <tbody>
                                {rows.map(t => (
                                    <tr key={t.id}>
                                        <td className="tc-id">{t.code}</td>
                                        <td className="tc-name">{t.user}</td>
                                        <td style={{ fontSize: '.78rem' }}>{t.svc}</td>
                                        <td className="tc-gold">{t.price}</td>
                                        <td>
                                            <span style={{ fontSize: '.7rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace" }}>
                                                {t.method || '—'}
                                            </span>
                                        </td>
                                        <td className="tc-mono">{t.paid_at || '—'}</td>
                                        <td>
                                            <span className={`badge ${ST[t.payment_status]?.[0] || 'b-amber'}`}>
                                                <span className="badge-dot"></span>
                                                {ST[t.payment_status]?.[1] || 'Chờ xử lý'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-stack">
                    <div className="card">
                        <div className="card-head"><div className="card-title">Phương thức thanh toán</div></div>
                        <div className="card-body">
                            <div className="donut-wrap">
                                <div className="donut" style={{ background: 'conic-gradient(var(--violet) 0% 48%,var(--green) 48% 74%,var(--gold) 74% 100%)' }}></div>
                                <div className="donut-legend">
                                    <div className="dl-item"><div className="dl-dot" style={{ background: 'var(--violet)' }}></div>VNPay — 48%</div>
                                    <div className="dl-item"><div className="dl-dot" style={{ background: 'var(--green)' }}></div>MoMo — 26%</div>
                                    <div className="dl-item"><div className="dl-dot" style={{ background: 'var(--gold)' }}></div>Chuyển khoản — 26%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-head"><div className="card-title">Hoa hồng Reader tháng</div></div>
                        <div style={{ padding: '0 1.2rem' }}>
                            {READERS.map(([av, name, revenue]) => (
                                <div key={name} className="rr">
                                    <div className="rr-av">{av}</div>
                                    <div style={{ flex: 1 }}><div className="rr-name">{name}</div><div className="rr-sub">30% doanh thu</div></div>
                                    <div className="rr-right"><div style={{ fontFamily: "'Syne',sans-serif", fontSize: '.9rem', fontWeight: 600, color: 'var(--green)' }}>{revenue}tr</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
