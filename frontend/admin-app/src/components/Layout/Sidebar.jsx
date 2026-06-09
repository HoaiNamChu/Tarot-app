import { NavLink, useNavigate } from 'react-router-dom';

const NAV = [
    {
        section: 'Tổng quan', items: [
            { to: '/', icon: '◈', label: 'Dashboard' },
            { to: '/analytics', icon: '∿', label: 'Phân tích' },
        ]
    },
    {
        section: 'Quản lý', items: [
            { to: '/bookings', icon: '◷', label: 'Đặt lịch', pill: { text: '12', cls: 'r' } },
            { to: '/readers', icon: '✦', label: 'Tarot Reader' },
            { to: '/users', icon: '○', label: 'Khách hàng' },
            { to: '/reviews', icon: '◇', label: 'Đánh giá', pill: { text: '8', cls: 'a' } },
        ]
    },
    {
        section: 'Tài chính', items: [
            { to: '/payments', icon: '⬡', label: 'Thanh toán', pill: { text: '3', cls: 'v' } },
        ]
    },
    {
        section: 'Hệ thống', items: [
            { to: '/content', icon: '▤', label: 'Nội dung' },
            { to: '/settings', icon: '◎', label: 'Cài đặt' },
        ]
    },
];

export default function Sidebar({ admin, onLogout, onClose, isOpen }) {
    const navigate = useNavigate();
    const initials = admin?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    

    return (
        <aside className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
            <div className="sb-logo">
                <div className="sb-logo-name">
                    🌙 Luna Arcana <span className="sb-logo-pill">Admin</span>
                </div>
            </div>

            {NAV.map(group => (
                <div key={group.section} className="sb-sec">
                    <div className="sb-sec-lbl">{group.section}</div>
                    {group.items.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) => `sbi${isActive ? ' active' : ''}`}
                            onClick={onClose}
                        >
                            <span className="sbi-ic">{item.icon}</span>
                            {item.label}
                            {item.pill && <span className={`sb-pill ${item.pill.cls}`}>{item.pill.text}</span>}
                        </NavLink>
                    ))}
                </div>
            ))}

            <div className="sb-foot">
                <div className="sb-user">
                    <div className="sb-av">{initials}</div>
                    <div>
                        <div className="sb-uname">{admin?.name}</div>
                        <div className="sb-urole">Super Admin</div>
                    </div>
                </div>
                <button className="btn-ghost" style={{ width: '100%', marginTop: '.75rem', fontSize: '.68rem' }}
                    onClick={() => { onLogout(); navigate('/'); }}>
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
}