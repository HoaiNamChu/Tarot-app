import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const BADGES = {
    vip: <span className="badge b-gold"><span className="badge-dot"></span>VIP</span>,
    active: <span className="badge b-green"><span className="badge-dot"></span>Hoạt động</span>,
    new: <span className="badge b-cyan"><span className="badge-dot"></span>Mới</span>,
    inactive: <span className="badge" style={{ background: 'rgba(100,100,120,.1)', color: '#7a7a9a', border: '1px solid rgba(100,100,120,.2)' }}><span className="badge-dot"></span>Không HĐ</span>,
};

export default function Users() {
    const showToast = useToast();
    const [filter, setFilter] = useState('all');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.admin.users.getAll()
            .then(data => setUsers(data || []))
            .catch(err => {
                console.error('Users fetch error:', err);
                showToast('Lỗi tải danh sách khách hàng', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    const rows = filter === 'all' ? users : users.filter(u => u.type === filter);

    if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

    const stats = {
        total: users.length,
        repeat_rate: users.length > 0 ? ((users.filter(u => u.total_bookings > 1).length / users.length) * 100).toFixed(0) : '0',
        avg_ltv: users.length > 0 ? (users.reduce((sum, u) => sum + (u.spent || 0), 0) / users.length).toFixed(1) : '0',
        vip: users.filter(u => u.type === 'vip').length,
    };

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-cyan"><div className="stat-icon">○</div><div className="stat-lbl">Tổng khách hàng</div><div className="stat-val">{stats.total}</div><div className="stat-delta"><span className="du">↑ {Math.floor(stats.total * 0.07)}</span> tháng này</div></div>
                <div className="stat-card c-green"><div className="stat-icon">♻</div><div className="stat-lbl">Quay lại lần 2+</div><div className="stat-val">{stats.repeat_rate}%</div><div className="stat-delta">Tỷ lệ trung thành</div></div>
                <div className="stat-card c-gold"><div className="stat-icon">💰</div><div className="stat-lbl">LTV trung bình</div><div className="stat-val">{stats.avg_ltv}tr</div><div className="stat-delta">Lifetime value</div></div>
                <div className="stat-card c-violet"><div className="stat-icon">⭐</div><div className="stat-lbl">Khách VIP</div><div className="stat-val">{stats.vip}</div><div className="stat-delta">&gt;3 lịch / tháng</div></div>
            </div>
            <div className="card">
                <div className="card-head">
                    <div className="card-title">Danh sách khách hàng</div>
                    <div className="tabs" style={{ border: 'none', margin: 0 }}>
                        {[['all', 'Tất cả'], ['vip', 'VIP'], ['new', 'Mới'], ['inactive', 'Không HĐ']].map(([k, l]) => (
                            <button key={k} className={`tab-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
                        ))}
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                        <thead><tr><th>Khách hàng</th><th>Email</th><th>SĐT</th><th>Tổng lịch</th><th>Chi tiêu</th><th>Đăng ký</th><th>Loại</th><th></th></tr></thead>
                        <tbody>
                            {rows.map(u => (
                                <tr key={u.id}>
                                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><span className="mav">{u.name?.[0]?.toUpperCase() || 'U'}</span><span className="tc-name">{u.name}</span></div></td>
                                    <td className="tc-mono">{u.email}</td>
                                    <td className="tc-mono">{u.phone || '—'}</td>
                                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>{u.total_bookings || '0'}</td>
                                    <td className="tc-gold">{u.spent || '0'}tr</td>
                                    <td className="tc-mono">{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                                    <td>{BADGES[u.type] || BADGES['active']}</td>
                                    <td><div className="act-row"><div className="ic-btn">⊙</div><div className="ic-btn">✉</div><div className="ic-btn del">✕</div></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}