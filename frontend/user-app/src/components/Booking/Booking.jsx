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
    Promise.all([
      api.services.getAll(),
      api.readers.getAll(),
    ]).then(([servicesData, readersData]) => {
      const normalizedServices = safeArray(servicesData);
      const normalizedReaders = safeArray(readersData);
      setServices(normalizedServices);
      setReaders(normalizedReaders);

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
    }).catch(() => { /* ignore */ });
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
      showToast('Vui long dien day du thong tin.');
      return;
    }

    if (slotStatus === 'busy') {
      showToast('Khung gio nay da co nguoi dat. Vui long chon gio khac.');
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

      showToast('Dat lich thanh cong! Chung toi se xac nhan qua email.');
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

  return (
    <section id="booking" className={styles['booking-section']}>
      <div className={styles['booking-inner']}>
        <div>
          <div className="sl">Mo canh cua</div>
          <h2 className="section-title" style={{ fontSize: '2.5rem' }}>
            Dat Lich <em>Doc Bai</em>
          </h2>
          <p style={{ color: 'var(--muted-2)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', marginTop: '1rem' }}>
            Hay chon reader, goi dich vu va thoi gian phu hop de chung ta ket noi.
          </p>

          <div className={styles['booking-steps']}>
            {[
              { num: '01', title: 'Chon dich vu & Reader', desc: 'Chon chuyen gia phu hop voi van de ban dang quan tam.' },
              { num: '02', title: 'Chon thoi gian', desc: 'Danh sach lich ban ben duoi giup ban tranh cac khung gio da duoc giu.' },
              { num: '03', title: 'Thanh toan & xac nhan', desc: 'Sau khi thanh toan, thong tin buoi hen se duoc gui qua email.' },
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
                Lich ban cua {selectedReader.avatar} {selectedReader.name} {busySlotMonth ? `trong thang ${busySlotMonth}` : 'sap toi'}
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
              <div className={styles['lock-title']}>Dang nhap de dat lich</div>
              <p className={styles['lock-desc']}>
                Tao tai khoan mien phi de dat lich voi Tarot Reader va quan ly buoi hen cua ban.
              </p>
              <div className={styles['lock-btns']}>
                <button className="btn-primary" style={{ fontSize: '.72rem', padding: '.8rem 1.6rem' }} onClick={() => openModal('register')}>
                  Dang ky mien phi
                </button>
                <button className="btn-ghost" style={{ fontSize: '.72rem', padding: '.8rem 1.4rem' }} onClick={() => openModal('login')}>
                  Da co tai khoan
                </button>
              </div>
            </div>
          )}

          <div className={styles['booking-form']}>
            <div className={styles.fr}>
              <label className={styles.fl}>Dich Vu</label>
              <select className={styles.fsel} name="service_id" value={form.service_id} onChange={handleChange}>
                <option value="">-- Chon dich vu --</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration} phut) - {s.price.toLocaleString('vi-VN')}d
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fr}>
              <label className={styles.fl}>Reader</label>
              <select className={styles.fsel} name="reader_id" value={form.reader_id} onChange={handleChange}>
                <option value="">-- Chon Reader --</option>
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
                {slotStatus === 'checking' && <span className={styles['slot-checking']}>  Dang kiem tra...</span>}
                {slotStatus === 'available' && <span className={styles['slot-available']}>  Con trong</span>}
                {slotStatus === 'busy' && <span className={styles['slot-busy']}>  Da co nguoi dat</span>}
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
              disabled={loading || slotStatus === 'busy' || slotStatus === 'checking'}
            >
              {loading ? 'Dang xu ly...' : 'Xac Nhan Dat Lich'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Booking;
