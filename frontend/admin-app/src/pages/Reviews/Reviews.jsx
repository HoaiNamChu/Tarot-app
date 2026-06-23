import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { ConfirmModal, InfoRow, Modal } from '../../components/Modal/Modal.jsx';

const STATUS = {
    approved: <span className="badge b-green"><span className="badge-dot"></span>Da duyet</span>,
    pending: <span className="badge b-amber"><span className="badge-dot"></span>Cho duyet</span>,
    flagged: <span className="badge b-rose"><span className="badge-dot"></span>Can phan hoi</span>,
    hidden: <span className="badge b-rose"><span className="badge-dot"></span>Da an</span>,
};

function Stars({ value = 0 }) {
    return (
        <div className="stars">
            <span className="sf">{'★'.repeat(value)}</span>
            <span className="se">{'★'.repeat(5 - value)}</span>
        </div>
    );
}

export default function Reviews() {
    const showToast = useToast();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [modal, setModal] = useState(null);
    const [reply, setReply] = useState('');
    const [replyVisible, setReplyVisible] = useState(true);

    useEffect(() => {
        api.admin.reviews.getAll()
            .then(data => setReviews(data || []))
            .catch(() => {
                showToast('Loi tai danh gia', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    function openModal(type, review) {
        setSelected(review);
        setReply(review?.reply || '');
        setReplyVisible(review?.reply_visible !== false);
        setModal(type);
    }

    function closeModal() {
        setSelected(null);
        setReply('');
        setReplyVisible(true);
        setModal(null);
    }

    async function updateReviewStatus(id, status) {
        try {
            const updated = await api.admin.reviews.update(id, { status });
            setReviews(prev => prev.map(r => r.id === id ? updated : r));
            showToast(status === 'approved' ? 'Da duyet danh gia' : 'Da cap nhat danh gia');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi cap nhat danh gia', 'error');
        }
    }

    async function saveReply(event) {
        event.preventDefault();
        if (!selected) return;
        try {
            const updated = await api.admin.reviews.reply(selected.id, { reply, reply_visible: replyVisible });
            setReviews(prev => prev.map(r => r.id === selected.id ? updated : r));
            showToast('Da luu phan hoi');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi luu phan hoi', 'error');
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Dang tai...</div>;

    const ratedReviews = reviews.filter(r => r.status !== 'hidden');
    const stats = {
        avg_rating: ratedReviews.length > 0 ? (ratedReviews.reduce((sum, r) => sum + (r.stars || 0), 0) / ratedReviews.length).toFixed(2) : '0',
        total: ratedReviews.length,
        five_star: ratedReviews.filter(r => r.stars === 5).length,
        three_four_star: ratedReviews.filter(r => r.stars >= 3 && r.stars < 5).length,
        negative: ratedReviews.filter(r => r.stars <= 2).length,
    };

    const starsData = [5, 4, 3, 2, 1].map(star => [star, ratedReviews.filter(r => r.stars === star).length]);
    const readerRatings = ratedReviews.reduce((acc, r) => {
        const readerId = r.reader_id || r.reader;
        const reader = acc.find(x => x.id === readerId);
        if (reader) {
            reader.count += 1;
            reader.rating = ((reader.rating * (reader.count - 1) + (r.stars || 0)) / reader.count);
        } else {
            acc.push({ id: readerId, name: r.reader_name || r.reader || 'Reader', count: 1, rating: r.stars || 0 });
        }
        return acc;
    }, []).sort((a, b) => b.count - a.count);

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-gold"><div className="stat-icon">★</div><div className="stat-lbl">Danh gia TB</div><div className="stat-val">{stats.avg_rating}</div><div className="stat-delta">{stats.total} danh gia</div></div>
                <div className="stat-card c-green"><div className="stat-icon">◇</div><div className="stat-lbl">5 sao</div><div className="stat-val">{stats.five_star}</div><div className="stat-delta">{stats.total > 0 ? ((stats.five_star / stats.total) * 100).toFixed(0) : '0'}% luot</div></div>
                <div className="stat-card c-amber"><div className="stat-icon">★</div><div className="stat-lbl">3-4 sao</div><div className="stat-val">{stats.three_four_star}</div><div className="stat-delta">Binh thuong</div></div>
                <div className="stat-card c-rose"><div className="stat-icon">!</div><div className="stat-lbl">Tieu cuc</div><div className="stat-val">{stats.negative}</div><div className="stat-delta">&lt;= 2 sao</div></div>
            </div>

            <div className="g2">
                <div className="card">
                    <div className="card-head"><div className="card-title">Danh gia gan day</div></div>
                    <div>
                        {reviews.map((r, i) => (
                            <div key={r.id} style={{ padding: '1rem 1.2rem', borderBottom: i < reviews.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                                        <span className="mav">{r.customer_name?.[0]?.toUpperCase() || r.user?.[0]?.toUpperCase() || 'U'}</span>
                                        <div>
                                            <div style={{ fontSize: '.8rem', fontWeight: 500, color: 'var(--text)' }}>{r.customer_name || r.user}</div>
                                            <div style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>voi {r.reader || r.reader_name}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <Stars value={r.stars || 0} />
                                        {STATUS[r.status] || STATUS.pending}
                                    </div>
                                </div>
                                <p style={{ fontSize: '.8rem', color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '.5rem' }}>"{r.content}"</p>
                                {r.reply && <p style={{ fontSize: '.75rem', color: 'var(--green)', lineHeight: 1.5, marginBottom: '.5rem' }}>Admin: {r.reply}</p>}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '.65rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '-'}</span>
                                    <div className="act-row">
                                        {r.status !== 'approved' && <button type="button" className="ic-btn ok" title="Duyet" onClick={() => updateReviewStatus(r.id, 'approved')}>✓</button>}
                                        <button type="button" className="ic-btn" title="Phan hoi" onClick={() => openModal('reply', r)}>↩</button>
                                        <button type="button" className="ic-btn" title="Chi tiet" onClick={() => openModal('detail', r)}>⊙</button>
                                        {r.status !== 'hidden' && <button type="button" className="ic-btn del" title="An danh gia" onClick={() => openModal('hide', r)}>✕</button>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-stack">
                    <div className="card">
                        <div className="card-head"><div className="card-title">Phan bo sao</div></div>
                        <div className="card-body">
                            {starsData.map(([s, count]) => {
                                const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : '0';
                                return (
                                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.5rem' }}>
                                        <span style={{ fontSize: '.68rem', color: 'var(--gold)', fontFamily: "'DM Mono',monospace", width: 22 }}>{s}★</span>
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
                            {readerRatings.slice(0, 4).map((r) => (
                                <div key={r.id} className="rr">
                                    <div className="rr-av">{r.name?.[0]?.toUpperCase() || '★'}</div>
                                    <div style={{ flex: 1 }}><div className="rr-name">{r.name}</div><div className="rr-sub">{r.count} danh gia</div></div>
                                    <div className="rr-right"><div className="rr-r" style={{ fontSize: '.8rem' }}>★ {Number(r.rating).toFixed(2)}</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={modal === 'detail'} onClose={closeModal} title="Chi tiet danh gia" size="md">
                {selected && (
                    <div className="detail-panel">
                        <InfoRow label="Khach" value={selected.customer_name || selected.user} />
                        <InfoRow label="Reader" value={selected.reader || selected.reader_name} />
                        <InfoRow label="So sao" value={selected.stars} />
                        <InfoRow label="Trang thai">{STATUS[selected.status] || STATUS.pending}</InfoRow>
                        <InfoRow label="Noi dung" value={selected.content} />
                        <InfoRow label="Phan hoi" value={selected.reply} />
                    </div>
                )}
            </Modal>

            <Modal isOpen={modal === 'reply'} onClose={closeModal} title="Phan hoi danh gia" size="md">
                <form onSubmit={saveReply}>
                    <div className="form-group">
                        <label className="label">Noi dung phan hoi</label>
                        <textarea className="textarea" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Cam on ban da chia se trai nghiem..." required />
                    </div>
                    <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <div>
                            <div className="label" style={{ marginBottom: '.2rem' }}>Hien thi cong khai</div>
                            <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>Khach hang co the thay phan hoi nay</div>
                        </div>
                        <button type="button" className={`toggle ${replyVisible ? 'on' : ''}`} onClick={() => setReplyVisible(v => !v)} aria-label="Doi hien thi phan hoi">
                            <span className="toggle-slider"></span>
                        </button>
                    </div>
                    <div className="modal-footer" style={{ margin: '1.25rem -1.35rem -1.25rem' }}>
                        <button type="button" className="btn-secondary" onClick={closeModal}>Huy</button>
                        <button type="submit" className="btn-primary">Luu phan hoi</button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={modal === 'hide'}
                onClose={closeModal}
                title="An danh gia"
                message={`An danh gia cua ${selected?.customer_name || selected?.user || 'khach hang'} khoi danh sach cong khai?`}
                confirmLabel="An danh gia"
                danger
                onConfirm={() => selected && updateReviewStatus(selected.id, 'hidden')}
            />
        </div>
    );
}
