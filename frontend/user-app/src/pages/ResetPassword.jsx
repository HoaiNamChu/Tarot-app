import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import PasswordInput from '../components/PasswordInput/PasswordInput.jsx';

export default function ResetPassword() {
    const [params] = useSearchParams();
    const showToast = useToast();
    const [form, setForm] = useState({
        email: params.get('email') || '',
        token: params.get('token') || '',
        password: '',
        password_confirmation: '',
    });
    const [loading, setLoading] = useState(false);

    async function submit(e) {
        e.preventDefault();
        if (!form.email || !form.token || !form.password) {
            showToast('Vui lòng nhập đầy đủ thông tin.');
            return;
        }
        if (form.password !== form.password_confirmation) {
            showToast('Xác nhận mật khẩu không khớp.');
            return;
        }

        setLoading(true);
        try {
            await api.resetPassword(form);
            showToast('Đã đặt lại mật khẩu. Bạn có thể đăng nhập.');
        } catch (err) {
            showToast(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '6rem 1rem 3rem' }}>
            <form onSubmit={submit} style={{ width: '100%', maxWidth: 440, background: 'var(--ink-2)', border: '1px solid var(--border)', padding: '1.5rem' }}>
                <h1 style={{ fontFamily: "'Playfair Display', serif", color: 'var(--cream)', margin: 0, fontSize: '1.7rem' }}>Đặt lại mật khẩu</h1>
                <div style={{ marginTop: '1.25rem', display: 'grid', gap: '.85rem' }}>
                    <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    <input className="input" type="text" placeholder="Token" value={form.token} onChange={e => setForm(p => ({ ...p, token: e.target.value }))} />
                    <PasswordInput className="input" placeholder="Mật khẩu mới" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                    <PasswordInput className="input" placeholder="Xác nhận mật khẩu mới" value={form.password_confirmation} onChange={e => setForm(p => ({ ...p, password_confirmation: e.target.value }))} />
                </div>
                <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                    {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
                <Link to="/" style={{ display: 'block', marginTop: '1rem', color: 'var(--gold)', textAlign: 'center', fontSize: '.85rem' }}>Quay về trang chủ</Link>
            </form>
        </main>
    );
}
