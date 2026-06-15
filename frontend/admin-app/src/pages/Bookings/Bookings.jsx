import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { ConfirmModal, InfoRow, Modal } from '../../components/Modal/Modal.jsx';

const ST = {
    pending: ['b-amber', 'Cho duyet'],
    confirmed: ['b-green', 'Da xac nhan'],
    completed: ['b-violet', 'Hoan thanh'],
    cancelled: ['b-rose', 'Da huy'],
};

const PAYMENT_ST = {
    unpaid: ['b-amber', 'Chua thanh toan'],
    pending_verification: ['b-amber', 'Cho xac minh'],
    paid: ['b-green', 'Da thanh toan'],
    refunded: ['b-rose', 'Da hoan'],
};

const TABS = [
    ['all', 'Tat ca'],
    ['pending', 'Cho duyet'],
    ['confirmed', 'Xac nhan'],
    ['completed', 'Hoan thanh'],
    ['cancelled', 'Da huy'],
];

const STATUS_ACTIONS = {
    confirm: {
        title: 'Xac nhan lich',
        message: (b) => `Xac nhan lich ${b?.code || ''} cho khach ${b?.user || ''}?`,
        confirmLabel: 'Xac nhan',
        nextStatus: 'confirmed',
        success: 'Da xac nhan lich',
        apiAction: 'confirm',
    },
    complete: {
        title: 'Hoan thanh lich',
        message: (b) => `Danh dau lich ${b?.code || ''} la da hoan thanh?`,
        confirmLabel: 'Hoan thanh',
        nextStatus: 'completed',
        success: 'Da hoan thanh lich',
        apiAction: 'complete',
    },
    cancel: {
        title: 'Huy lich',
        message: (b) => `Huy lich ${b?.code || ''}? Thao tac nay se cap nhat trang thai thanh da huy.`,
        confirmLabel: 'Huy lich',
        nextStatus: 'cancelled',
        success: 'Da huy lich',
        apiAction: 'cancel',
        danger: true,
    },
    undoPending: {
        title: 'Hoan tac ve cho duyet',
        message: (b) => `Dua lich ${b?.code || ''} ve trang thai cho duyet?`,
        confirmLabel: 'Hoan tac',
        nextStatus: 'pending',
        success: 'Da hoan tac ve cho duyet',
        undo: true,
    },
    undoConfirmed: {
        title: 'Hoan tac ve da xac nhan',
        message: (b) => `Dua lich ${b?.code || ''} ve trang thai da xac nhan?`,
        confirmLabel: 'Hoan tac',
        nextStatus: 'confirmed',
        success: 'Da hoan tac ve da xac nhan',
        undo: true,
    },
};

function Badge({ status, map = ST }) {
    const item = map[status] || ['b-amber', status || '-'];
    return <span className={`badge ${item[0]}`}><span className="badge-dot"></span>{item[1]}</span>;
}

