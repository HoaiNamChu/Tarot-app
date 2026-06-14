import { useState, useEffect } from 'react';
import styles from './AuthModal.module.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api.js';

function AuthModal({ isOpen, activeTab, onClose }) {
  const { handleLogin, handleRegister } = useAuth();
  const showToast = useToast();
  const [tab, setTab] = useState(activeTab || 'login');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', pass: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', pass: '' });

  // sync tab khi activeTab thay đổi từ bên ngoài
  useEffect(() => {
    if (activeTab) setTab(activeTab);
  }, [activeTab]);

  // khóa scroll body khi modal mở
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // reset toàn bộ khi modal đóng
  useEffect(() => {
    if (!isOpen) {
      setLoginForm({ email: '', pass: '' });
      setRegForm({ name: '', email: '', pass: '' });
      setErr('');
      setLoading(false);
    }
  }, [isOpen]);

  // tất cả hook phải khai báo trước return
  if (!isOpen) return null;

  function handleClose() {
    setLoginForm({ email: '', pass: '' });
    setRegForm({ name: '', email: '', pass: '' });
    setErr('');
    setLoading(false);
    onClose();
  }

  function switchTab(t) {
    setTab(t);
    setErr('');
    setLoginForm({ email: '', pass: '' });
    setRegForm({ name: '', email: '', pass: '' });
  }

  async function submitLogin() {
    setErr('');
    setLoading(true);
    try {
      await handleLogin(loginForm.email, loginForm.pass);
      handleClose();
      showToast('✦ Chào mừng trở lại!');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister() {
    setErr('');
    setLoading(true);
    try {
      await handleRegister(regForm.name, regForm.email, regForm.pass);
      handleClose();
      showToast('✦ Tài khoản đã được tạo! Chào mừng bạn!');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    if (!loginForm.email) {
      setErr('Vui lòng nhập email để nhận link đặt lại mật khẩu.');
      return;
    }
    setErr('');
    setLoading(true);
    try {
      const res = await api.forgotPassword(loginForm.email);
      showToast(res.message || 'Nếu email tồn tại, hệ thống đã gửi link đặt lại mật khẩu.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${styles['modal-overlay']} ${styles.open}`} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className={styles['modal-box']}>
        <div className={styles['modal-header']}>
          <div className={styles['modal-orn']}>✦</div>
          <div className={styles['modal-title']}>
            {tab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
          </div>
          <div className={styles['modal-sub']}>
            {tab === 'login' ? 'Đăng nhập để tiếp tục hành trình' : 'Miễn phí — chỉ mất 30 giây'}
          </div>
          <button className={styles['modal-close']} onClick={handleClose}>✕</button>
        </div>

        <div className={styles['modal-body']}>
          <div className={styles['modal-tabs']}>
            <button className={`${styles['modal-tab']} ${tab === 'login' ? styles.active : ''}`} onClick={() => switchTab('login')}>Đăng Nhập</button>
            <button className={`${styles['modal-tab']} ${tab === 'register' ? styles.active : ''}`} onClick={() => switchTab('register')}>Đăng Ký</button>
          </div>

          {err && <div className={`${styles.merr} ${styles.show}`}>{err}</div>}

          {tab === 'login' && (
            <div>
              <div className={styles.mfg}>
                <label className={styles.mlbl}>Email</label>
                <input className={styles.minput} type="email" placeholder="email@example.com"
                  value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className={styles.mfg}>
                <label className={styles.mlbl}>Mật Khẩu</label>
                <input className={styles.minput} type="password" placeholder="••••••••"
                  value={loginForm.pass} onChange={e => setLoginForm(p => ({ ...p, pass: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submitLogin()} />
              </div>
              <button className={styles.msubmit} onClick={submitLogin} disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
              </button>
              <button type="button" onClick={forgotPassword} disabled={loading} style={{ width: '100%', marginTop: '.65rem', background: 'transparent', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '.78rem' }}>
                Quen mat khau?
              </button>
              <div className={styles.mfooter}>
                Chưa có tài khoản?{' '}
                <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => switchTab('register')}>
                  Đăng ký ngay
                </span>
              </div>
            </div>
          )}

          {tab === 'register' && (
            <div>
              <div className={styles.mfg}>
                <label className={styles.mlbl}>Họ Tên</label>
                <input className={styles.minput} type="text" placeholder="Tên của bạn"
                  value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className={styles.mfg}>
                <label className={styles.mlbl}>Email</label>
                <input className={styles.minput} type="email" placeholder="email@example.com"
                  value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className={styles.mfg}>
                <label className={styles.mlbl}>Mật Khẩu</label>
                <input className={styles.minput} type="password" placeholder="Ít nhất 6 ký tự"
                  value={regForm.pass} onChange={e => setRegForm(p => ({ ...p, pass: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submitRegister()} />
              </div>
              <button className={styles.msubmit} onClick={submitRegister} disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Tạo Tài Khoản'}
              </button>
              <div className={styles.mfooter}>
                Đã có tài khoản?{' '}
                <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => switchTab('login')}>
                  Đăng nhập
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
