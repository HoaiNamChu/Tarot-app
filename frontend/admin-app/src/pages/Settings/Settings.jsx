import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import PasswordInput from '../../components/PasswordInput/PasswordInput.jsx';

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
    payment_vnpay_enabled: true,
    payment_bank_enabled: true,
    payment_momo_enabled: false,
    momo_phone: '',
    momo_account_name: '',
    momo_transfer_prefix: 'MOMO',
    vnpay_gateway_configured: false,
    vnpay_hash_secret_configured: false,
    vnpay_tmn_code: '',
    vnpay_hash_secret: '',
    vnpay_url: '',
    vnpay_return_url: '',
    vnpay_ipn_url: '',
    momo_gateway_configured: false,
    momo_secret_key_configured: false,
    momo_partner_code: '',
    momo_access_key: '',
    momo_secret_key: '',
    momo_endpoint: '',
    momo_redirect_url: '',
    momo_ipn_url: '',
    momo_lang: 'vi',
    reader_commission_percent: 30,
};

function GatewayBadge({ configured }) {
    return (
        <span className={`badge ${configured ? 'b-green' : 'b-rose'}`}>
            <span className="badge-dot"></span>{configured ? 'Da cau hinh' : 'Thieu cau hinh'}
        </span>
    );
}

function SecretField({ label, configured, value, onChange }) {
    return (
        <div>
            <label className="label">{label} {configured ? '(da co)' : '(chua co)'}</label>
            <PasswordInput
                hideToggleWhenEmpty
                placeholder={configured ? 'Secret da luu - nhap secret moi neu muon doi' : 'Nhap secret'}
                value={value || ''}
                onChange={onChange}
            />
            {configured && !value && (
                <div className="field-hint">Secret hien tai dang duoc luu an toan va khong hien lai tren trinh duyet.</div>
            )}
        </div>
    );
}