export default function Bookings() {
    const showToast = useToast();
    const [filter, setFilter] = useState('all');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [modal, setModal] = useState(null);
    const [statusAction, setStatusAction] = useState(null);
    const [zoomLink, setZoomLink] = useState('');
    const [paymentForm, setPaymentForm] = useState({
        payment_status: 'paid',
        payment_method: 'bank',
        refund_amount: '',
        refund_reference: '',
        refund_reason: '',
        refund_note: '',
    });

    useEffect(() => {
        api.admin.bookings.getAll()
            .then(data => setBookings(data || []))
            .catch(() => {
                console.error('Bookings fetch error');
                showToast('Loi tai du lieu lich dat', 'error');
            })
            .finally(() => setLoading(false));
    }, [showToast]);

    const rows = useMemo(
        () => filter === 'all' ? bookings : bookings.filter(b => b.status === filter),
        [bookings, filter],
    );

    function openModal(type, booking) {
        setSelected(booking);
        setModal(type);
        setZoomLink(booking?.zoom_link || '');
        setPaymentForm({
            payment_status: booking?.payment_status || 'paid',
            payment_method: booking?.payment_method || 'bank',
            refund_amount: booking?.refund_amount || booking?.amount || '',
            refund_reference: booking?.refund_reference || '',
            refund_reason: booking?.refund_reason || '',
            refund_note: booking?.refund_note || '',
        });
    }

    function closeModal() {
        setModal(null);
        setSelected(null);
        setStatusAction(null);
        setPaymentForm({
            payment_status: 'paid',
            payment_method: 'bank',
            refund_amount: '',
            refund_reference: '',
            refund_reason: '',
            refund_note: '',
        });
    }

    function patchBooking(id, patch) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
        setSelected(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
    }

    function openStatusModal(actionKey, booking) {
        setSelected(booking);
        setStatusAction(actionKey);
        setModal('status');
    }

    async function handleStatus() {
        if (!selected) return;
        const action = STATUS_ACTIONS[statusAction];
        if (!action) return;

        try {
            if (action.undo) {
                await api.admin.bookings.updateStatus(selected.id, action.nextStatus);
            } else {
                await api.admin.bookings[action.apiAction](selected.id);
            }

            patchBooking(selected.id, { status: action.nextStatus });
            showToast(action.success);
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi cap nhat lich', 'error');
        }
    }

    async function handleZoomSubmit(event) {
        event.preventDefault();
        if (!selected) return;
        try {
            await api.admin.bookings.setZoom(selected.id, zoomLink);
            patchBooking(selected.id, { zoom_link: zoomLink });
            showToast('Da cap nhat link Zoom');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi cap nhat Zoom', 'error');
        }
    }

    async function handlePaymentSubmit(event) {
        event.preventDefault();
        if (!selected) return;
        try {
            await api.admin.bookings.updatePayment(selected.id, paymentForm);
            patchBooking(selected.id, paymentForm);
            showToast('Da cap nhat thanh toan');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi cap nhat thanh toan', 'error');
        }
    }

    if (loading) return <div style={{ padding: '2rem' }}>Dang tai...</div>;

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-amber"><div className="stat-icon">⏳</div><div className="stat-lbl">Cho xac nhan</div><div className="stat-val">{bookings.filter(b => b.status === 'pending').length}</div><div className="stat-delta">Can xu ly</div></div>
                <div className="stat-card c-green"><div className="stat-icon">✓</div><div className="stat-lbl">Da xac nhan</div><div className="stat-val">{bookings.filter(b => b.status === 'confirmed').length}</div><div className="stat-delta">{bookings.filter(b => b.status === 'completed').length} da hoan thanh</div></div>
                <div className="stat-card c-violet"><div className="stat-icon">◷</div><div className="stat-lbl">Tong lich</div><div className="stat-val">{bookings.length}</div><div className="stat-delta">Tat ca booking</div></div>
                <div className="stat-card c-rose"><div className="stat-icon">✕</div><div className="stat-lbl">Da huy</div><div className="stat-val">{bookings.filter(b => b.status === 'cancelled').length}</div><div className="stat-delta">{bookings.length > 0 ? ((bookings.filter(b => b.status === 'cancelled').length / bookings.length) * 100).toFixed(1) : '0'}% ty le huy</div></div>
            </div>

            <div className="card">
                <div className="card-head">
                    <div className="card-title">Tat ca lich dat</div>
                    <div className="tabs" style={{ border: 'none', margin: 0 }}>
                        {TABS.map(([k, l]) => <button key={k} className={`tab-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                        <thead><tr><th>ID</th><th>Khach hang</th><th>Dich vu</th><th>Reader</th><th>Thoi gian</th><th>Gia</th><th>Thanh toan</th><th>Trang thai</th><th></th></tr></thead>
                        <tbody>
                            {rows.map(b => (
                                <tr key={b.id}>
                                    <td className="tc-id">{b.code}</td>
                                    <td className="tc-name">{b.user}</td>
                                    <td style={{ fontSize: '.78rem' }}>{b.svc}</td>
                                    <td style={{ fontSize: '.78rem' }}>{b.reader?.split(' ').pop() || '-'}</td>
                                    <td className="tc-mono">{b.booked_at || '-'}</td>
                                    <td className="tc-gold">{b.price}</td>
                                    <td><Badge status={b.payment_status || 'unpaid'} map={PAYMENT_ST} /></td>
                                    <td><Badge status={b.status} /></td>
                                    <td>
                                        <div className="act-row">
                                            {b.status === 'pending' && <button type="button" className="ic-btn ok" title="Xac nhan" onClick={() => openStatusModal('confirm', b)}>✓</button>}
                                            {b.status === 'confirmed' && <button type="button" className="ic-btn ok" title="Hoan thanh" onClick={() => openStatusModal('complete', b)}>◇</button>}
                                            {b.status === 'confirmed' && <button type="button" className="ic-btn" title="Hoan tac ve cho duyet" onClick={() => openStatusModal('undoPending', b)}>↺</button>}
                                            {b.status === 'completed' && <button type="button" className="ic-btn" title="Hoan tac ve da xac nhan" onClick={() => openStatusModal('undoConfirmed', b)}>↺</button>}
                                            {b.status === 'cancelled' && <button type="button" className="ic-btn" title="Khoi phuc ve cho duyet" onClick={() => openStatusModal('undoPending', b)}>↺</button>}
                                            <button type="button" className="ic-btn" title="Chi tiet" onClick={() => openModal('detail', b)}>⊙</button>
                                            <button type="button" className="ic-btn" title="Zoom" onClick={() => openModal('zoom', b)}>◷</button>
                                            <button type="button" className="ic-btn" title="Thanh toan" onClick={() => openModal('payment', b)}>$</button>
                                            {b.status !== 'cancelled' && b.status !== 'completed' && <button type="button" className="ic-btn del" title="Huy" onClick={() => openStatusModal('cancel', b)}>✕</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={modal === 'detail'}
                onClose={closeModal}
                title={`Chi tiet lich ${selected?.code || ''}`}
                size="lg"
                footer={(
                    <>
                        <button type="button" className="btn-secondary" onClick={closeModal}>Dong</button>
                        <button type="button" className="btn-primary" onClick={() => setModal('payment')}>Thanh toan</button>
                        <button type="button" className="btn-primary" onClick={() => setModal('zoom')}>Zoom</button>
                    </>
                )}
            >
                {selected && (
                    <div className="detail-grid">
                        <div className="detail-panel">
                            <div className="detail-title">Khach hang</div>
                            <InfoRow label="Ten" value={selected.user} />
                            <InfoRow label="Email" value={selected.email} />
                            <InfoRow label="Dich vu" value={selected.svc} />
                            <InfoRow label="Gia" value={selected.price} />
                        </div>
                        <div className="detail-panel">
                            <div className="detail-title">Lich hen</div>
                            <InfoRow label="Reader" value={selected.reader} />
                            <InfoRow label="Thoi gian" value={selected.booked_at} />
                            <InfoRow label="Trang thai"><Badge status={selected.status} /></InfoRow>
                            <InfoRow label="Thanh toan"><Badge status={selected.payment_status || 'unpaid'} map={PAYMENT_ST} /></InfoRow>
                            {selected.payment_status === 'refunded' && (
                                <>
                                    <InfoRow label="So tien hoan" value={selected.refund_amount ? Number(selected.refund_amount).toLocaleString('vi-VN') + 'd' : '-'} />
                                    <InfoRow label="Ma hoan tien" value={selected.refund_reference} />
                                    <InfoRow label="Ly do hoan" value={selected.refund_reason} />
                                    <InfoRow label="Thoi gian hoan" value={selected.refunded_at} />
                                </>
                            )}
                        </div>
                        <div className="detail-panel" style={{ gridColumn: '1 / -1' }}>
                            <div className="detail-title">Ghi chu va link</div>
                            <InfoRow label="Zoom" value={selected.zoom_link} />
                            <InfoRow label="Ghi chu" value={selected.note || selected.notes} />
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={modal === 'zoom'} onClose={closeModal} title="Cap nhat link Zoom" size="md">
                <form onSubmit={handleZoomSubmit}>
                    <div className="form-group">
                        <label className="label">Zoom / Google Meet link</label>
                        <input className="input" value={zoomLink} onChange={(e) => setZoomLink(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="modal-footer" style={{ margin: '1.25rem -1.35rem -1.25rem' }}>
                        <button type="button" className="btn-secondary" onClick={closeModal}>Huy</button>
                        <button type="submit" className="btn-primary">Luu link</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={modal === 'payment'} onClose={closeModal} title="Cap nhat thanh toan" size="md">
                <form onSubmit={handlePaymentSubmit}>
                    <div className="form-row">
                        <div>
                            <label className="label">Trang thai</label>
                            <select className="sel" value={paymentForm.payment_status} onChange={(e) => setPaymentForm({ ...paymentForm, payment_status: e.target.value })}>
                                <option value="unpaid">Chua thanh toan</option>
                                <option value="pending_verification">Cho xac minh</option>
                                <option value="paid">Da thanh toan</option>
                                <option value="refunded">Da hoan tien</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Phuong thuc</label>
                            <select className="sel" value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
                                <option value="bank">Chuyen khoan</option>
                                <option value="vietqr">VietQR</option>
                                <option value="cash">Tien mat</option>
                                <option value="momo">MoMo</option>
                            </select>
                        </div>
                    </div>
                    {paymentForm.payment_status === 'refunded' && (
                        <>
                            <div className="form-row">
                                <div>
                                    <label className="label">So tien hoan</label>
                                    <input className="input" type="number" min="1" max={selected?.amount || undefined} value={paymentForm.refund_amount} onChange={(e) => setPaymentForm({ ...paymentForm, refund_amount: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="label">Ma/chung tu hoan</label>
                                    <input className="input" value={paymentForm.refund_reference} onChange={(e) => setPaymentForm({ ...paymentForm, refund_reference: e.target.value })} placeholder="VD: FT..." />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Ly do hoan tien</label>
                                <textarea className="input" rows="3" value={paymentForm.refund_reason} onChange={(e) => setPaymentForm({ ...paymentForm, refund_reason: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="label">Ghi chu noi bo</label>
                                <textarea className="input" rows="2" value={paymentForm.refund_note} onChange={(e) => setPaymentForm({ ...paymentForm, refund_note: e.target.value })} />
                            </div>
                        </>
                    )}
                    <div className="modal-footer" style={{ margin: '1.25rem -1.35rem -1.25rem' }}>
                        <button type="button" className="btn-secondary" onClick={closeModal}>Huy</button>
                        <button type="submit" className="btn-primary">Cap nhat</button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={modal === 'status'}
                onClose={closeModal}
                title={STATUS_ACTIONS[statusAction]?.title}
                message={STATUS_ACTIONS[statusAction]?.message(selected)}
                confirmLabel={STATUS_ACTIONS[statusAction]?.confirmLabel}
                danger={STATUS_ACTIONS[statusAction]?.danger}
                onConfirm={handleStatus}
            />
        </div>
    );
}
