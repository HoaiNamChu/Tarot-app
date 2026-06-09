import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES = {
    '/': 'Dashboard', '/analytics': 'Phân tích', '/bookings': 'Quản lý đặt lịch',
    '/readers': 'Tarot Reader', '/users': 'Khách hàng', '/reviews': 'Đánh giá',
    '/payments': 'Thanh toán', '/content': 'Nội dung', '/settings': 'Cài đặt',
};

export default function Topbar({ onHamburger }) {
    const { pathname } = useLocation();
    const [clock, setClock] = useState('');

    useEffect(() => {
        const tick = () => {
            const n = new Date();
            const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const p = x => String(x).padStart(2, '0');
            setClock(`${days[n.getDay()]} ${p(n.getDate())}/${p(n.getMonth() + 1)}/${n.getFullYear()} — ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="topbar">
            <div className="tb-left">
                <div className="hamburger" onClick={onHamburger}>☰</div>
                <div className="tb-titles">
                    <div className="tb-title">{TITLES[pathname] || 'Admin'}</div>
                    <div className="tb-sub">{clock}</div>
                </div>
            </div>
            <div className="tb-right">
                <div className="tb-search">
                    <span style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>⌕</span>
                    <input type="text" placeholder="Tìm kiếm..." />
                </div>
                <div className="tb-ic-btn">🔔<div className="notif-dot"></div></div>
                <button className="btn-primary" >＋ Thêm lịch</button>
            </div>
        </div>
    );
}