import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './Readers.module.css';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

function Readers() {
  const showToast = useToast();
  const navigate = useNavigate();
  const [readers, setReaders] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;

    api.readers.getAll()
      .then(data => {
        if (!alive) return;
        setReaders(Array.isArray(data) ? data : []);
        setStatus('ready');
      })
      .catch(() => {
        if (!alive) return;
        setReaders([]);
        setStatus('error');
      });

    return () => {
      alive = false;
    };
  }, []);

  function selectReader(reader) {
    showToast(`Da chon reader: ${reader.name}`);
    navigate(`/?reader=${reader.id}`);
  }

  return (
    <section id="readers" className={styles['readers-section']}>
      <div className="sl">Ket noi tam hon</div>
      <h2 className="section-title">Gap go <em>Readers</em></h2>

      <div className={styles['readers-grid']}>
        {status === 'loading' && [1, 2, 3, 4].map(item => (
          <div key={item} className={`${styles.rc} ${styles.skeleton}`} aria-hidden="true">
            <div className={styles['rc-avatar']}></div>
            <h3 className={styles['rc-name']}></h3>
            <div className={styles['rc-title']}></div>
            <p className={styles['rc-bio']}></p>
          </div>
        ))}

        {status === 'error' && (
          <div className={styles['state-card']}>
            <h3>Chua tai duoc danh sach reader</h3>
            <p>Vui long thu lai sau it phut hoac lien he ho tro neu loi keo dai.</p>
          </div>
        )}

        {status === 'ready' && readers.length === 0 && (
          <div className={styles['state-card']}>
            <h3>Chua co reader dang mo lich</h3>
            <p>Admin can bat reader truoc khi khach co the dat lich.</p>
          </div>
        )}

        {status === 'ready' && readers.map(reader => (
          <button key={reader.id} type="button" className={styles.rc} onClick={() => selectReader(reader)}>
            <div className={styles['rc-avatar']}>{reader.avatar}</div>
            <h3 className={styles['rc-name']}>{reader.name}</h3>
            <div className={styles['rc-title']}>{reader.title}</div>
            <p className={styles['rc-bio']}>{reader.bio}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

export default Readers;
