import { NavLink, useNavigate } from 'react-router-dom';

const ADMIN_NAV = [
    {
        section: 'Tong quan', items: [
            { to: '/', icon: '◆', label: 'Dashboard' },
            { to: '/analytics', icon: '∿', label: 'Phan tich' },
        ],
    },
    {
        section: 'Quan ly', items: [
            { to: '/bookings', icon: '◇', label: 'Dat lich' },
            { to: '/readers', icon: '✦', label: 'Tarot Reader' },
            { to: '/users', icon: '○', label: 'Khach hang' },
            { to: '/reviews', icon: '◈', label: 'Danh gia' },
        ],
    },
    {
        section: 'Tai chinh', items: [
            { to: '/payments', icon: '⇅', label: 'Thanh toan' },
        ],
    },
    {
        section: 'He thong', items: [
            { to: '/content', icon: '▤', label: 'Noi dung' },
            { to: '/settings', icon: '●', label: 'Cai dat' },
        ],
    },
];

const READER_NAV = [
    {
        section: 'Reader', items: [
            { to: '/', icon: '◈', label: 'Tong quan' },
        ],
    },
];

export default function Sidebar({ admin, onLogout, onClose, isOpen }) {
    const navigate = useNavigate();
    const initials = admin?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
    const isReader = admin?.role === 'reader';
    const nav = isReader ? READER_NAV : ADMIN_NAV;

    return (
        <aside className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
            <div className="sb-logo">
                <div className="sb-logo-name">
                    Luna Arcana <span className="sb-logo-pill">{isReader ? 'Reader' : 'Admin'}</span>
                </div>
            </div>

            {nav.map(group => (
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
                        </NavLink>
                    ))}
                </div>
            ))}

            <div className="sb-foot">
                <div className="sb-user">
                    <div className="sb-av">{initials}</div>
                    <div>
                        <div className="sb-uname">{admin?.name}</div>
                        <div className="sb-urole">{isReader ? 'Reader' : admin?.role === 'admin' ? 'Admin' : admin?.role || 'User'}</div>
                    </div>
                </div>
                <button
                    className="btn-ghost"
                    style={{ width: '100%', marginTop: '.75rem', fontSize: '.68rem' }}
                    onClick={() => { onLogout(); navigate('/'); }}
                >
                    Dang xuat
                </button>
            </div>
        </aside>
    );
}
