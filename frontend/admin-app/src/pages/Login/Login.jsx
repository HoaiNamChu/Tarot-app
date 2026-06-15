import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PasswordInput from '../../components/PasswordInput/PasswordInput.jsx';
import styles from './Login.module.css';

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const showToast = useToast();
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    async function handleSubmit() {
        setErr('');
        if (!form.email || !form.password) { setErr('Vui lòng nhập đầy đủ thông tin.'); return; }
        setLoading(true);
        try {
            await login(form.email, form.password);
            showToast('Đăng nhập thành công!');
            navigate('/');
        } catch (e) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.box}>
                <div className={styles.logo}>Luna Arcana <span className={styles.pill}>Portal</span></div>
                <div className={styles.title}>Đăng nhập</div>
                <div className={styles.sub}>Danh cho quan tri vien va Reader</div>

                {err && <div className={styles.err}>{err}</div>}

                <div className={styles.group}>
                    <label className={styles.label}>Email</label>
                    <input
                        className={styles.input}
                        type="email"
                        placeholder="admin@lunaarcana.com"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                </div>

                <div className={styles.group}>
                    <label className={styles.label}>Mật khẩu</label>
                    <PasswordInput
                        className={styles.input}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                </div>

                <button className={styles.submit} onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
            </div>
        </div>
    );
}

export default Login;
