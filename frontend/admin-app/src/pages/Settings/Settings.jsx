import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const EMPTY_SETTINGS = {
    brand_name: 'Luna Arcana',
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    bank_name: '',
    bank_bin: '970436',
    bank_account_number: '',
    bank_account_name: '',
    bank_transfer_prefix: 'LUNA',
    reader_commission_percent: 30,
};

export default function Settings() {
    const showToast = useToast();
    const [settings, setSettings] = useState(EMPTY_SETTINGS);
    const [passForm, setPassForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            api.admin.settings.get(),
            api.admin.actionLogs.getAll(),
        ])
            .then(([settingsData, logsData]) => {
                setSettings({ ...EMPTY_SETTINGS, ...settingsData });
                setLogs(logsData || []);
            })
            .catch(err => showToast(err.message || 'Loi tai cau hinh', 'error'))
            .finally(() => setLoading(false));
    }, [showToast]);

    async function saveSettings(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.admin.settings.update({
                ...settings,
                reader_commission_percent: Number(settings.reader_commission_percent) || 0,
            });
            setSettings({ ...EMPTY_SETTINGS, ...(res.settings || settings) });
            showToast('Da luu cau hinh');
        } catch (err) {
            showToast(err.message || 'Loi luu cau hinh', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function changePassword(e) {
        e.preventDefault();
        if (passForm.new_password !== passForm.new_password_confirmation) {
            showToast('Xac nhan mat khau khong khop', 'error');
            return;
        }
        try {
            await api.profile.changePassword(passForm);
            setPassForm({ current_password: '', new_password: '', new_password_confirmation: '' });
            showToast('Da doi mat khau');
        } catch (err) {
            showToast(err.message || 'Loi doi mat khau', 'error');
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Dang tai...</div>;

    return (
        <div className="g2">
            <div className="col-stack">
                <form className="card" onSubmit={saveSettings}>
                    <div className="card-head"><div className="card-title">Cau hinh van hanh</div></div>
                    <div className="card-body">
                        <div className="form-row">
                            <div><label className="label">Ten thuong hieu</label><input className="input" value={settings.brand_name} onChange={e => setSettings(p => ({ ...p, brand_name: e.target.value }))} /></div>
                            <div><label className="label">Email lien he</label><input className="input" type="email" value={settings.contact_email} onChange={e => setSettings(p => ({ ...p, contact_email: e.target.value }))} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">So dien thoai</label><input className="input" value={settings.contact_phone} onChange={e => setSettings(p => ({ ...p, contact_phone: e.target.value }))} /></div>
                            <div><label className="label">Dia chi</label><input className="input" value={settings.contact_address} onChange={e => setSettings(p => ({ ...p, contact_address: e.target.value }))} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">Ngan hang</label><input className="input" value={settings.bank_name} onChange={e => setSettings(p => ({ ...p, bank_name: e.target.value }))} /></div>
                            <div><label className="label">Bank BIN / VietQR code</label><input className="input" placeholder="970436" value={settings.bank_bin} onChange={e => setSettings(p => ({ ...p, bank_bin: e.target.value }))} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">So tai khoan</label><input className="input" value={settings.bank_account_number} onChange={e => setSettings(p => ({ ...p, bank_account_number: e.target.value }))} /></div>
                            <div><label className="label">Chu tai khoan</label><input className="input" value={settings.bank_account_name} onChange={e => setSettings(p => ({ ...p, bank_account_name: e.target.value }))} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">Tien to noi dung CK</label><input className="input" value={settings.bank_transfer_prefix} onChange={e => setSettings(p => ({ ...p, bank_transfer_prefix: e.target.value }))} /></div>
                            <div><label className="label">Hoa hong Reader (%)</label><input className="input" type="number" min="0" max="100" value={settings.reader_commission_percent} onChange={e => setSettings(p => ({ ...p, reader_commission_percent: e.target.value }))} /></div>
                        </div>
                        <button className="form-submit" type="submit" disabled={saving}>{saving ? 'Dang luu...' : 'Luu cau hinh'}</button>
                    </div>
                </form>

                <form className="card" onSubmit={changePassword}>
                    <div className="card-head"><div className="card-title">Bao mat</div></div>
                    <div className="card-body">
                        <div className="form-group"><label className="label">Mat khau hien tai</label><input type="password" className="input" value={passForm.current_password} onChange={e => setPassForm(p => ({ ...p, current_password: e.target.value }))} /></div>
                        <div className="form-group"><label className="label">Mat khau moi</label><input type="password" className="input" value={passForm.new_password} onChange={e => setPassForm(p => ({ ...p, new_password: e.target.value }))} /></div>
                        <div className="form-group"><label className="label">Xac nhan mat khau moi</label><input type="password" className="input" value={passForm.new_password_confirmation} onChange={e => setPassForm(p => ({ ...p, new_password_confirmation: e.target.value }))} /></div>
                        <button className="form-submit" type="submit">Doi mat khau</button>
                    </div>
                </form>
            </div>

            <div className="card">
                <div className="card-head"><div className="card-title">Nhat ky admin</div></div>
                <div style={{ padding: '0 1.2rem 1.2rem' }}>
                    {logs.length === 0 ? (
                        <div style={{ padding: '1rem 0', color: 'var(--text-3)', fontSize: '.82rem' }}>Chua co thao tac nao.</div>
                    ) : logs.map(log => (
                        <div key={log.id} style={{ padding: '.85rem 0', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--text)', fontSize: '.82rem', fontWeight: 600 }}>{log.action}</div>
                            <div style={{ color: 'var(--text-3)', fontSize: '.7rem', marginTop: '.2rem' }}>
                                {log.user?.name || 'System'} · {new Date(log.created_at).toLocaleString('vi-VN')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
