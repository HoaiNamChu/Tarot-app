import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { ConfirmModal, InfoRow, Modal } from '../../components/Modal/Modal.jsx';

const emptyForm = { name: '', email: '', specialty: '', phone: '', bio: '', avatar: '', is_active: true };

function StatBox({ val, label, color }) {
    return (
        <div style={{ textAlign: 'center', padding: '.6rem', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 4 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1rem', fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: '.58rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace", textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
        </div>
    );
}

function ReaderForm({ form, setForm, onSubmit, submitLabel }) {
    return (
        <form onSubmit={onSubmit}>
            <div className="form-row">
                <div><label className="label">Ho va ten</label><input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={Boolean(form.id)} /></div>
            </div>
            <div className="form-row">
                <div>
                    <label className="label">Chuyen mon</label>
                    <select className="sel" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value, title: e.target.value })} required>
                        <option value="">Chon chuyen mon</option>
                        <option value="Tarot">Tarot</option>
                        <option value="Oracle">Oracle</option>
                        <option value="Chiem tinh hoc">Chiem tinh hoc</option>
                        <option value="Numerology">Numerology</option>
                        <option value="Crystal Healing">Crystal Healing</option>
                    </select>
                </div>
                <div><label className="label">So dien thoai</label><input type="tel" className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="form-row">
                <div><label className="label">Avatar / icon</label><input type="text" className="input" value={form.avatar || ''} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="VD: * hoac URL anh" /></div>
                <div>
                    <label className="label">Trang thai</label>
                    <button type="button" className={`toggle ${form.is_active ? 'on' : ''}`} onClick={() => setForm({ ...form, is_active: !form.is_active })} aria-label="Doi trang thai">
                        <span className="toggle-slider"></span>
                    </button>
                </div>
            </div>
            <div className="form-group"><label className="label">Gioi thieu</label><textarea className="textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} required /></div>
            <div className="modal-footer" style={{ margin: '1.25rem -1.35rem -1.25rem' }}>
                <button type="submit" className="btn-primary">{submitLabel}</button>
            </div>
        </form>
    );
}

