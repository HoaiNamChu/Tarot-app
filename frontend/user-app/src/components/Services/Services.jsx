import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Services.module.css';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

function Services() {
  const showToast = useToast();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);

  useEffect(() => {
    api.services.getAll()
      .then(data => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]));
  }, []);

  function selectService(svc) {
    showToast(`Đã chọn dịch vụ: ${svc.name}`);
    navigate(`/?service=${svc.id}`); // id số thật từ DB
  }

  return (
    <section id="services" className={styles.services}>
      <div className={styles['services-header']}>
        <div className={styles.sl}>Trải Nghiệm Dành Cho Bạn</div>
        <h2 className="section-title">Các Gói <em>Giải Mã</em></h2>
      </div>
      <div className={styles['services-grid']}>
        {(Array.isArray(services) ? services : []).map(svc => (
          <div key={svc.id} className={styles.svc} onClick={() => selectService(svc)}>
            <span className={styles['svc-icon']}>
              {svc.id === 1 ? '✨' : svc.id === 2 ? '🌙' : '🎡'}
            </span>
            <h3 className={styles['svc-name']}>{svc.name}</h3>
            <p className={styles['svc-desc']}>{svc.description}</p>
            <div className={styles['svc-meta']}>
              <span className={styles['svc-dur']}>{svc.duration} Phút</span>
              <div className={styles['svc-price']}>
                {svc.price.toLocaleString('vi-VN')}đ <span>/buổi</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Services;
