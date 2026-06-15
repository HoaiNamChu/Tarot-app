import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { ConfirmModal, InfoRow, Modal } from '../../components/Modal/Modal.jsx';
import PasswordInput from '../../components/PasswordInput/PasswordInput.jsx';

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    password: '',
    customer_type: 'active',
    customer_status: 'active',
    internal_note: '',
};

function UserBadge({ user }) {
    if (user?.status === 'inactive' || user?.type === 'inactive') {
        return <span className="badge b-rose"><span className="badge-dot"></span>Khong HD</span>;
    }
    if (user?.type === 'vip') return <span className="badge b-gold"><span className="badge-dot"></span>VIP</span>;
    if (user?.type === 'new') return <span className="badge b-cyan"><span className="badge-dot"></span>Moi</span>;
    return <span className="badge b-green"><span className="badge-dot"></span>Hoat dong</span>;
}

function UserForm({ form, setForm, onSubmit, submitLabel, isEdit = false }) {
    return (
        <form onSubmit={onSubmit}>
            <div className="form-row">
                <div>
                    <label className="label">Ho va ten *</label>
                    <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                    <label className="label">Email *</label>
                    <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
            </div>
            <div className="form-row">
                <div>
                    <label className="label">So dien thoai</label>
                    <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0xxx xxx xxx" />
                </div>
                <div>
                    <label className="label">{isEdit ? 'Mat khau moi' : 'Mat khau'}</label>
                    <PasswordInput value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={isEdit ? 'De trong neu khong doi' : 'Tu tao neu de trong'} />
                </div>
            </div>
            <div className="form-row">
                <div>
                    <label className="label">Phan loai</label>
                    <select className="sel" value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })}>
                        <option value="active">Khach thuong</option>
                        <option value="vip">Khach VIP</option>
                        <option value="new">Khach moi</option>
                        <option value="inactive">Khong hoat dong</option>
                    </select>
                </div>
                <div>
                    <label className="label">Trang thai</label>
                    <button type="button" className={`toggle ${form.customer_status !== 'inactive' ? 'on' : ''}`} onClick={() => setForm({ ...form, customer_status: form.customer_status === 'inactive' ? 'active' : 'inactive' })} aria-label="Doi trang thai">
                        <span className="toggle-slider"></span>
                    </button>
                </div>
            </div>
            <div className="form-group">
                <label className="label">Ghi chu noi bo</label>
                <textarea className="textarea" value={form.internal_note || ''} onChange={(e) => setForm({ ...form, internal_note: e.target.value })} placeholder="Vi du: Khach VIP, uu tien lich cuoi tuan..." />
            </div>
            <div className="modal-footer" style={{ margin: '1.25rem -1.35rem -1.25rem' }}>
                <button type="submit" className="btn-primary">{submitLabel}</button>
            </div>
        </form>
    );
}

