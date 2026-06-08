import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';

function StatBox({ val, label, color }) {
    return (
        <div style={{ textAlign: 'center', padding: '.6rem', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 4 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1rem', fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: '.58rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace", textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</div>
        </div>
    );
}

export default function Readers() {
    const showToast = useToast();
    const [readers, setReaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', email: '', specialty: '', phone: '', bio: '' });

    useEffect(() => {
        api.admin.readers.getAll()
            .then(data => setReaders(data || []))
            .catch(() => {
                console.error('Readers fetch error');
                showToast('Lỗi tải danh sách reader', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    async function handleAddReader(e) {
        e.preventDefault();
        try {
            const newReader = await api.admin.readers.create(form);
            setReaders(prev => [...prev, newReader]);
            setForm({ name: '', email: '', specialty: '', phone: '', bio: '' });
            showToast('Đã thêm reader thành công');
        } catch {
            showToast('Lỗi thêm reader', 'error');
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

    const stats = {
        total: readers.length,
        sessions: readers.reduce((sum, r) => sum + (r.sessions || 0), 0),
        avg_rating: readers.length > 0 ? (readers.reduce((sum, r) => sum + (r.rating || 0), 0) / readers.length).toFixed(2) : '0',
        revenue: readers.reduce((sum, r) => sum + (r.revenue || 0), 0),
    };

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-violet"><div className="stat-icon">✦</div><div className="stat-lbl">Tổng Reader</div><div className="stat-val">{stats.total}</div><div className="stat-delta">Đang hoạt động</div></div>
                <div className="stat-card c-gold"><div className="stat-icon">◷</div><div className="stat-lbl">Tổng buổi đọc</div><div className="stat-val">{stats.sessions}</div><div className="stat-delta"><span className="du">↑ 18%</span> tháng này</div></div>
                <div className="stat-card c-green"><div className="stat-icon">◇</div><div className="stat-lbl">Đánh giá TB</div><div className="stat-val">{stats.avg_rating}</div><div className="stat-delta">Xuất sắc</div></div>
                <div className="stat-card c-cyan"><div className="stat-icon">💰</div><div className="stat-lbl">Hoa hồng tháng</div><div className="stat-val">{stats.revenue}tr</div><div className="stat-delta"><span className="du">↑ 8%</span> so với tháng trước</div></div>
            </div>

            <div className="g22">
                {readers.map(r => (
                    <div key={r.id} className="card">
                        <div className="card-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--panel-3)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{r.avatar || '🔮'}</div>
                                <div>
                                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '.92rem', fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
                                    <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{r.specialty || 'Tarot & Divination'}</div>
                                </div>
                            </div>
                            <div className="act-row"><div className="ic-btn">✎</div><div className="ic-btn">◷</div></div>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.5rem', marginBottom: '1rem' }}>
                                <StatBox val={r.sessions || '0'} label="Buổi" color="var(--text)" />
                                <StatBox val={r.rating || '0'} label="Rating" color="var(--gold)" />
                                <StatBox val={`${r.revenue || '0'}tr`} label="Doanh thu" color="var(--green)" />
                            </div>
                            <div style={{ marginBottom: '.75rem' }}>
                                <div style={{ fontSize: '.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '.4rem', fontFamily: "'DM Mono',monospace" }}>Chuyên môn</div>
                                <div>{(r.skills || ['Tarot', 'Divination']).map(c => <span key={c} className="chip on">{c}</span>)}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '.75rem', borderTop: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>Tham gia {r.joined_at ? new Date(r.joined_at).toLocaleDateString('vi-VN', { month: '2-digit', year: '2-digit' }) : 'N/A'}</span>
                                <span className="badge b-green"><span className="badge-dot"></span>Hoạt động</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card">
                <div className="card-head"><div className="card-title">Thêm Reader mới</div></div>
                <div className="card-body">
                    <form onSubmit={handleAddReader}>
                        <div className="form-row">
                            <div><label className="label">Họ và tên</label><input type="text" className="input" placeholder="Nguyễn Thị ..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                            <div><label className="label">Email</label><input type="email" className="input" placeholder="reader@luna.vn" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                        </div>
                        <div className="form-row">
                            <div>
                                <label className="label">Chuyên môn</label>
                                <select className="sel" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} required>
                                    <option value="">— Chọn —</option>
                                    <option value="Tarot">Tarot</option>
                                    <option value="Oracle">Oracle</option>
                                    <option value="Chiêm tinh học">Chiêm tinh học</option>
                                    <option value="Numerology">Numerology</option>
                                    <option value="Crystal Healing">Crystal Healing</option>
                                </select>
                            </div>
                            <div><label className="label">Số điện thoại</label><input type="tel" className="input" placeholder="0xxx xxx xxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></div>
                        </div>
                        <div className="form-group"><label className="label">Giới thiệu ngắn</label><textarea className="textarea" placeholder="Mô tả kinh nghiệm và phong cách đọc bài..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}></textarea></div>
                        <button className="form-submit" type="submit">Thêm Reader</button>
                    </form>
                </div>
            </div>
        </div>
    );
}