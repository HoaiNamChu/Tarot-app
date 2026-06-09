import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.jsx';

export default function AddBookingModal({ isOpen, onClose }) {
    const [form, setForm] = useState({ name: '', phone: '', service_id: '', reader_id: '', date: '', time: '09:00' });
    const [readers, setReaders] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const showToast = useToast();
    
    useEffect(() => {
        if (isOpen) {
            Promise.all([
                api.admin.readers.getAll(),
                api.admin.services.getAll(),
            ])
                .then(([readersData, servicesData]) => {
                    setReaders(readersData || []);
                    setServices(servicesData || []);
                })
                .catch(err => console.error('Modal fetch error:', err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    async function createBooking() {
        if (!form.name || !form.phone || !form.service_id || !form.reader_id || !form.date) {
            showToast('Vui lòng điền đầy đủ thông tin', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.admin.bookings.create({
                customer_name: form.name,
                customer_phone: form.phone,
                service_id: form.service_id,
                reader_id: form.reader_id,
                date: form.date,
                time: form.time,
            });
            showToast('Đã tạo lịch thành công!');
            setForm({ name: '', phone: '', service_id: '', reader_id: '', date: '', time: '09:00' });
            onClose();
        } catch (err) {
            showToast(err.message || 'Lỗi tạo lịch', 'error');
        } finally {
            setLoading(false);
        }
    }

    const selectedService = services.find(s => s.id == form.service_id);

    return (
        <div className="modal-bg open" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-head">
                    <div className="modal-title">Thêm lịch đặt mới</div>
                    <button className="modal-close-btn" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="form-row">
                        <div><label className="label">Khách hàng</label><input type="text" className="input" placeholder="Tìm hoặc nhập tên..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                        <div><label className="label">Điện thoại</label><input type="tel" className="input" placeholder="0xxx xxx xxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div>
                            <label className="label">Dịch vụ</label>
                            <select className="sel" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
                                <option value="">— Chọn dịch vụ —</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} — {s.price}K</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Tarot Reader</label>
                            <select className="sel" value={form.reader_id} onChange={(e) => setForm({ ...form, reader_id: e.target.value })}>
                                <option value="">— Chọn reader —</option>
                                {readers.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div><label className="label">Ngày</label><input type="date" className="input" style={{ colorScheme: 'dark' }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                        <div>
                            <label className="label">Giờ</label>
                            <select className="sel" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
                                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '19:00', '20:00'].map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    {selectedService && (
                        <div style={{ padding: '.75rem', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: '.75rem', fontSize: '.85rem' }}>
                            <strong>Giá:</strong> {selectedService.price}K | <strong>Thời lượng:</strong> {selectedService.duration || 60} phút
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
                        <button className="form-submit" onClick={createBooking} disabled={loading}>{loading ? 'Đang tạo...' : 'Tạo lịch đặt'}</button>
                        <button className="btn-ghost" onClick={onClose}>Huỷ</button>
                    </div>
                </div>
            </div>
        </div>
    );
}