export default function Users() {
    const showToast = useToast();
    const { onAddBooking } = useOutletContext();
    const [filter, setFilter] = useState('all');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        api.admin.users.getAll()
            .then(data => setUsers(data || []))
            .catch(err => {
                console.error('Users fetch error:', err);
                showToast('Loi tai danh sach khach hang', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    const rows = filter === 'all'
        ? users
        : users.filter(u => filter === 'inactive' ? (u.status === 'inactive' || u.type === 'inactive') : u.type === filter);

    function closeModal() {
        setSelected(null);
        setModal(null);
        setForm(emptyForm);
    }

    function openAdd() {
        setSelected(null);
        setForm(emptyForm);
        setModal('add');
    }

    function openEdit(user) {
        setSelected(user);
        setForm({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            password: '',
            customer_type: user.type || 'active',
            customer_status: user.status || 'active',
            internal_note: user.internal_note || '',
        });
        setModal('edit');
    }

    function openModal(type, user) {
        setSelected(user);
        setForm({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            password: '',
            customer_type: user?.type || 'active',
            customer_status: user?.status || 'active',
            internal_note: user?.internal_note || '',
        });
        setModal(type);
    }

    async function handleAdd(event) {
        event.preventDefault();
        try {
            const payload = { ...form };
            if (!payload.password) delete payload.password;
            const created = await api.admin.users.create(payload);
            setUsers(prev => [created, ...prev]);
            showToast('Da tao khach hang');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi tao khach hang', 'error');
        }
    }

    async function handleUpdate(event) {
        event.preventDefault();
        if (!selected) return;
        try {
            const payload = { ...form };
            if (!payload.password) delete payload.password;
            const updated = await api.admin.users.update(selected.id, payload);
            setUsers(prev => prev.map(u => u.id === selected.id ? updated : u));
            showToast('Da cap nhat khach hang');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi cap nhat khach hang', 'error');
        }
    }

    async function handleDelete() {
        if (!selected) return;
        try {
            await api.admin.users.delete(selected.id);
            setUsers(prev => (selected.total_bookings || selected.bookings_count)
                ? prev.map(u => u.id === selected.id ? { ...u, type: 'inactive', status: 'inactive' } : u)
                : prev.filter(u => u.id !== selected.id));
            showToast('Da cap nhat khach hang');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi xoa khach hang', 'error');
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Dang tai...</div>;

    const stats = {
        total: users.length,
        repeat_rate: users.length > 0 ? ((users.filter(u => u.total_bookings > 1).length / users.length) * 100).toFixed(0) : '0',
        avg_ltv: users.length > 0 ? (users.reduce((sum, u) => sum + (u.spent || 0), 0) / users.length).toFixed(1) : '0',
        vip: users.filter(u => u.type === 'vip').length,
    };

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-cyan"><div className="stat-icon">○</div><div className="stat-lbl">Tong khach hang</div><div className="stat-val">{stats.total}</div><div className="stat-delta">Toan bo tai khoan</div></div>
                <div className="stat-card c-green"><div className="stat-icon">♻</div><div className="stat-lbl">Quay lai lan 2+</div><div className="stat-val">{stats.repeat_rate}%</div><div className="stat-delta">Ty le trung thanh</div></div>
                <div className="stat-card c-gold"><div className="stat-icon">◆</div><div className="stat-lbl">LTV trung binh</div><div className="stat-val">{stats.avg_ltv}tr</div><div className="stat-delta">Lifetime value</div></div>
                <div className="stat-card c-violet"><div className="stat-icon">★</div><div className="stat-lbl">Khach VIP</div><div className="stat-val">{stats.vip}</div><div className="stat-delta">&gt;3 lich / thang</div></div>
            </div>

            <div className="card">
                <div className="card-head">
                    <div className="card-title">Danh sach khach hang</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                        <div className="tabs" style={{ border: 'none', margin: 0 }}>
                            {[['all', 'Tat ca'], ['vip', 'VIP'], ['new', 'Moi'], ['inactive', 'Khong HD']].map(([k, l]) => (
                                <button key={k} className={`tab-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
                            ))}
                        </div>
                        <button type="button" className="btn-primary" onClick={openAdd}>＋ Them</button>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                        <thead><tr><th>Khach hang</th><th>Email</th><th>SDT</th><th>Tong lich</th><th>Chi tieu</th><th>Dang ky</th><th>Loai</th><th></th></tr></thead>
                        <tbody>
                            {rows.map(u => (
                                <tr key={u.id}>
                                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><span className="mav">{u.name?.[0]?.toUpperCase() || 'U'}</span><span className="tc-name">{u.name}</span></div></td>
                                    <td className="tc-mono">{u.email}</td>
                                    <td className="tc-mono">{u.phone || '-'}</td>
                                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>{u.total_bookings || '0'}</td>
                                    <td className="tc-gold">{u.spent || '0'}tr</td>
                                    <td className="tc-mono">{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '-'}</td>
                                    <td><UserBadge user={u} /></td>
                                    <td>
                                        <div className="act-row">
                                            <button type="button" className="ic-btn" title="Chi tiet" onClick={() => openModal('detail', u)}>⊙</button>
                                            <button type="button" className="ic-btn" title="Sua" onClick={() => openEdit(u)}>✎</button>
                                            <button type="button" className="ic-btn" title="Lien he" onClick={() => openModal('contact', u)}>✉</button>
                                            <button type="button" className="ic-btn del" title="Xoa/khoa" onClick={() => openModal('delete', u)}>✕</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={modal === 'add'} onClose={closeModal} title="○ Them khach hang moi" size="md">
                <UserForm form={form} setForm={setForm} onSubmit={handleAdd} submitLabel="Tao tai khoan" />
            </Modal>

            <Modal isOpen={modal === 'edit'} onClose={closeModal} title="✎ Sua thong tin khach hang" size="md">
                <UserForm form={form} setForm={setForm} onSubmit={handleUpdate} submitLabel="Luu thay doi" isEdit />
            </Modal>

            <Modal
                isOpen={modal === 'detail'}
                onClose={closeModal}
                title="⊙ Chi tiet khach hang"
                size="xl"
                footer={(
                    <>
                        <button type="button" className="btn-secondary" onClick={closeModal}>Dong</button>
                        <button type="button" className="btn-secondary" onClick={() => selected && openEdit(selected)}>✎ Chinh sua</button>
                        <button type="button" className="btn-primary" onClick={() => { onAddBooking?.({ name: selected?.name, phone: selected?.phone }); closeModal(); }}>＋ Tao lich</button>
                    </>
                )}
            >
                {selected && (
                    <div className="detail-grid">
                        <div className="detail-panel">
                            <div className="detail-title">Ho so</div>
                            <InfoRow label="Ten" value={selected.name} />
                            <InfoRow label="Email" value={selected.email} />
                            <InfoRow label="SDT" value={selected.phone} />
                            <InfoRow label="Phan loai"><UserBadge user={selected} /></InfoRow>
                            <InfoRow label="Dang ky" value={selected.created_at ? new Date(selected.created_at).toLocaleDateString('vi-VN') : '-'} />
                        </div>
                        <div className="detail-panel">
                            <div className="detail-title">Thong ke</div>
                            <InfoRow label="Tong lich" value={selected.total_bookings || 0} />
                            <InfoRow label="Chi tieu" value={`${selected.spent || 0}tr`} />
                            <InfoRow label="Trang thai" value={selected.status === 'inactive' ? 'Khong hoat dong' : 'Hoat dong'} />
                            <InfoRow label="Ghi chu" value={selected.internal_note} />
                        </div>
                        <div className="detail-panel" style={{ gridColumn: '1 / -1' }}>
                            <div className="detail-title">Lich gan day</div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="tbl">
                                    <thead><tr><th>ID</th><th>Dich vu</th><th>Reader</th><th>Thoi gian</th><th>Gia</th><th>Trang thai</th></tr></thead>
                                    <tbody>
                                        {(selected.bookings || []).length ? selected.bookings.map(b => (
                                            <tr key={b.id}>
                                                <td className="tc-id">{b.code}</td>
                                                <td>{b.service || '-'}</td>
                                                <td>{b.reader || '-'}</td>
                                                <td className="tc-mono">{b.time || '-'}</td>
                                                <td className="tc-gold">{b.price || '-'}</td>
                                                <td>{b.status || '-'}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="6" style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>Chua co lich dat.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={modal === 'contact'}
                onClose={closeModal}
                title="✉ Lien he khach hang"
                size="sm"
                footer={<button type="button" className="btn-primary" onClick={() => { showToast('Da ghi nhan thao tac lien he'); closeModal(); }}>Da xu ly</button>}
            >
                <p className="modal-text">Dung thong tin ben duoi de lien he ho tro hoac xac nhan lich cho khach.</p>
                {selected && (
                    <div className="detail-panel" style={{ marginTop: '1rem' }}>
                        <InfoRow label="Email" value={selected.email} />
                        <InfoRow label="SDT" value={selected.phone} />
                    </div>
                )}
            </Modal>

            <ConfirmModal
                isOpen={modal === 'delete'}
                onClose={closeModal}
                title="Xoa hoac khoa khach hang"
                message={`Xoa khach hang ${selected?.name || ''}? Neu khach da co lich, he thong se chuyen sang khong hoat dong thay vi xoa han.`}
                confirmLabel="Xac nhan"
                danger
                onConfirm={handleDelete}
            />
        </div>
    );
}
