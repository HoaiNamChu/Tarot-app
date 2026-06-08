import { useState } from 'react';

const POSTS = [
    { icon: '🌙', title: 'Major Arcana là gì? Hướng dẫn cho người mới bắt đầu', tag: 'Hướng dẫn', views: '4.2K', date: '05/05', status: 'published' },
    { icon: '💞', title: '10 câu hỏi bạn nên hỏi trong buổi đọc bài tình yêu', tag: 'Tình yêu', views: '3.8K', date: '28/04', status: 'published' },
    { icon: '⭐', title: 'Chiêm tinh học và Tarot — Hai công cụ bổ trợ nhau thế nào?', tag: 'Chiêm tinh', views: '2.1K', date: '20/04', status: 'published' },
    { icon: '🔮', title: 'Cách chăm sóc bộ bài Tarot của bạn đúng cách', tag: 'Hướng dẫn', views: '1.9K', date: '15/04', status: 'published' },
    { icon: '🌿', title: 'Crystal Healing và năng lượng trong Tarot', tag: 'Năng lượng', views: '—', date: 'Bản nháp', status: 'draft' },
];
const SERVICES = [
    { icon: '🌙', name: 'Trải bài tổng quan', info: '450K · 60 phút', active: true },
    { icon: '💞', name: 'Tình yêu & Duyên phận', info: '350K · 45 phút', active: true },
    { icon: '💼', name: 'Sự nghiệp & Tài lộc', info: '350K · 45 phút', active: true },
    { icon: '🔮', name: 'Tarot chuyên sâu', info: '750K · 90 phút', active: true },
    { icon: '⭐', name: 'Chiêm tinh học', info: '550K · 75 phút', active: true },
    { icon: '✉️', name: 'Đọc bài qua email', info: '250K · 24h', active: false },
];

export default function Content() {
    const [postTab, setPostTab] = useState('published');

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-violet"><div className="stat-icon">▤</div><div className="stat-lbl">Bài viết Blog</div><div className="stat-val">48</div><div className="stat-delta"><span className="du">+3</span> tháng này</div></div>
                <div className="stat-card c-gold"><div className="stat-icon">👁</div><div className="stat-lbl">Lượt xem TB</div><div className="stat-val">2.4K</div><div className="stat-delta">Mỗi bài viết</div></div>
                <div className="stat-card c-cyan"><div className="stat-icon">✦</div><div className="stat-lbl">FAQ</div><div className="stat-val">24</div><div className="stat-delta">Câu hỏi thường gặp</div></div>
                <div className="stat-card c-green"><div className="stat-icon">🌙</div><div className="stat-lbl">Dịch vụ</div><div className="stat-val">6</div><div className="stat-delta">Đang hiển thị</div></div>
            </div>

            <div className="g2">
                <div className="card">
                    <div className="card-head">
                        <div className="card-title">Bài viết Blog</div>
                        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                            <div className="tabs" style={{ border: 'none', margin: 0 }}>
                                <button className={`tab-btn${postTab === 'published' ? ' active' : ''}`} onClick={() => setPostTab('published')}>Đã xuất bản</button>
                                <button className={`tab-btn${postTab === 'draft' ? ' active' : ''}`} onClick={() => setPostTab('draft')}>Bản nháp</button>
                            </div>
                            <button className="card-act">＋ Thêm</button>
                        </div>
                    </div>
                    <div>
                        {POSTS.filter(p => postTab === 'published' ? p.status === 'published' : p.status === 'draft').map((p, i, arr) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '.85rem', padding: '.9rem 1.2rem', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 4, background: 'var(--panel-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{p.icon}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '.82rem', fontWeight: 500, color: 'var(--text)', marginBottom: '.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                                    <div style={{ fontSize: '.67rem', color: 'var(--text-3)' }}>
                                        <span className="chip" style={{ margin: 0, padding: '.15rem .45rem' }}>{p.tag}</span> · {p.views} lượt xem · {p.date}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.35rem', flexShrink: 0 }}>
                                    {p.status === 'published'
                                        ? <span className="badge b-green"><span className="badge-dot"></span>Xuất bản</span>
                                        : <span className="badge b-amber"><span className="badge-dot"></span>Nháp</span>}
                                    <div className="act-row"><div className="ic-btn">✎</div><div className="ic-btn del">✕</div></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-stack">
                    <div className="card">
                        <div className="card-head"><div className="card-title">Quản lý dịch vụ</div><button className="card-act">＋ Thêm</button></div>
                        <div>
                            {SERVICES.map((s, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.72rem 1.2rem', borderBottom: i < SERVICES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--text)' }}>{s.name}</div>
                                        <div style={{ fontSize: '.65rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace" }}>{s.info}</div>
                                    </div>
                                    <div className="act-row">
                                        <div className="ic-btn">✎</div>
                                        <div className={`ic-btn${s.active ? '' : ' ok'}`}>{s.active ? '◉' : '○'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}