export default function Readers() {
    const showToast = useToast();
    const [readers, setReaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [selected, setSelected] = useState(null);
    const [modal, setModal] = useState(null);

    useEffect(() => {
        api.admin.readers.getAll()
            .then(data => setReaders(data || []))
            .catch(() => {
                showToast('Loi tai danh sach reader', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    function openAdd() {
        setForm(emptyForm);
        setSelected(null);
        setModal('add');
    }

    function openEdit(reader) {
        setSelected(reader);
        setForm({
            id: reader.id,
            name: reader.name || '',
            email: reader.email || '',
            specialty: reader.specialty || reader.title || '',
            title: reader.title || reader.specialty || '',
            phone: reader.phone || '',
            bio: reader.bio || '',
            avatar: reader.avatar || '',
            is_active: reader.is_active !== false,
        });
        setModal('edit');
    }

    function closeModal() {
        setModal(null);
        setSelected(null);
    }

    async function handleAddReader(event) {
        event.preventDefault();
        try {
            const payload = { ...form, title: form.specialty };
            const newReader = await api.admin.readers.create(payload);
            setReaders(prev => [...prev, newReader]);
            showToast('Da them reader');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi them reader', 'error');
        }
    }

    async function handleUpdateReader(event) {
        event.preventDefault();
        if (!selected) return;
        try {
            const payload = {
                name: form.name,
                title: form.specialty,
                bio: form.bio,
                avatar: form.avatar,
                is_active: form.is_active,
            };
            const updated = await api.admin.readers.update(selected.id, payload);
            setReaders(prev => prev.map(r => r.id === selected.id ? { ...r, ...updated, specialty: updated.title || form.specialty } : r));
            showToast('Da cap nhat reader');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi cap nhat reader', 'error');
        }
    }

    async function handleDeleteReader() {
        if (!selected) return;
        try {
            await api.admin.readers.delete(selected.id);
            setReaders(prev => selected.bookings_count || selected.sessions
                ? prev.map(r => r.id === selected.id ? { ...r, is_active: false } : r)
                : prev.filter(r => r.id !== selected.id));
            showToast('Da cap nhat reader');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi xoa reader', 'error');
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Dang tai...</div>;

    const stats = {
        total: readers.length,
        sessions: readers.reduce((sum, r) => sum + (r.sessions || r.bookings_count || 0), 0),
        avg_rating: readers.length > 0 ? (readers.reduce((sum, r) => sum + (r.rating || r.avg_rating || 0), 0) / readers.length).toFixed(2) : '0',
        revenue: readers.reduce((sum, r) => sum + (r.revenue || 0), 0),
    };

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-violet"><div className="stat-icon">✦</div><div className="stat-lbl">Tong Reader</div><div className="stat-val">{stats.total}</div><div className="stat-delta">{readers.filter(r => r.is_active !== false).length} dang hoat dong</div></div>
                <div className="stat-card c-gold"><div className="stat-icon">◷</div><div className="stat-lbl">Tong buoi doc</div><div className="stat-val">{stats.sessions}</div><div className="stat-delta">Da ghi nhan</div></div>
                <div className="stat-card c-green"><div className="stat-icon">★</div><div className="stat-lbl">Danh gia TB</div><div className="stat-val">{stats.avg_rating}</div><div className="stat-delta">Theo review</div></div>
                <div className="stat-card c-cyan"><div className="stat-icon">◆</div><div className="stat-lbl">Doanh thu</div><div className="stat-val">{(stats.revenue / 1000000).toFixed(1)}tr</div><div className="stat-delta">Da thanh toan</div></div>
            </div>

            <div className="card">
                <div className="card-head">
                    <div className="card-title">Danh sach Reader</div>
                    <button type="button" className="btn-primary" onClick={openAdd}>+ Them Reader</button>
                </div>
            </div>

            <div className="g22">
                {readers.map(r => (
                    <div key={r.id} className="card">
                        <div className="card-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                                <button type="button" className="mav mav-lg" onClick={() => { setSelected(r); setModal('detail'); }}>{r.avatar || '*'}</button>
                                <div>
                                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '.92rem', fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
                                    <div style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>{r.specialty || r.title || 'Tarot Reader'}</div>
                                </div>
                            </div>
                            <div className="act-row">
                                <button type="button" className="ic-btn" title="Sua reader" onClick={() => openEdit(r)}>✎</button>
                                <button type="button" className="ic-btn" title="Chi tiet" onClick={() => { setSelected(r); setModal('detail'); }}>⊙</button>
                                <button type="button" className="ic-btn del" title="Xoa/an reader" onClick={() => { setSelected(r); setModal('delete'); }}>✕</button>
                            </div>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.5rem', marginBottom: '1rem' }}>
                                <StatBox val={r.sessions || r.bookings_count || '0'} label="Buoi" color="var(--text)" />
                                <StatBox val={r.rating || r.avg_rating || '0'} label="Rating" color="var(--gold)" />
                                <StatBox val={`${((r.revenue || 0) / 1000000).toFixed(1)}tr`} label="Doanh thu" color="var(--green)" />
                            </div>
                            <p style={{ minHeight: 44, margin: 0, color: 'var(--text-2)', fontSize: '.78rem', lineHeight: 1.55 }}>{r.bio || 'Chua co gioi thieu.'}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '.75rem', marginTop: '.85rem', borderTop: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '.68rem', color: 'var(--text-3)' }}>Tham gia {r.joined_at ? new Date(r.joined_at).toLocaleDateString('vi-VN', { month: '2-digit', year: '2-digit' }) : 'N/A'}</span>
                                <span className={`badge ${r.is_active === false ? 'b-rose' : 'b-green'}`}><span className="badge-dot"></span>{r.is_active === false ? 'Tam an' : 'Hoat dong'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={modal === 'add'} onClose={closeModal} title="Them Reader moi" size="lg">
                <ReaderForm form={form} setForm={setForm} onSubmit={handleAddReader} submitLabel="Them Reader" />
            </Modal>

            <Modal isOpen={modal === 'edit'} onClose={closeModal} title={`Sua Reader ${selected?.name || ''}`} size="lg">
                <ReaderForm form={form} setForm={setForm} onSubmit={handleUpdateReader} submitLabel="Luu thay doi" />
            </Modal>

            <Modal isOpen={modal === 'detail'} onClose={closeModal} title={`Ho so Reader ${selected?.name || ''}`} size="md">
                {selected && (
                    <div className="detail-panel">
                        <InfoRow label="Ten" value={selected.name} />
                        <InfoRow label="Email" value={selected.email} />
                        <InfoRow label="Dien thoai" value={selected.phone} />
                        <InfoRow label="Chuyen mon" value={selected.specialty || selected.title} />
                        <InfoRow label="So buoi" value={selected.sessions || selected.bookings_count || 0} />
                        <InfoRow label="Rating" value={selected.rating || selected.avg_rating || 0} />
                        <InfoRow label="Trang thai" value={selected.is_active === false ? 'Tam an' : 'Hoat dong'} />
                        <InfoRow label="Gioi thieu" value={selected.bio} />
                    </div>
                )}
            </Modal>

            <ConfirmModal
                isOpen={modal === 'delete'}
                onClose={closeModal}
                title="Xoa hoac an Reader"
                message={`Xoa Reader ${selected?.name || ''}? Neu reader da co lich, he thong se an thay vi xoa han.`}
                confirmLabel="Xac nhan"
                danger
                onConfirm={handleDeleteReader}
            />
        </div>
    );
}
