import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const STATUS = {
    approved: <span className="badge b-green"><span className="badge-dot"></span>Đã duyệt</span>,
    pending: <span className="badge b-amber"><span className="badge-dot"></span>Chờ duyệt</span>,
    flagged: <span className="badge b-rose"><span className="badge-dot"></span>Cần phản hồi</span>,
};

export default function Reviews() {
    const showToast = useToast();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.admin.reviews.getAll()
            .then(data => setReviews(data || []))
            .catch(err => {
                console.error('Reviews fetch error:', err);
                showToast('Lỗi tải đánh giá', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

    const stats = {
        avg_rating: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + (r.stars || 0), 0) / reviews.length).toFixed(2) : '0',
        total: reviews.length,
        five_star: reviews.filter(r => r.stars === 5).length,
        three_four_star: reviews.filter(r => r.stars >= 3 && r.stars < 5).length,
        negative: reviews.filter(r => r.stars <= 2).length,
    };

    const STARS_DATA = [[5, reviews.filter(r => r.stars === 5).length], [4, reviews.filter(r => r.stars === 4).length], [3, reviews.filter(r => r.stars === 3).length], [2, reviews.filter(r => r.stars === 2).length], [1, reviews.filter(r => r.stars === 1).length]];
    const READER_RATINGS = reviews.reduce((acc, r) => {
        const reader = acc.find(x => x.id === r.reader_id);
        if (reader) {
            reader.count++;
            reader.rating = ((reader.rating * (reader.count - 1) + r.stars) / reader.count).toFixed(2);
        } else {
            acc.push({ id: r.reader_id, name: r.reader_name, count: 1, rating: r.stars });
        }
        return acc;
    }, []).sort((a, b) => b.count - a.count);

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-gold"><div className="stat-icon">★</div><div className="stat-lbl">Đánh giá TB</div><div className="stat-val">{stats.avg_rating}</div><div className="stat-delta">{stats.total} đánh giá</div></div>
                <div className="stat-card c-green"><div className="stat-icon">◇</div><div className="stat-lbl">5 sao</div><div className="stat-val">{stats.five_star}</div><div className="stat-delta">{stats.total > 0 ? ((stats.five_star / stats.total) * 100).toFixed(0) : '0'}% lượt</div></div>
                <div className="stat-card c-amber"><div className="stat-icon">★</div><div className="stat-lbl">3-4 sao</div><div className="stat-val">{stats.three_four_star}</div><div className="stat-delta">Bình thường</div></div>
                <div className="stat-card c-rose"><div className="stat-icon">!</div><div className="stat-lbl">Tiêu cực</div><div className="stat-val">{stats.negative}</div><div className="stat-delta">≤ 2 sao</div></div>
            </div>

            <div className="g2">
                <div className="card">
                    <div className="card-head"><div className="card-title">Đánh giá gần đây</div></div>
                    <div>
                        {reviews.map((r, i) => (
                            <div key={r.id} style={{ padding: '1rem 1.2rem', borderBottom: i < reviews.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                                        <span className="mav">{r.user?.[0]?.toUpperCase() || 'U'}</span>
                                        <div>
                                            <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--text)' }}>{r.customer_name}</div>
                                            <div style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>với {r.reader}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                        <div className="stars">
                                            <span className="sf">{'★'.repeat(r.stars || 0)}</span>
                                            <span className="se">{'★'.repeat(5 - (r.stars || 0))}</span>
                                        </div>
                                        {STATUS[r.status] || STATUS['pending']}
                                    </div>
                                </div>
                                <p style={{ fontSize: '.8rem', color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '.5rem' }}>"{r.content}"</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '.65rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                                    <div className="act-row">
                                        <div className="ic-btn ok">✓</div>
                                        <div className="ic-btn">↩</div>
                                        <div className="ic-btn del">✕</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-stack">
                    <div className="card">
                        <div className="card-head"><div className="card-title">Phân bố sao</div></div>
                        <div className="card-body">
                            {STARS_DATA.map(([s, count]) => {
                                const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : '0';
                                return (
                                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.5rem' }}>
                                        <span style={{ fontSize: '.68rem', color: 'var(--gold)', fontFamily: "'DM Mono',monospace", width: 14 }}>{s}★</span>
                                        <div style={{ flex: 1, height: 6, background: 'var(--panel-3)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: 3 }}></div>
                                        </div>
                                        <span style={{ fontSize: '.65rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace", width: 30, textAlign: 'right' }}>{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-head"><div className="card-title">Rating theo Reader</div></div>
                        <div style={{ padding: '0 1.2rem' }}>
                            {READER_RATINGS.slice(0, 4).map((r) => (
                                <div key={r.id} className="rr">
                                    <div className="rr-av">{r.name?.[0]?.toUpperCase() || '🔮'}</div>
                                    <div style={{ flex: 1 }}><div className="rr-name">{r.name}</div><div className="rr-sub">{r.count} đánh giá</div></div>
                                    <div className="rr-right"><div className="rr-r" style={{ fontSize: '.8rem' }}>★ {r.rating}</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}