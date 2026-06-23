import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { ConfirmModal } from '../../components/Modal/Modal.jsx';

const EMPTY_SERVICE = {
    name: '',
    description: '',
    duration: 60,
    price: 0,
    is_active: true,
};

const POLICY_TYPES = [
    ['terms', 'Dieu khoan'],
    ['privacy', 'Bao mat'],
    ['payment', 'Thanh toan'],
    ['refund', 'Hoan tien'],
];

const EMPTY_POLICY = {
    title: '',
    updated: '',
    intro: '',
    sections: [],
};

function sectionsToText(sections = []) {
    return sections.map(section => `${section.heading || ''} | ${section.body || ''}`).join('\n');
}

function textToSections(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
            const [heading, ...bodyParts] = line.split('|');
            return {
                heading: heading.trim(),
                body: bodyParts.join('|').trim(),
            };
        })
        .filter(section => section.heading && section.body);
}

export default function Content() {
    const showToast = useToast();
    const [services, setServices] = useState([]);
    const [policies, setPolicies] = useState({});
    const [policyType, setPolicyType] = useState('terms');
    const [policyForm, setPolicyForm] = useState({ ...EMPTY_POLICY, sectionsText: '' });
    const [form, setForm] = useState(EMPTY_SERVICE);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingPolicy, setSavingPolicy] = useState(false);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        Promise.all([
            api.admin.services.getAll(),
            api.admin.policies.getAll(),
        ])
            .then(([servicesData, policiesData]) => {
                setServices(servicesData || []);
                setPolicies(policiesData || {});
                const firstPolicy = policiesData?.terms || EMPTY_POLICY;
                setPolicyForm({ ...firstPolicy, sectionsText: sectionsToText(firstPolicy.sections) });
            })
            .catch(err => showToast(err.message || 'Loi tai noi dung', 'error'))
            .finally(() => setLoading(false));
    }, [showToast]);

    function edit(service) {
        setEditingId(service.id);
        setForm({
            name: service.name || '',
            description: service.description || '',
            duration: service.duration || 60,
            price: service.price || 0,
            is_active: Boolean(service.is_active),
        });
    }

    function selectPolicy(type) {
        setPolicyType(type);
        const policy = policies[type] || EMPTY_POLICY;
        setPolicyForm({ ...policy, sectionsText: sectionsToText(policy.sections) });
    }

    async function submit(e) {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                duration: Number(form.duration),
                price: Number(form.price),
                is_active: Boolean(form.is_active),
            };
            if (editingId) {
                const updated = await api.admin.services.update(editingId, payload);
                setServices(prev => prev.map(s => s.id === editingId ? updated : s));
                showToast('Da cap nhat dich vu');
            } else {
                const created = await api.admin.services.create(payload);
                setServices(prev => [created, ...prev]);
                showToast('Da them dich vu');
            }
            setEditingId(null);
            setForm(EMPTY_SERVICE);
        } catch (err) {
            showToast(err.message || 'Loi luu dich vu', 'error');
        }
    }

    async function remove() {
        if (!deleting) return;
        try {
            await api.admin.services.delete(deleting.id);
            setServices(prev => prev.map(s => s.id === deleting.id ? { ...s, is_active: false } : s));
            showToast('Da xu ly dich vu');
            setDeleting(null);
        } catch (err) {
            showToast(err.message || 'Loi xoa dich vu', 'error');
        }
    }

    async function savePolicy(event) {
        event.preventDefault();
        const sections = textToSections(policyForm.sectionsText || '');
        if (!sections.length) {
            showToast('Vui long nhap it nhat mot muc theo dang: Tieu de | Noi dung', 'error');
            return;
        }

        setSavingPolicy(true);
        try {
            const res = await api.admin.policies.update(policyType, {
                title: policyForm.title,
                updated: policyForm.updated,
                intro: policyForm.intro,
                sections,
            });
            const saved = res.policy;
            setPolicies(prev => ({ ...prev, [policyType]: saved }));
            setPolicyForm({ ...saved, sectionsText: sectionsToText(saved.sections) });
            showToast('Da luu chinh sach');
        } catch (err) {
            showToast(err.message || 'Loi luu chinh sach', 'error');
        } finally {
            setSavingPolicy(false);
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Dang tai...</div>;

    return (
        <>
            <div className="g2">
                <div className="card">
                    <div className="card-head"><div className="card-title">Quan ly dich vu</div></div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="tbl">
                            <thead><tr><th>Dich vu</th><th>Thoi luong</th><th>Gia</th><th>Trang thai</th><th></th></tr></thead>
                            <tbody>
                                {services.map(service => (
                                    <tr key={service.id}>
                                        <td>
                                            <div className="tc-name">{service.name}</div>
                                            <div style={{ fontSize: '.7rem', color: 'var(--text-3)', maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.description}</div>
                                        </td>
                                        <td className="tc-mono">{service.duration} phut</td>
                                        <td className="tc-gold">{Number(service.price || 0).toLocaleString('vi-VN')}d</td>
                                        <td><span className={`badge ${service.is_active ? 'b-green' : 'b-rose'}`}><span className="badge-dot"></span>{service.is_active ? 'Hien thi' : 'An'}</span></td>
                                        <td>
                                            <div className="act-row">
                                                <button type="button" className="ic-btn" title="Sua dich vu" onClick={() => edit(service)}>Sua</button>
                                                <button type="button" className="ic-btn del" title="An/xoa dich vu" onClick={() => setDeleting(service)}>An</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <form className="card" onSubmit={submit}>
                    <div className="card-head"><div className="card-title">{editingId ? 'Sua dich vu' : 'Them dich vu'}</div></div>
                    <div className="card-body">
                        <div className="form-group"><label className="label">Ten dich vu</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
                        <div className="form-row">
                            <div><label className="label">Thoi luong phut</label><input className="input" type="number" min="1" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} required /></div>
                            <div><label className="label">Gia VND</label><input className="input" type="number" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required /></div>
                        </div>
                        <div className="form-group"><label className="label">Mo ta</label><textarea className="textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required /></div>
                        <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', color: 'var(--text-2)', fontSize: '.8rem', marginBottom: '1rem' }}>
                            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                            Hien thi tren user app
                        </label>
                        <div style={{ display: 'flex', gap: '.75rem' }}>
                            <button className="form-submit" type="submit">{editingId ? 'Luu thay doi' : 'Them dich vu'}</button>
                            {editingId && <button className="btn-ghost" type="button" onClick={() => { setEditingId(null); setForm(EMPTY_SERVICE); }}>Huy</button>}
                        </div>
                    </div>
                </form>
            </div>

            <form className="card" onSubmit={savePolicy}>
                <div className="card-head">
                    <div>
                        <div className="card-title">Quan ly chinh sach</div>
                        <div className="card-meta">Noi dung hien tren user app</div>
                    </div>
                    <div className="tabs" style={{ border: 0, margin: 0 }}>
                        {POLICY_TYPES.map(([type, label]) => (
                            <button type="button" key={type} className={`tab-btn${policyType === type ? ' active' : ''}`} onClick={() => selectPolicy(type)}>{label}</button>
                        ))}
                    </div>
                </div>
                <div className="card-body">
                    <div className="form-row">
                        <div><label className="label">Tieu de</label><input className="input" value={policyForm.title} onChange={e => setPolicyForm(p => ({ ...p, title: e.target.value }))} required /></div>
                        <div><label className="label">Ngay cap nhat</label><input className="input" value={policyForm.updated} onChange={e => setPolicyForm(p => ({ ...p, updated: e.target.value }))} required /></div>
                    </div>
                    <div className="form-group"><label className="label">Mo dau</label><textarea className="textarea" value={policyForm.intro} onChange={e => setPolicyForm(p => ({ ...p, intro: e.target.value }))} required /></div>
                    <div className="form-group">
                        <label className="label">Cac muc chinh sach</label>
                        <textarea className="textarea" rows="8" value={policyForm.sectionsText} onChange={e => setPolicyForm(p => ({ ...p, sectionsText: e.target.value }))} placeholder="Tieu de muc | Noi dung muc" required />
                        <div className="field-hint">Moi dong mot muc, dung dinh dang: Tieu de muc | Noi dung muc</div>
                    </div>
                    <button className="form-submit" type="submit" disabled={savingPolicy}>{savingPolicy ? 'Dang luu...' : 'Luu chinh sach'}</button>
                </div>
            </form>

            <ConfirmModal
                isOpen={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                title="An hoac xoa dich vu"
                message={`An/xoa dich vu "${deleting?.name || ''}"? Neu dich vu da co booking, he thong se an thay vi xoa han.`}
                confirmLabel="Xac nhan"
                danger
                onConfirm={remove}
            />
        </>
    );
}
