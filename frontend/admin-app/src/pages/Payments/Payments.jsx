import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { InfoRow, Modal } from '../../components/Modal/Modal.jsx';

const ST = {
    paid: ['b-green', 'Da thanh toan'],
    pending_verification: ['b-amber', 'Cho xac nhan'],
    refund_pending: ['b-cyan', 'Cho hoan tien'],
    refunded: ['b-rose', 'Da hoan'],
    unpaid: ['b-amber', 'Chua thanh toan'],
};

const TABS = [
    ['all', 'Tat ca'],
    ['paid', 'Da thanh toan'],
    ['pending_verification', 'Cho xac nhan'],
    ['refund_pending', 'Cho hoan tien'],
    ['refunded', 'Hoan tien'],
];

function PaymentBadge({ status }) {
    const item = ST[status] || ['b-amber', status || '-'];
    return <span className={`badge ${item[0]}`}><span className="badge-dot"></span>{item[1]}</span>;
}

export default function Payments() {
    const showToast = useToast();
    const [filter, setFilter] = useState('all');
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [modal, setModal] = useState(null);
    const [refundForm, setRefundForm] = useState({
        refund_amount: '',
        refund_reference: '',
        refund_reason: '',
        refund_note: '',
    });

    useEffect(() => {
        api.admin.payments.getAll()
            .then(data => setPayments(data || []))
            .catch(err => showToast(err.message || 'Loi tai thanh toan', 'error'))
            .finally(() => setLoading(false));
    }, [showToast]);

    const rows = filter === 'all' ? payments : payments.filter(t => t.payment_status === filter);
    const stats = {
        revenue: payments.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0),
        pending: payments.filter(p => p.payment_status === 'pending_verification').length,
        pendingAmount: payments.filter(p => p.payment_status === 'pending_verification').reduce((sum, p) => sum + (p.amount || 0), 0),
        refundPending: payments.filter(p => p.payment_status === 'refund_pending').length,
        refundPendingAmount: payments.filter(p => p.payment_status === 'refund_pending').reduce((sum, p) => sum + (p.amount || 0), 0),
        refunded: payments.filter(p => p.payment_status === 'refunded').reduce((sum, p) => sum + (p.amount || 0), 0),
    };

    function closeModal() {
        setSelected(null);
        setModal(null);
        setRefundForm({
            refund_amount: '',
            refund_reference: '',
            refund_reason: '',
            refund_note: '',
        });
    }

    function openRefundModal(row) {
        setSelected(row);
        setRefundForm({
            refund_amount: row.refund_amount || row.amount || '',
            refund_reference: row.refund_reference || '',
            refund_reason: row.refund_reason || '',
            refund_note: row.refund_note || '',
        });
        setModal('refund');
    }

    async function updatePayment(row, payment_status, extra = {}) {
        try {
            await api.admin.bookings.updatePayment(row.id, {
                payment_status,
                payment_method: row.method || 'bank',
                ...extra,
            });
            setPayments(prev => prev.map(p => p.id === row.id ? {
                ...p,
                ...extra,
                payment_status,
                method: row.method || 'bank',
                refunded_at: payment_status === 'refunded' ? new Date().toLocaleString('vi-VN') : p.refunded_at,
            } : p));
            showToast(payment_status === 'paid' ? 'Da xac nhan thanh toan' : payment_status === 'refund_pending' ? 'Da danh dau cho hoan tien' : payment_status === 'refunded' ? 'Da ghi nhan hoan tien' : 'Da cap nhat thanh toan');
            closeModal();
        } catch (err) {
            showToast(err.message || 'Loi cap nhat thanh toan', 'error');
        }
    }

    function submitRefund(event) {
        event.preventDefault();
        if (!selected) return;
        updatePayment(selected, 'refunded', refundForm);
    }

    if (loading) return <div style={{ padding: '2rem' }}>Dang tai...</div>;

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card c-cyan"><div className="stat-icon">!</div><div className="stat-lbl">Cho hoan tien</div><div className="stat-val">{stats.refundPending}</div><div className="stat-delta">{(stats.refundPendingAmount / 1000000).toFixed(2)}tr</div></div>
                <div className="stat-card c-green"><div className="stat-icon">◆</div><div className="stat-lbl">Doanh thu</div><div className="stat-val">{(stats.revenue / 1000000).toFixed(1)}tr</div><div className="stat-delta">Da xac nhan</div></div>
                <div className="stat-card c-amber"><div className="stat-icon">⏳</div><div className="stat-lbl">Cho xu ly</div><div className="stat-val">{stats.pending}</div><div className="stat-delta">{(stats.pendingAmount / 1000000).toFixed(2)}tr</div></div>
                <div className="stat-card c-rose"><div className="stat-icon">↩</div><div className="stat-lbl">Hoan tien</div><div className="stat-val">{payments.filter(p => p.payment_status === 'refunded').length}</div><div className="stat-delta">{(stats.refunded / 1000000).toFixed(2)}tr</div></div>
                <div className="stat-card c-violet"><div className="stat-icon">%</div><div className="stat-lbl">Hoa hong uoc tinh</div><div className="stat-val">{((stats.revenue * 0.3) / 1000000).toFixed(1)}tr</div><div className="stat-delta">30% doanh thu</div></div>
            </div>

            <div className="card">
                <div className="card-head">
                    <div className="card-title">Giao dich</div>
                    <div className="tabs" style={{ border: 'none', margin: 0 }}>
                        {TABS.map(([k, l]) => <button key={k} className={`tab-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                        <thead><tr><th>Ma GD</th><th>Khach hang</th><th>Dich vu</th><th>So tien</th><th>Phuong thuc</th><th>Bang chung</th><th>Thoi gian</th><th>Trang thai</th><th></th></tr></thead>
                        <tbody>
                            {rows.map(t => (
                                <tr key={t.id}>
                                    <td className="tc-id">{t.code}</td>
                                    <td className="tc-name">{t.user}</td>
                                    <td style={{ fontSize: '.78rem' }}>{t.svc}</td>
                                    <td className="tc-gold">{t.price}</td>
                                    <td style={{ fontSize: '.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono',monospace" }}>{t.method || '-'}</td>
                                    <td style={{ fontSize: '.72rem', color: 'var(--text-3)', maxWidth: 180 }}>
                                        <div>{t.proof_code || '-'}</div>
                                        {t.proof_note && <div style={{ marginTop: '.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.proof_note}</div>}
                                    </td>
                                    <td className="tc-mono">{t.paid_at || t.submitted_at || '-'}</td>
                                    <td><PaymentBadge status={t.payment_status} /></td>
                                    <td>
                                        <div className="act-row">
                                            <button type="button" className="ic-btn" title="Chi tiet" onClick={() => { setSelected(t); setModal('detail'); }}>⊙</button>
                                            {t.payment_status === 'pending_verification' && <button className="ic-btn ok" title="Duyet thanh toan" onClick={() => updatePayment(t, 'paid')}>✓</button>}
                                            {['paid', 'refund_pending'].includes(t.payment_status) && <button className="ic-btn del" title="Hoan tien" onClick={() => openRefundModal(t)}>↩</button>}
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
                title={`Chi tiet thanh toan ${selected?.code || ''}`}
                size="md"
                footer={selected?.payment_status === 'pending_verification' ? (
                    <>
                        <button type="button" className="btn-secondary" onClick={closeModal}>Dong</button>
                        <button type="button" className="btn-primary" onClick={() => updatePayment(selected, 'paid')}>Duyet thanh toan</button>
                    </>
                ) : ['paid', 'refund_pending'].includes(selected?.payment_status) ? (
                    <>
                        <button type="button" className="btn-secondary" onClick={closeModal}>Dong</button>
                        <button type="button" className="btn-danger" onClick={() => openRefundModal(selected)}>Hoan tien</button>
                    </>
                ) : <button type="button" className="btn-secondary" onClick={closeModal}>Dong</button>}
            >
                {selected && (
                    <div className="detail-panel">
                        <InfoRow label="Ma GD" value={selected.code} />
                        <InfoRow label="Khach" value={selected.user} />
                        <InfoRow label="Dich vu" value={selected.svc} />
                        <InfoRow label="So tien" value={selected.price} />
                        <InfoRow label="Phuong thuc" value={selected.method || 'bank'} />
                        <InfoRow label="Trang thai lich" value={selected.booking_status || '-'} />
                        <InfoRow label="Trang thai"><PaymentBadge status={selected.payment_status} /></InfoRow>
                        {selected.payment_status === 'refund_pending' && (
                            <>
                                <InfoRow label="Nguoi huy" value={selected.cancelled_by || '-'} />
                                <InfoRow label="Ly do huy" value={selected.cancel_reason || '-'} />
                            </>
                        )}
                        <InfoRow label="Ma/chung tu" value={selected.proof_code} />
                        <InfoRow label="Ghi chu" value={selected.proof_note} />
                        <InfoRow label="Thoi gian" value={selected.paid_at || selected.submitted_at} />
                        {selected.payment_status === 'refunded' && (
                            <>
                                <InfoRow label="So tien hoan" value={selected.refund_amount ? Number(selected.refund_amount).toLocaleString('vi-VN') + 'd' : '-'} />
                                <InfoRow label="Ma hoan tien" value={selected.refund_reference} />
                                <InfoRow label="Ly do" value={selected.refund_reason} />
                                <InfoRow label="Ghi chu hoan" value={selected.refund_note} />
                                <InfoRow label="Thoi gian hoan" value={selected.refunded_at} />
                            </>
                        )}
                    </div>
                )}
            </Modal>

            <Modal isOpen={modal === 'refund'} onClose={closeModal} title={`Hoan tien ${selected?.code || ''}`} size="md">
                <form onSubmit={submitRefund}>
                    <div className="form-row">
                        <div>
                            <label className="label">So tien hoan</label>
                            <input className="input" type="number" min="1" max={selected?.amount || undefined} value={refundForm.refund_amount} onChange={(e) => setRefundForm({ ...refundForm, refund_amount: e.target.value })} required />
                        </div>
                        <div>
                            <label className="label">Ma/chung tu hoan</label>
                            <input className="input" value={refundForm.refund_reference} onChange={(e) => setRefundForm({ ...refundForm, refund_reference: e.target.value })} placeholder="VD: FT..." />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="label">Ly do hoan tien</label>
                        <textarea className="input" rows="3" value={refundForm.refund_reason} onChange={(e) => setRefundForm({ ...refundForm, refund_reason: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="label">Ghi chu noi bo</label>
                        <textarea className="input" rows="2" value={refundForm.refund_note} onChange={(e) => setRefundForm({ ...refundForm, refund_note: e.target.value })} />
                    </div>
                    <div className="modal-footer" style={{ margin: '1.25rem -1.35rem -1.25rem' }}>
                        <button type="button" className="btn-secondary" onClick={closeModal}>Huy</button>
                        <button type="submit" className="btn-primary danger">Xac nhan da hoan tien</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

