import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './Services.module.css';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

function Services() {
  const showToast = useToast();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;

    api.services.getAll()
      .then(data => {
        if (!alive) return;
        setServices(Array.isArray(data) ? data : []);
        setStatus('ready');
      })
      .catch(() => {
        if (!alive) return;
        setServices([]);
        setStatus('error');
      });

    return () => {
      alive = false;
    };
  }, []);

  function selectService(svc) {
    showToast(`Da chon dich vu: ${svc.name}`);
    navigate(`/?service=${svc.id}`);
  }

  return (
    <section id="services" className={styles.services}>
      <div className={styles['services-header']}>
        <div className={styles.sl}>Trai nghiem danh cho ban</div>
        <h2 className="section-title">Cac goi <em>giai ma</em></h2>
      </div>

      <div className={styles['services-grid']}>
        {status === 'loading' && [1, 2, 3].map(item => (
          <div key={item} className={`${styles.svc} ${styles.skeleton}`} aria-hidden="true">
            <span className={styles['svc-icon']}></span>
            <h3 className={styles['svc-name']}></h3>
            <p className={styles['svc-desc']}></p>
            <div className={styles['svc-meta']}>
              <span className={styles['svc-dur']}></span>
              <div className={styles['svc-price']}></div>
            </div>
          </div>
        ))}

        {status === 'error' && (
          <div className={styles['state-card']}>
            <h3>Chua tai duoc goi dich vu</h3>
            <p>Vui long thu lai sau it phut hoac lien he ho tro neu loi keo dai.</p>
          </div>
        )}

        {status === 'ready' && services.length === 0 && (
          <div className={styles['state-card']}>
            <h3>Chua co goi dich vu dang mo</h3>
            <p>Admin can bat it nhat mot goi dich vu de khach co the dat lich.</p>
          </div>
        )}

        {status === 'ready' && services.map(svc => (
          <button key={svc.id} type="button" className={styles.svc} onClick={() => selectService(svc)}>
            <span className={styles['svc-icon']}>
              {Number(svc.id) === 1 ? '*' : Number(svc.id) === 2 ? 'Moon' : 'Cards'}
            </span>
            <h3 className={styles['svc-name']}>{svc.name}</h3>
            <p className={styles['svc-desc']}>{svc.description}</p>
            <div className={styles['svc-meta']}>
              <span className={styles['svc-dur']}>{svc.duration} phut</span>
              <div className={styles['svc-price']}>
                {Number(svc.price || 0).toLocaleString('vi-VN')}d <span>/buoi</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default Services;
