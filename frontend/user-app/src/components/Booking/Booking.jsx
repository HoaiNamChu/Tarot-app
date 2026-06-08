import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './Booking.module.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

function Booking() {
  const { isLoggedIn, openModal, refreshBookings } = useAuth();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [readers, setReaders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busySlots, setBusySlots] = useState([]);
  const [slotStatus, setSlotStatus] = useState(null);

  const [form, setForm] = useState({
    reader_id: '',
    service_id: '',
    booked_at: '',
    note: '',
  });

  // Fetch data — chỉ 1 useEffect duy nhất
  useEffect(() => {
    Promise.all([
      api.services.getAll(),
      api.readers.getAll(),
    ]).then(([servicesData, readersData]) => {
      setServices(servicesData);
      setReaders(readersData);

      const serviceId = searchParams.get('service');
      const readerId = searchParams.get('reader');

      setForm(p => ({
        ...p,
        service_id: serviceId || (servicesData.length ? String(servicesData[0].id) : ''),
        reader_id: readerId || '',
      }));

      if (serviceId || readerId) {
        setSearchParams({}, { replace: true });
        // Đợi DOM cập nhật rồi mới scroll
        setTimeout(() => {
          document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }).catch(() => { /* ignore */ });
  }, [searchParams, setSearchParams]); // chỉ chạy 1 lần khi mount

  // Lắng nghe searchParams thay đổi sau khi đã mount
  // (khi user click từ Services/Readers sang)
  useEffect(() => {
    const serviceId = searchParams.get('service');
    const readerId = searchParams.get('reader');

    if (!serviceId && !readerId) return;
    if (!services.length && !readers.length) return; // chờ data load

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

  // Fetch busy slots khi chọn reader
  useEffect(() => {
    if (!form.reader_id) { setBusySlots([]); return; }
    const month = new Date().toISOString().slice(0, 7);
    api.readers.getBusySlots(form.reader_id, month)
      .then(setBusySlots)
      .catch(() => { });
  }, [form.reader_id]);

  // Check slot — debounce 600ms
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
    if (name === 'reader_id') setSlotStatus(null);
  }

  async function submitBooking() {
    if (!isLoggedIn) { openModal('login'); return; }
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
      showToast('✦ Đặt lịch thành công! Chúng tôi sẽ xác nhận qua email.');
      await refreshBookings();
      setForm(p => ({ ...p, booked_at: '', note: '' }));
      setSlotStatus(null);
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedReader = readers.find(r => String(r.id) === form.reader_id);

  return (
    <section id="booking" className={styles['booking-section']}>
      <div className={styles['booking-inner']}>
        <div>
          <div className="sl">Mở Cánh Cửa</div>
          <h2 className="section-title" style={{ fontSize: '2.5rem' }}>
            Đặt Lịch <em>Đọc Bài</em>
          </h2>
          <p style={{ color: 'var(--muted-2)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', marginTop: '1rem' }}>
            Cuộc gặp gỡ nào cũng là một duyên phận. Hãy chọn thời gian phù hợp để chúng ta kết nối.
          </p>

          <div className={styles['booking-steps']}>
            {[
              { num: '01', title: 'Chọn Dịch Vụ & Reader', desc: 'Tùy vào vấn đề bạn đang gặp phải, hãy chọn chuyên gia phù hợp.' },
              { num: '02', title: 'Chọn Thời Gian', desc: 'Khung giờ đỏ là đã có người đặt, hãy chọn khung giờ còn trống.' },
              { num: '03', title: 'Thanh Toán & Chờ Gặp', desc: 'Sau khi xác nhận, link Google Meet sẽ được gửi qua Email.' },
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
                🔴 Lịch bận của {selectedReader.avatar} {selectedReader.name}
              </div>
              <div className={styles['busy-slots-list']}>
                {busySlots.map((slot, i) => (
                  <div key={i} className={styles['busy-slot-item']}>
                    📅 {new Date(slot.booked_at).toLocaleDateString('vi-VN')}
                    {' · '}
                    ⏰ {new Date(slot.booked_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}
                    {new Date(slot.end_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
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
                Tạo tài khoản miễn phí để đặt lịch với các Tarot Reader và quản lý buổi hẹn của bạn.
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
            <div className={styles.fr}>
              <label className={styles.fl}>Dịch Vụ</label>
              <select className={styles.fsel} name="service_id" value={form.service_id} onChange={handleChange}>
                <option value="">-- Chọn dịch vụ --</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration} phút) — {s.price.toLocaleString('vi-VN')}đ
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fr}>
              <label className={styles.fl}>Reader</label>
              <select className={styles.fsel} name="reader_id" value={form.reader_id} onChange={handleChange}>
                <option value="">-- Chọn Reader --</option>
                {readers.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.avatar} {r.name} — {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fr}>
              <label className={styles.fl}>
                Ngày Giờ Muốn Hẹn
                {slotStatus === 'checking' && <span className={styles['slot-checking']}>  Đang kiểm tra...</span>}
                {slotStatus === 'available' && <span className={styles['slot-available']}>  ✓ Còn trống</span>}
                {slotStatus === 'busy' && <span className={styles['slot-busy']}>  ✗ Đã có người đặt</span>}
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
              <label className={styles.fl}>Ghi Chú Vấn Đề (Tùy chọn)</label>
              <textarea
                className={styles.fta}
                name="note"
                placeholder="Chia sẻ ngắn gọn điều bạn muốn hỏi..."
                value={form.note}
                onChange={handleChange}
              />
            </div>

            <button
              className={styles['form-submit']}
              onClick={submitBooking}
              disabled={loading || slotStatus === 'busy' || slotStatus === 'checking'}
            >
              {loading ? 'Đang xử lý...' : 'Xác Nhận Đặt Lịch'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Booking;