export default function Settings() {
    const showToast = useToast();
    const [settings, setSettings] = useState(EMPTY_SETTINGS);
    const [savedSettings, setSavedSettings] = useState(EMPTY_SETTINGS);
    const [passForm, setPassForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingSection, setSavingSection] = useState('');

    useEffect(() => {
        Promise.all([
            api.admin.settings.get(),
            api.admin.actionLogs.getAll(),
        ])
            .then(([settingsData, logsData]) => {
                const merged = { ...EMPTY_SETTINGS, ...settingsData };
                setSettings(merged);
                setSavedSettings(merged);
                setLogs(logsData || []);
            })
            .catch(err => showToast(err.message || 'Loi tai cau hinh', 'error'))
            .finally(() => setLoading(false));
    }, [showToast]);

    function updateField(field, value) {
        setSettings(prev => ({ ...prev, [field]: value }));
    }

    function normalizePayload(source) {
        return {
            ...source,
            payment_vnpay_enabled: Boolean(source.payment_vnpay_enabled),
            payment_bank_enabled: Boolean(source.payment_bank_enabled),
            payment_momo_enabled: Boolean(source.payment_momo_enabled),
            reader_commission_percent: Number(source.reader_commission_percent) || 0,
        };
    }

    const SECTION_FIELDS = {
        'cau hinh chung': ['brand_name', 'contact_email', 'contact_phone', 'contact_address', 'reader_commission_percent'],
        'ngan hang': ['payment_bank_enabled', 'bank_name', 'bank_bin', 'bank_account_number', 'bank_account_name', 'bank_transfer_prefix'],
        VNPay: ['payment_vnpay_enabled', 'vnpay_tmn_code', 'vnpay_hash_secret', 'vnpay_url', 'vnpay_return_url', 'vnpay_ipn_url'],
        MoMo: ['payment_momo_enabled', 'momo_phone', 'momo_account_name', 'momo_transfer_prefix', 'momo_lang', 'momo_partner_code', 'momo_access_key', 'momo_secret_key', 'momo_endpoint', 'momo_redirect_url', 'momo_ipn_url'],
    };

    function sectionPayload(sectionLabel) {
        const next = { ...savedSettings };
        for (const field of SECTION_FIELDS[sectionLabel] || []) {
            next[field] = settings[field];
        }
        return normalizePayload(next);
    }

    async function saveSettings(e, sectionLabel) {
        e.preventDefault();
        setSavingSection(sectionLabel);
        try {
            const res = await api.admin.settings.update(sectionPayload(sectionLabel));
            const merged = { ...EMPTY_SETTINGS, ...(res.settings || savedSettings) };
            const savedSecretFields = {
                ...(sectionLabel === 'VNPay' ? { vnpay_hash_secret: '' } : {}),
                ...(sectionLabel === 'MoMo' ? { momo_secret_key: '' } : {}),
            };
            setSettings(prev => ({
                ...prev,
                ...Object.fromEntries((SECTION_FIELDS[sectionLabel] || []).map(field => [field, merged[field]])),
                vnpay_gateway_configured: merged.vnpay_gateway_configured,
                vnpay_hash_secret_configured: merged.vnpay_hash_secret_configured,
                momo_gateway_configured: merged.momo_gateway_configured,
                momo_secret_key_configured: merged.momo_secret_key_configured,
                ...savedSecretFields,
            }));
            setSavedSettings(merged);
            showToast(`Da luu ${sectionLabel}`);
        } catch (err) {
            showToast(err.message || `Loi luu ${sectionLabel}`, 'error');
        } finally {
            setSavingSection('');
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
                <form className="card" onSubmit={(e) => saveSettings(e, 'cau hinh chung')}>
                    <div className="card-head"><div className="card-title">Cau hinh chung</div></div>
                    <div className="card-body">
                        <div className="form-row">
                            <div><label className="label">Ten thuong hieu</label><input className="input" value={settings.brand_name} onChange={e => updateField('brand_name', e.target.value)} /></div>
                            <div><label className="label">Email lien he</label><input className="input" type="email" value={settings.contact_email} onChange={e => updateField('contact_email', e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">So dien thoai</label><input className="input" value={settings.contact_phone} onChange={e => updateField('contact_phone', e.target.value)} /></div>
                            <div><label className="label">Dia chi</label><input className="input" value={settings.contact_address} onChange={e => updateField('contact_address', e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">Hoa hong Reader (%)</label><input className="input" type="number" min="0" max="100" value={settings.reader_commission_percent} onChange={e => updateField('reader_commission_percent', e.target.value)} /></div>
                            <div></div>
                        </div>
                        <button className="form-submit" type="submit" disabled={Boolean(savingSection)}>
                            {savingSection === 'cau hinh chung' ? 'Dang luu...' : 'Luu cau hinh chung'}
                        </button>
                    </div>
                </form>

                <form className="card" onSubmit={(e) => saveSettings(e, 'ngan hang')}>
                    <div className="card-head"><div className="card-title">Ngan hang / VietQR</div></div>
                    <div className="card-body">
                        <div className="form-row">
                            <label className="check-row">
                                <input type="checkbox" checked={Boolean(settings.payment_bank_enabled)} onChange={e => updateField('payment_bank_enabled', e.target.checked)} />
                                <span>Bat chuyen khoan/VietQR</span>
                            </label>
                            <div></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">Ngan hang</label><input className="input" value={settings.bank_name} onChange={e => updateField('bank_name', e.target.value)} /></div>
                            <div><label className="label">Bank BIN / VietQR code</label><input className="input" placeholder="970436" value={settings.bank_bin} onChange={e => updateField('bank_bin', e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">So tai khoan</label><input className="input" value={settings.bank_account_number} onChange={e => updateField('bank_account_number', e.target.value)} /></div>
                            <div><label className="label">Chu tai khoan</label><input className="input" value={settings.bank_account_name} onChange={e => updateField('bank_account_name', e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">Tien to noi dung CK</label><input className="input" value={settings.bank_transfer_prefix} onChange={e => updateField('bank_transfer_prefix', e.target.value)} /></div>
                            <div></div>
                        </div>
                        <button className="form-submit" type="submit" disabled={Boolean(savingSection)}>
                            {savingSection === 'ngan hang' ? 'Dang luu...' : 'Luu ngan hang'}
                        </button>
                    </div>
                </form>

                <form className="card" onSubmit={(e) => saveSettings(e, 'VNPay')}>
                    <div className="card-head">
                        <div className="card-title">VNPay</div>
                        <GatewayBadge configured={settings.vnpay_gateway_configured} />
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <label className="check-row">
                                <input type="checkbox" checked={Boolean(settings.payment_vnpay_enabled)} onChange={e => updateField('payment_vnpay_enabled', e.target.checked)} />
                                <span>Bat thanh toan VNPay</span>
                            </label>
                            <div></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">VNPay TMN Code</label><input className="input" value={settings.vnpay_tmn_code || ''} onChange={e => updateField('vnpay_tmn_code', e.target.value)} /></div>
                            <SecretField label="VNPay Hash Secret" configured={settings.vnpay_hash_secret_configured} value={settings.vnpay_hash_secret} onChange={e => updateField('vnpay_hash_secret', e.target.value)} />
                        </div>
                        <div className="form-row">
                            <div><label className="label">VNPay URL</label><input className="input" value={settings.vnpay_url || ''} onChange={e => updateField('vnpay_url', e.target.value)} /></div>
                            <div><label className="label">VNPay Return URL</label><input className="input" value={settings.vnpay_return_url || ''} onChange={e => updateField('vnpay_return_url', e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">VNPay IPN URL</label><input className="input" value={settings.vnpay_ipn_url || ''} onChange={e => updateField('vnpay_ipn_url', e.target.value)} /></div>
                            <div></div>
                        </div>
                        <button className="form-submit" type="submit" disabled={Boolean(savingSection)}>
                            {savingSection === 'VNPay' ? 'Dang luu...' : 'Luu VNPay'}
                        </button>
                    </div>
                </form>

                <form className="card" onSubmit={(e) => saveSettings(e, 'MoMo')}>
                    <div className="card-head">
                        <div className="card-title">MoMo</div>
                        <GatewayBadge configured={settings.momo_gateway_configured} />
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <label className="check-row">
                                <input type="checkbox" checked={Boolean(settings.payment_momo_enabled)} onChange={e => updateField('payment_momo_enabled', e.target.checked)} />
                                <span>Bat thanh toan MoMo</span>
                            </label>
                            <div></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">So vi MoMo</label><input className="input" value={settings.momo_phone} onChange={e => updateField('momo_phone', e.target.value)} /></div>
                            <div><label className="label">Ten chu vi MoMo</label><input className="input" value={settings.momo_account_name} onChange={e => updateField('momo_account_name', e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">Tien to noi dung MoMo</label><input className="input" value={settings.momo_transfer_prefix} onChange={e => updateField('momo_transfer_prefix', e.target.value)} /></div>
                            <div><label className="label">MoMo Lang</label><input className="input" value={settings.momo_lang || 'vi'} onChange={e => updateField('momo_lang', e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">MoMo Partner Code</label><input className="input" value={settings.momo_partner_code || ''} onChange={e => updateField('momo_partner_code', e.target.value)} /></div>
                            <div><label className="label">MoMo Access Key</label><input className="input" value={settings.momo_access_key || ''} onChange={e => updateField('momo_access_key', e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <SecretField label="MoMo Secret Key" configured={settings.momo_secret_key_configured} value={settings.momo_secret_key} onChange={e => updateField('momo_secret_key', e.target.value)} />
                            <div><label className="label">MoMo Endpoint</label><input className="input" value={settings.momo_endpoint || ''} onChange={e => updateField('momo_endpoint', e.target.value)} /></div>
                        </div>
                        <div className="form-row">
                            <div><label className="label">MoMo Redirect URL</label><input className="input" value={settings.momo_redirect_url || ''} onChange={e => updateField('momo_redirect_url', e.target.value)} /></div>
                            <div><label className="label">MoMo IPN URL</label><input className="input" value={settings.momo_ipn_url || ''} onChange={e => updateField('momo_ipn_url', e.target.value)} /></div>
                        </div>
                        <button className="form-submit" type="submit" disabled={Boolean(savingSection)}>
                            {savingSection === 'MoMo' ? 'Dang luu...' : 'Luu MoMo'}
                        </button>
                    </div>
                </form>

                <form className="card" onSubmit={changePassword}>
                    <div className="card-head"><div className="card-title">Bao mat</div></div>
                    <div className="card-body">
                        <div className="form-group"><label className="label">Mat khau hien tai</label><PasswordInput value={passForm.current_password} onChange={e => setPassForm(p => ({ ...p, current_password: e.target.value }))} /></div>
                        <div className="form-group"><label className="label">Mat khau moi</label><PasswordInput value={passForm.new_password} onChange={e => setPassForm(p => ({ ...p, new_password: e.target.value }))} /></div>
                        <div className="form-group"><label className="label">Xac nhan mat khau moi</label><PasswordInput value={passForm.new_password_confirmation} onChange={e => setPassForm(p => ({ ...p, new_password_confirmation: e.target.value }))} /></div>
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
