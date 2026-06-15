import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Readers.module.css';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

function Readers() {
  const showToast = useToast();
  const navigate = useNavigate();
  const [readers, setReaders] = useState([]);

  useEffect(() => {
    api.readers.getAll()
      .then(data => setReaders(Array.isArray(data) ? data : []))
      .catch(() => setReaders([]));
  }, []);

  function selectReader(reader) {
    showToast(`Đã chọn Reader: ${reader.name}`);
    navigate(`/?reader=${reader.id}`); // id số thật từ DB
  }

  return (
    <section id="readers" className={styles['readers-section']}>
      <div className="sl">Kết Nối Tâm Hồn</div>
      <h2 className="section-title">Gặp Gỡ <em>Readers</em></h2>

      <div className={styles['readers-grid']}>
        {(Array.isArray(readers) ? readers : []).map(reader => (
          <div key={reader.id} className={styles.rc} onClick={() => selectReader(reader)}>
            <div className={styles['rc-avatar']}>{reader.avatar}</div>
            <h3 className={styles['rc-name']}>{reader.name}</h3>
            <div className={styles['rc-title']}>{reader.title}</div>
            <p className={styles['rc-bio']}>{reader.bio}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Readers;
