import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api/index.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { Modal } from '../../components/Modal/Modal.jsx';

const EMPTY_BOOKING_FORM = {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_id: '',
    booked_at: '',
    note: '',
    zoom_link: '',
};

const STATUS_LABELS = {
    pending: 'Cho xac nhan',
    confirmed: 'Da xac nhan',
    completion_pending: 'Cho khach xac nhan',
    completed: 'Hoan thanh',
    cancelled: 'Da huy',
};

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function StatusBadge({ status }) {
    const cls = status === 'confirmed' ? 'b-green'
        : status === 'completion_pending' ? 'b-cyan'
        : status === 'completed' ? 'b-gold'
            : status === 'cancelled' ? 'b-rose'
                : 'b-amber';

    return <span className={`badge ${cls}`}><span className="badge-dot"></span>{STATUS_LABELS[status] || status}</span>;
}

function toInputDateTime(value) {
    if (!value) return '';
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return '';
    const pad = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ReaderPortal() {
    const showToast = useToast();
    const [me, setMe] = useState(null);
    const [stats, setStats] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [services, setServices] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [profile, setProfile] = useState({ bio: '', phone: '' });
    const [bookingForm, setBookingForm] = useState(EMPTY_BOOKING_FORM);
    const [editing, setEditing] = useState(null);
    const [availability, setAvailability] = useState([]);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    const loadAll = useCallback(async () => {
        try {
            const [meData, statsData, bookingsData, servicesData, availabilityData] = await Promise.all([
                api.reader.me(),
                api.reader.stats(),
                api.reader.bookings(),
                api.reader.services(),
                api.reader.availability(),
            ]);
            setMe(meData);
            setStats(statsData);
            setBookings(bookingsData || []);
            setServices(servicesData || []);
            setAvailability(availabilityData || []);
            setProfile({ bio: meData?.bio || '', phone: meData?.phone || '' });
        } catch (err) {
            showToast(err.message || 'Loi tai du lieu reader', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        const id = setTimeout(() => {
            loadAll();
        }, 0);

        return () => clearTimeout(id);
    }, [loadAll]);

    async function refreshBookings() {
        const [statsData, bookingsData] = await Promise.all([
            api.reader.stats(),
            api.reader.bookings(),
        ]);
        setStats(statsData);
        setBookings(bookingsData || []);
    }

    const rows = useMemo(
        () => filter === 'all' ? bookings : bookings.filter(item => item.status === filter),
        [bookings, filter],
    );

    function updateBookingForm(field, value) {
        setBookingForm(prev => ({ ...prev, [field]: value }));
    }

    function startEdit(row) {
        setEditing(row);
        setBookingForm({
            customer_name: row.user || '',
            customer_email: row.user_email || '',
            customer_phone: '',
            service_id: String(row.service_id || ''),
            booked_at: toInputDateTime(row.booked_at_iso),
            note: row.note || '',
            zoom_link: row.zoom_link || '',
        });
    }

    function resetBookingForm() {
        setEditing(null);
        setBookingForm(EMPTY_BOOKING_FORM);
    }

    async function submitBooking(event) {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...bookingForm,
                service_id: Number(bookingForm.service_id),
                booked_at: bookingForm.booked_at,
            };

            if (editing) {
                const updated = await api.reader.updateBooking(editing.id, {
                    service_id: payload.service_id,
                    booked_at: payload.booked_at,
                    note: payload.note,
                    zoom_link: payload.zoom_link,
                });
                setBookings(prev => prev.map(item => item.id === updated.id ? updated : item));
                showToast('Da cap nhat lich');
            } else {
                const created = await api.reader.createBooking(payload);
                setBookings(prev => [created, ...prev]);
                showToast('Da tao lich');
            }

            resetBookingForm();
            await refreshBookings();
        } catch (err) {
            showToast(err.message || 'Loi luu lich', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function runAction(row, action) {
        if (action === 'cancel') {
            setCancelTarget(row);
            setCancelReason('');
            return;
        }

        const key = `${action}-${row.id}`;
        setActionLoading(key);
        try {
            if (action === 'confirm') await api.reader.confirmBooking(row.id);
            if (action === 'complete') await api.reader.completeBooking(row.id);
            await refreshBookings();
            showToast('Da cap nhat lich');
        } catch (err) {
            showToast(err.message || 'Loi cap nhat lich', 'error');
        } finally {
            setActionLoading('');
        }
    }

    async function confirmCancelBooking() {
        if (!cancelTarget) return;
        if (cancelReason.trim().length < 5) {
            showToast('Vui long nhap ly do huy it nhat 5 ky tu.', 'error');
            return;
        }

        const key = `cancel-${cancelTarget.id}`;
        setActionLoading(key);
        try {
            await api.reader.cancelBooking(cancelTarget.id, { cancel_reason: cancelReason.trim() });
            setCancelTarget(null);
            setCancelReason('');
            await refreshBookings();
            showToast('Da huy lich');
        } catch (err) {
            showToast(err.message || 'Loi huy lich', 'error');
        } finally {
            setActionLoading('');
        }
    }

    async function saveProfile(event) {
        event.preventDefault();
        setSaving(true);
        try {
            await api.reader.updateProfile(profile);
            setMe(prev => ({ ...prev, ...profile }));
            showToast('Da cap nhat ho so reader');
        } catch (err) {
            showToast(err.message || 'Loi cap nhat ho so', 'error');
        } finally {
            setSaving(false);
        }
    }

    function updateAvailability(index, field, value) {
        setAvailability(prev => prev.map((item, itemIndex) => (
            itemIndex === index ? { ...item, [field]: value } : item
        )));
    }

    async function saveAvailability(event) {
        event.preventDefault();
        setSaving(true);
        try {
            const saved = await api.reader.updateAvailability(availability);
            setAvailability(saved || []);
            showToast('Da cap nhat gio lam viec');
        } catch (err) {
            showToast(err.message || 'Loi cap nhat gio lam viec', 'error');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Dang tai...</div>;

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-violet"><div className="stat-icon">◇</div><div className="stat-lbl">Tong lich</div><div className="stat-val">{stats?.total_bookings || 0}</div><div className="stat-delta">{stats?.bookings_month || 0} lich thang nay</div></div>
                <div className="stat-card c-amber"><div className="stat-icon">!</div><div className="stat-lbl">Cho xu ly</div><div className="stat-val">{stats?.bookings_pending || 0}</div><div className="stat-delta">Lich dang cho</div></div>
                <div className="stat-card c-green"><div className="stat-icon">✓</div><div className="stat-lbl">Sap toi</div><div className="stat-val">{stats?.bookings_upcoming || 0}</div><div className="stat-delta">{stats?.bookings_today || 0} lich hom nay</div></div>
                <div className="stat-card c-gold"><div className="stat-icon">◆</div><div className="stat-lbl">Doanh thu thang</div><div className="stat-val">{((stats?.revenue_month || 0) / 1000000).toFixed(1)}tr</div><div className="stat-delta">Lich da thanh toan</div></div>
            </div>

            <div className="g2">
                <div className="card">
                    <div className="card-head">
                        <div>
                            <div className="card-title">Lich cua toi</div>
                            <div className="card-meta">{me?.name || 'Reader'} / {me?.title || 'Tarot Reader'}</div>
                        </div>
                        <div className="tabs" style={{ border: 0, margin: 0 }}>
                            {[
                                ['all', 'Tat ca'],
                                ['pending', 'Cho'],
                                ['confirmed', 'Da xac nhan'],
                                ['completion_pending', 'Cho khach xac nhan'],
                                ['completed', 'Hoan thanh'],
                            ].map(([key, label]) => (
                                <button key={key} type="button" className={`tab-btn${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="tbl">
                            <thead><tr><th>Ma</th><th>Khach</th><th>Dich vu</th><th>Thoi gian</th><th>Thanh toan</th><th>Trang thai</th><th></th></tr></thead>
                            <tbody>
                                {rows.length ? rows.map(row => (
                                    <tr key={row.id}>
                                        <td className="tc-id">{row.code}</td>
                                        <td><div className="tc-name">{row.user}</div><div style={{ color: 'var(--text-3)', fontSize: '.68rem' }}>{row.user_email}</div></td>
                                        <td>{row.svc}<div style={{ color: 'var(--text-3)', fontSize: '.68rem' }}>{row.duration} phut</div></td>
                                        <td className="tc-mono">{row.booked_at}</td>
                                        <td className="tc-mono">{row.payment_status}</td>
                                        <td><StatusBadge status={row.status} /></td>
                                        <td>
                                            <div className="act-row">
                                                {row.status === 'pending' && <button type="button" className="ic-btn ok" title="Xac nhan" disabled={actionLoading === `confirm-${row.id}`} onClick={() => runAction(row, 'confirm')}>✓</button>}
                                                {row.status === 'confirmed' && row.payment_status === 'paid' && <button type="button" className="ic-btn ok" title="Hoan thanh" disabled={actionLoading === `complete-${row.id}`} onClick={() => runAction(row, 'complete')}>&#10003;&#10003;</button>}
                                                {['pending', 'confirmed'].includes(row.status) && <button type="button" className="ic-btn" title="Sua" onClick={() => startEdit(row)}>✎</button>}
                                                {['pending', 'confirmed'].includes(row.status) && <button type="button" className="ic-btn del" title="Huy" disabled={actionLoading === `cancel-${row.id}`} onClick={() => runAction(row, 'cancel')}>×</button>}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="7" style={{ color: 'var(--text-3)', padding: '1rem' }}>Chua co lich phu hop.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-stack">
                    <form className="card" onSubmit={submitBooking}>
                        <div className="card-head">
                            <div className="card-title">{editing ? `Sua lich ${editing.code}` : 'Them lich moi'}</div>
                            {editing && <button type="button" className="card-act" onClick={resetBookingForm}>Huy sua</button>}
                        </div>
                        <div className="card-body">
                            {!editing && (
                                <>
                                    <div className="form-group"><label className="label">Ten khach *</label><input className="input" value={bookingForm.customer_name} onChange={e => updateBookingForm('customer_name', e.target.value)} required /></div>
                                    <div className="form-group"><label className="label">Email khach</label><input className="input" type="email" value={bookingForm.customer_email} onChange={e => updateBookingForm('customer_email', e.target.value)} /></div>
                                    <div className="form-group"><label className="label">So dien thoai</label><input className="input" value={bookingForm.customer_phone} onChange={e => updateBookingForm('customer_phone', e.target.value)} /></div>
                                </>
                            )}
                            <div className="form-group">
                                <label className="label">Dich vu *</label>
                                <select className="sel" value={bookingForm.service_id} onChange={e => updateBookingForm('service_id', e.target.value)} required>
                                    <option value="">Chon dich vu</option>
                                    {services.map(service => <option key={service.id} value={service.id}>{service.name} - {service.duration} phut</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label className="label">Thoi gian *</label><input className="input" type="datetime-local" value={bookingForm.booked_at} onChange={e => updateBookingForm('booked_at', e.target.value)} required /></div>
                            <div className="form-group"><label className="label">Zoom link</label><input className="input" value={bookingForm.zoom_link} onChange={e => updateBookingForm('zoom_link', e.target.value)} placeholder="https://..." /></div>
                            <div className="form-group"><label className="label">Ghi chu</label><textarea className="textarea" value={bookingForm.note} onChange={e => updateBookingForm('note', e.target.value)} /></div>
                            <button type="submit" className="form-submit" disabled={saving}>{saving ? 'Dang luu...' : editing ? 'Cap nhat lich' : 'Tao lich'}</button>
                        </div>
                    </form>

                    <form className="card" onSubmit={saveProfile}>
                        <div className="card-head"><div className="card-title">Ho so reader</div></div>
                        <div className="card-body">
                            <div className="form-group"><label className="label">Ten reader</label><input className="input" value={me?.name || ''} disabled /></div>
                            <div className="form-group"><label className="label">So dien thoai</label><input className="input" value={profile.phone || ''} onChange={e => setProfile(prev => ({ ...prev, phone: e.target.value }))} /></div>
                            <div className="form-group"><label className="label">Gioi thieu</label><textarea className="textarea" value={profile.bio || ''} onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))} /></div>
                            <button type="submit" className="form-submit" disabled={saving}>{saving ? 'Dang luu...' : 'Luu ho so'}</button>
                        </div>
                    </form>

                    <form className="card" onSubmit={saveAvailability}>
                        <div className="card-head">
                            <div>
                                <div className="card-title">Gio lam viec</div>
                                <div className="card-meta">Khach chi dat duoc trong cac khung gio dang bat</div>
                            </div>
                        </div>
                        <div className="card-body" style={{ display: 'grid', gap: '.75rem' }}>
                            {availability.map((rule, index) => (
                                <div key={rule.weekday} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 1fr 72px', gap: '.5rem', alignItems: 'center' }}>
                                    <div className="tc-id">{WEEKDAYS[rule.weekday]}</div>
                                    <input
                                        className="input"
                                        type="time"
                                        value={rule.start_time}
                                        disabled={!rule.is_active}
                                        onChange={e => updateAvailability(index, 'start_time', e.target.value)}
                                    />
                                    <input
                                        className="input"
                                        type="time"
                                        value={rule.end_time}
                                        disabled={!rule.is_active}
                                        onChange={e => updateAvailability(index, 'end_time', e.target.value)}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '.35rem', color: 'var(--text-2)', fontSize: '.78rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(rule.is_active)}
                                            onChange={e => updateAvailability(index, 'is_active', e.target.checked)}
                                        />
                                        Bat
                                    </label>
                                </div>
                            ))}
                            <button type="submit" className="form-submit" disabled={saving || availability.length !== 7}>{saving ? 'Dang luu...' : 'Luu gio lam viec'}</button>
                        </div>
                    </form>
                </div>
            </div>

            <Modal
                isOpen={Boolean(cancelTarget)}
                onClose={() => { setCancelTarget(null); setCancelReason(''); }}
                title={`Huy lich ${cancelTarget?.code || ''}`}
                size="sm"
                footer={(
                    <>
                        <button type="button" className="btn-secondary" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Dong</button>
                        <button type="button" className="btn-danger" onClick={confirmCancelBooking} disabled={actionLoading === `cancel-${cancelTarget?.id}`}>
                            {actionLoading === `cancel-${cancelTarget?.id}` ? 'Dang huy...' : 'Huy lich'}
                        </button>
                    </>
                )}
            >
                <div style={{ display: 'grid', gap: '.75rem' }}>
                    <p className="modal-text">Vui long nhap ly do huy de admin va khach nam duoc tinh huong.</p>
                    <textarea
                        className="input"
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                        placeholder="Nhap ly do huy lich"
                        rows={4}
                        style={{ minHeight: 96, resize: 'vertical' }}
                    />
                </div>
            </Modal>
        </div>
    );
}
