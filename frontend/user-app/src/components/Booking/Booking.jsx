import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './Booking.module.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

function monthFromDateTime(value) {
  return value ? value.slice(0, 7) : null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function Booking() {
  const { isLoggedIn, openModal, refreshBookings } = useAuth();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [readers, setReaders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [busySlots, setBusySlots] = useState([]);
  const [slotStatus, setSlotStatus] = useState(null);

  const [form, setForm] = useState({
    reader_id: '',
    service_id: '',
    booked_at: '',
    note: '',
  });

  const busySlotMonth = monthFromDateTime(form.booked_at);

  useEffect(() => {
    let alive = true;

    setLoadStatus('loading');
    Promise.all([
      api.services.getAll(),
      api.readers.getAll(),
    ]).then(([servicesData, readersData]) => {
      if (!alive) return;

      const normalizedServices = safeArray(servicesData);
      const normalizedReaders = safeArray(readersData);
      setServices(normalizedServices);
      setReaders(normalizedReaders);
      setLoadStatus('ready');

      const serviceId = searchParams.get('service');
      const readerId = searchParams.get('reader');

      setForm(p => ({
        ...p,
        service_id: serviceId || (normalizedServices.length ? String(normalizedServices[0].id) : ''),
        reader_id: readerId || '',
      }));

      if (serviceId || readerId) {
        setSearchParams({}, { replace: true });
        setTimeout(() => {
          document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }).catch(() => {
      if (!alive) return;
      setServices([]);
      setReaders([]);
      setLoadStatus('error');
    });

    return () => {
      alive = false;
    };
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const serviceId = searchParams.get('service');
    const readerId = searchParams.get('reader');

    if (!serviceId && !readerId) return;
    if (!services.length && !readers.length) return;

    setForm(p => ({
      ...p,
      ...(serviceId ? { service_id: serviceId } : {}),
      ...(readerId ? { reader_id: readerId } : {}),
    }));

    setSearchParams({}, { replace: true });

    setTimeout(() => {
      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  }, [searchParams, services, readers, setSearchParams]);

  useEffect(() => {
    if (!form.reader_id) {
      setBusySlots([]);
      return;
    }

    api.readers.getBusySlots(form.reader_id, busySlotMonth)
      .then(data => setBusySlots(safeArray(data)))
      .catch(() => setBusySlots([]));
  }, [form.reader_id, busySlotMonth]);

  useEffect(() => {
    if (!form.reader_id || !form.booked_at || !form.service_id) {
      setSlotStatus(null);
      return;
    }

    setSlotStatus('checking');
    const timer = setTimeout(() => {
      api.readers.checkSlot(form.reader_id, form.booked_at, form.service_id)
        .then(res => setSlotStatus(res.available ? 'available' : 'busy'))
        .catch(() => setSlotStatus(null));
    }, 600);

    return () => clearTimeout(timer);
  }, [form.reader_id, form.booked_at, form.service_id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'reader_id' || name === 'service_id' || name === 'booked_at') {
      setSlotStatus(null);
    }
  }

  async function submitBooking() {
    if (!isLoggedIn) {
      openModal('login');
      return;
    }

    if (!form.reader_id || !form.service_id || !form.booked_at) {
      showToast('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (slotStatus === 'busy') {
      showToast('Khung giờ này đã có người đặt. Vui lòng chọn giờ khác.');
      return;
    }

    setLoading(true);
    try {
      await api.bookings.create({
        reader_id: parseInt(form.reader_id),
        service_id: parseInt(form.service_id),
        booked_at: form.booked_at,
        note: form.note,
      });

      showToast('Đặt lịch thành công! Chúng tôi sẽ xác nhận qua email.');
      await refreshBookings();

      if (form.reader_id) {
        api.readers.getBusySlots(form.reader_id, busySlotMonth)
          .then(data => setBusySlots(safeArray(data)))
          .catch(() => { });
      }

      setForm(p => ({ ...p, booked_at: '', note: '' }));
      setSlotStatus(null);
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedReader = readers.find(r => String(r.id) === form.reader_id);
  const hasRequiredOptions = services.length > 0 && readers.length > 0;
  const submitDisabled = loading || loadStatus !== 'ready' || !hasRequiredOptions || slotStatus === 'busy' || slotStatus === 'checking';

  return (
    <section id="booking" className={styles['booking-section']}>
      <div className={styles['booking-inner']}>
        <div>
          <div className="sl">Mo canh cua</div>
          <h2 className="section-title" style={{ fontSize: '2.5rem' }}>
            Đặt Lịch <em>Đọc Bài</em>
          </h2>
          <p style={{ color: 'var(--muted-2)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', marginTop: '1rem' }}>
            Hãy chọn reader, gói dịch vụ và thời gian phù hợp để chúng ta kết nối.
          </p>

          <div className={styles['booking-steps']}>
            {[
              { num: '01', title: 'Chọn dịch vụ & Reader', desc: 'Chọn chuyên gia phù hợp với vấn đề bạn đang quan tâm.' },
              { num: '02', title: 'Chọn thời gian', desc: 'Danh sách lịch bận bên dưới giúp bạn tránh các khung giờ đã được giữ.' },
              { num: '03', title: 'Thanh toán & xác nhận', desc: 'Sau khi thanh toán, thông tin buổi hẹn sẽ được gửi qua email.' },
            ].map(step => (
              <div key={step.num} className={styles.bstep}>
                <div className={styles['bstep-num']}>{step.num}</div>
                <div className={styles['bstep-text']}>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {selectedReader && busySlots.length > 0 && (
            <div className={styles['busy-slots']}>
              <div className={styles['busy-slots-title']}>
                Lịch bận của {selectedReader.avatar} {selectedReader.name} {busySlotMonth ? `trong tháng ${busySlotMonth}` : 'sắp tới'}
              </div>
              <div className={styles['busy-slots-list']}>
                {busySlots.map((slot, i) => (
                  <div key={`${slot.booked_at}-${i}`} className={styles['busy-slot-item']}>
                    {slot.date_label || new Date(slot.booked_at).toLocaleDateString('vi-VN')}
                    {' · '}
                    {slot.start_time || new Date(slot.booked_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {slot.end_time || new Date(slot.end_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {slot.service ? ` · ${slot.service}` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles['booking-form-wrap']}>
          {!isLoggedIn && (
            <div className={styles['booking-lock']}>
              <div className={styles['lock-icon']}>🔐</div>
              <div className={styles['lock-title']}>Đăng nhập để đặt lịch</div>
              <p className={styles['lock-desc']}>
                Tạo tài khoản miễn phí để đặt lịch với Tarot Reader và quản lý buổi hẹn của bạn.
              </p>
              <div className={styles['lock-btns']}>
                <button className="btn-primary" style={{ fontSize: '.72rem', padding: '.8rem 1.6rem' }} onClick={() => openModal('register')}>
                  Đăng ký miễn phí
                </button>
                <button className="btn-ghost" style={{ fontSize: '.72rem', padding: '.8rem 1.4rem' }} onClick={() => openModal('login')}>
                  Đã có tài khoản
                </button>
              </div>
            </div>
          )}

          <div className={styles['booking-form']}>
            {loadStatus === 'loading' && (
              <div className={styles['form-state']} role="status">
                Đang tải gói dịch vụ và reader...
              </div>
            )}

            {loadStatus === 'error' && (
              <div className={styles['form-state-error']} role="alert">
                Chưa tải được dữ liệu đặt lịch. Vui lòng thử lại sau ít phút.
              </div>
            )}

            {loadStatus === 'ready' && !hasRequiredOptions && (
              <div className={styles['form-state-error']} role="alert">
                Hiện chưa có dịch vụ hoặc reader đang mở lịch.
              </div>
            )}

            <div className={styles.fr}>
              <label className={styles.fl}>Dich Vu</label>
              <select className={styles.fsel} name="service_id" value={form.service_id} onChange={handleChange} disabled={loadStatus !== 'ready'}>
                <option value="">-- Chọn dịch vụ --</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration} phút) - {s.price.toLocaleString('vi-VN')}₫
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fr}>
              <label className={styles.fl}>Reader</label>
              <select className={styles.fsel} name="reader_id" value={form.reader_id} onChange={handleChange} disabled={loadStatus !== 'ready'}>
                <option value="">-- Chọn Reader --</option>
                {readers.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.avatar} {r.name} - {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fr}>
              <label className={styles.fl}>
                Ngay gio muon hen
                {slotStatus === 'checking' && <span className={styles['slot-checking']}>  Đang kiểm tra...</span>}
                {slotStatus === 'available' && <span className={styles['slot-available']}>  Con trong</span>}
                {slotStatus === 'busy' && <span className={styles['slot-busy']}>  Đã có người đặt</span>}
              </label>
              <input
                type="datetime-local"
                className={`${styles.fi} ${slotStatus === 'busy' ? styles['fi-error'] : ''} ${slotStatus === 'available' ? styles['fi-success'] : ''}`}
                name="booked_at"
                style={{ colorScheme: 'dark' }}
                value={form.booked_at}
                onChange={handleChange}
              />
            </div>

            <div className={styles.fr}>
              <label className={styles.fl}>Ghi chu van de (tuy chon)</label>
              <textarea
                className={styles.fta}
                name="note"
                placeholder="Chia se ngan gon dieu ban muon hoi..."
                value={form.note}
                onChange={handleChange}
              />
            </div>

            <button
              className={styles['form-submit']}
              onClick={submitBooking}
              disabled={submitDisabled}
            >
              {loading ? 'Đang xử lý...' : loadStatus === 'loading' ? 'Đang tải dữ liệu...' : 'Xác Nhận Đặt Lịch'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Booking;
