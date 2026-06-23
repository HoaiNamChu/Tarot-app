import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';

function BarChart({ vals, labels, color, height }) {
    const mx = Math.max(...vals.filter(v => v > 0)) || 1;
    return (
        <div className="bar-wrap" style={{ height, marginBottom: '1.9rem' }}>
            {vals.map((v, i) => (
                <div key={i} className="bar"
                    style={{ height: `${v > 0 ? (v / mx) * 100 : 5}%`, background: color, border: `1px solid ${color}44`, opacity: v > 0 ? 1 : .15 }}
                    title={`${labels[i]}: ${v}tr`}>
                    <span className="bar-lbl">{labels[i]}</span>
                </div>
            ))}
        </div>
    );
}

export default function Analytics() {
    const showToast = useToast();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.admin.stats()
            .then(data => setAnalytics(data || {}))
            .catch(() => {
                showToast('Lỗi tải dữ liệu phân tích', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

    const HOURS = analytics.peak_hours || [['9h', 22], ['10h', 18], ['11h', 14], ['14h', 38, true], ['15h', 42, true], ['16h', 29], ['19h', 35, true], ['20h', 21]];

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-gold"><div className="stat-icon">💰</div><div className="stat-lbl">Doanh thu năm 2026</div><div className="stat-val">{analytics.revenue_year || '0'}tr</div><div className="stat-delta"><span className="du">↑ {analytics.revenue_yoy_growth || '0'}%</span> so với 2025</div></div>
                <div className="stat-card c-violet"><div className="stat-icon">◷</div><div className="stat-lbl">Tổng lịch đặt</div><div className="stat-val">{analytics.total_bookings_year || '0'}</div><div className="stat-delta"><span className="du">↑ {analytics.bookings_yoy_growth || '0'}%</span> năm nay</div></div>
                <div className="stat-card c-cyan"><div className="stat-icon">○</div><div className="stat-lbl">Tỷ lệ quay lại</div><div className="stat-val">{analytics.repeat_rate || '0'}%</div><div className="stat-delta"><span className="du">↑ {analytics.repeat_rate_growth || '0'}%</span> so với Q1</div></div>
                <div className="stat-card c-green"><div className="stat-icon">⬡</div><div className="stat-lbl">Giá trị TB / lịch</div><div className="stat-val">{analytics.avg_value_per_booking || '0'}K</div><div className="stat-delta"><span className="du">↑ {analytics.upsell_growth || '0'}%</span> upsell tốt</div></div>
            </div>

            <div className="g2">
                <div className="card">
                    <div className="card-head"><div className="card-title">Doanh thu theo tháng</div><span className="card-meta">2026</span></div>
                    <div className="card-body">
                        <BarChart vals={analytics.monthly_revenue || [0,0,0,0,0,0,0,0,0,0,0,0]} labels={['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']} color="var(--violet)" height={110} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.75rem' }}>
                            {[['Q1', analytics.q1_revenue ? `${analytics.q1_revenue}tr` : '0tr', 'var(--text)'], ['Q2 (đang chạy)', analytics.q2_revenue ? `${analytics.q2_revenue}tr` : '0tr', 'var(--gold)'], ['Dự báo Q3', analytics.q3_forecast ? `~${analytics.q3_forecast}tr` : '0tr', 'var(--violet)']].map(([label, val, color]) => (
                                <div key={label} style={{ textAlign: 'center', padding: '.8rem', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 4 }}>
                                    <div style={{ fontSize: '.58rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.12em', fontFamily: "'DM Mono',monospace", marginBottom: '.25rem' }}>{label}</div>
                                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.1rem', fontWeight: 700, color }}>{val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-stack">
                    <div className="card">
                        <div className="card-head"><div className="card-title">Dịch vụ phổ biến</div></div>
                        <div className="card-body">
                            {(analytics.top_services || []).map((s) => (
                                <div key={s.name} className="prog">
                                    <div className="prog-head"><span className="prog-lbl">{s.name}</span><span className="prog-val">{s.percentage}%</span></div>
                                    <div className="prog-track"><div className="prog-fill" style={{ width: `${s.percentage}%`, background: s.color || 'var(--gold)' }}></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-head"><div className="card-title">Kênh đặt lịch</div></div>
                        <div className="card-body">
                            <div className="donut-wrap">
                                <div className="donut" style={{ background: 'conic-gradient(var(--violet) 0% 52%,var(--gold) 52% 75%,var(--cyan) 75% 88%,var(--rose) 88% 100%)' }}></div>
                                <div className="donut-legend">
                                    {(analytics.channels || []).map((c) => (
                                        <div key={c.name} className="dl-item"><div className="dl-dot" style={{ background: c.color || 'var(--violet)' }}></div>{c.name} — {c.percentage}%</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="g22">
                <div className="card">
                    <div className="card-head"><div className="card-title">Khung giờ cao điểm</div></div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.5rem', marginBottom: '.75rem' }}>
                            {HOURS.map(([h, v, hot]) => (
                                <div key={h} style={{ textAlign: 'center', padding: '.55rem .4rem', background: hot ? 'var(--gold-dim)' : 'var(--panel-2)', border: `1px solid ${hot ? 'var(--gold-mid)' : 'var(--border)'}`, borderRadius: 4 }}>
                                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '.88rem', fontWeight: 600, color: hot ? 'var(--gold)' : 'var(--text)' }}>{v}</div>
                                    <div style={{ fontSize: '.58rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace" }}>{h}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>★ Cao điểm: <span style={{ color: 'var(--gold)' }}>14h–16h</span> chiếm 44% lịch đặt</div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-head"><div className="card-title">Khách hàng theo vùng</div></div>
                    <div className="card-body">
                        {(analytics.regions || []).map((r) => (
                            <div key={r.name} className="prog">
                                <div className="prog-head"><span className="prog-lbl">{r.name}</span><span className="prog-val">{r.percentage}%</span></div>
                                <div className="prog-track"><div className="prog-fill" style={{ width: `${r.percentage}%`, background: r.color || 'var(--violet)' }}></div></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
