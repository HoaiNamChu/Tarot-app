import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api/index.js';

const TITLES = {
    '/': 'Dashboard',
    '/analytics': 'Phan tich',
    '/bookings': 'Quan ly dat lich',
    '/readers': 'Tarot Reader',
    '/users': 'Khach hang',
    '/reviews': 'Danh gia',
    '/payments': 'Thanh toan',
    '/content': 'Noi dung',
    '/settings': 'Cai dat',
    '/reader': 'Reader',
};

const TYPE_LABELS = {
    booking: 'Lich dat',
    user: 'Khach hang',
    reader: 'Reader',
    service: 'Dich vu',
    payment: 'Thanh toan',
    review: 'Danh gia',
};

const ACTION_LABELS = {
    'booking.create': 'Tao lich moi',
    'booking.confirm': 'Xac nhan lich',
    'booking.cancel': 'Huy lich',
    'booking.complete': 'Hoan thanh lich',
    'booking.completion_requested': 'Gui xac nhan hoan thanh',
    'reader.booking.completion_requested': 'Reader bao da xem xong',
    'booking.completed_by_customer': 'Khach xac nhan hoan thanh',
    'booking.completion_disputed': 'Khach bao chua xem',
    'booking.status': 'Cap nhat trang thai lich',
    'booking.zoom': 'Cap nhat Zoom',
    'payment.update': 'Cap nhat thanh toan',
    'payment.refund_pending': 'Cho hoan tien',
    'payment.refunded': 'Da hoan tien',
    'review.status': 'Cap nhat danh gia',
    'review.reply': 'Phan hoi danh gia',
    'settings.update': 'Cap nhat cai dat',
};

const NOTIFICATION_POLL_MS = 15000;

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN');
}

function actionLabel(action) {
    return ACTION_LABELS[action] || action || 'Thong bao';
}

export default function Topbar({ admin, onHamburger, onAddBooking }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const isReader = admin?.role === 'reader';
    const searchRef = useRef(null);
    const notifRef = useRef(null);
    const [clock, setClock] = useState('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const tick = () => {
            const n = new Date();
            const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const p = x => String(x).padStart(2, '0');
            setClock(`${days[n.getDay()]} ${p(n.getDate())}/${p(n.getMonth() + 1)}/${n.getFullYear()} - ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        let alive = true;
        const loadNotifications = () => {
            const request = isReader ? api.reader.notifications.getAll : api.admin.notifications.getAll;
            request()
                .then(data => {
                    if (!alive) return;
                    setNotifications((data.items || []).slice(0, 12));
                    setUnreadCount(data.unread_count || 0);
                })
                .catch(() => {
                    if (alive) setNotifications([]);
                    if (alive) setUnreadCount(0);
                });
        };

        loadNotifications();
        const id = setInterval(loadNotifications, NOTIFICATION_POLL_MS);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, [isReader]);

    useEffect(() => {
        const text = query.trim();
        if (text.length < 2) {
            return;
        }

        let cancelled = false;
        const id = setTimeout(() => {
            api.admin.search(text)
                .then(data => {
                    if (!cancelled) setResults(data || []);
                })
                .catch(() => {
                    if (!cancelled) setResults([]);
                })
                .finally(() => {
                    if (!cancelled) setSearching(false);
                });
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(id);
        };
    }, [query]);

    useEffect(() => {
        const onPointerDown = event => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setNotifOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, []);

    function goToResult(result) {
        navigate(result.to || '/');
        setQuery('');
        setResults([]);
        setSearchOpen(false);
    }

    function submitSearch(event) {
        event.preventDefault();
        const first = results[0];
        if (first) {
            goToResult(first);
            return;
        }
        const text = query.trim().toLowerCase();
        if (!text) return;

        if (text.includes('lich') || text.includes('booking') || text.startsWith('bk')) navigate('/bookings');
        else if (text.includes('khach') || text.includes('user')) navigate('/users');
        else if (text.includes('reader')) navigate('/readers');
        else if (text.includes('thanh toan') || text.includes('payment')) navigate('/payments');
        else if (text.includes('danh gia') || text.includes('review')) navigate('/reviews');
        else if (text.includes('dich vu') || text.includes('service') || text.includes('noi dung')) navigate('/content');
        else navigate('/');

        setSearchOpen(false);
    }

    function toggleNotifications() {
        setNotifOpen(open => {
            const nextOpen = !open;
            if (nextOpen && unreadCount > 0) {
                const request = isReader ? api.reader.notifications.markAllRead : api.admin.notifications.markAllRead;
                request()
                    .then(() => {
                        setUnreadCount(0);
                        setNotifications(items => items.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
                    })
                    .catch(() => {});
            }
            return nextOpen;
        });
    }

    return (
        <div className="topbar">
            <div className="tb-left">
                <button type="button" className="hamburger" onClick={onHamburger} aria-label="Mo menu">☰</button>
                <div className="tb-titles">
                    <div className="tb-title">{isReader && pathname === '/' ? 'Reader' : TITLES[pathname] || 'Admin'}</div>
                    <div className="tb-sub">{clock}</div>
                </div>
            </div>
            <div className="tb-right">
                {!isReader && <form className="tb-search-wrap" onSubmit={submitSearch} ref={searchRef}>
                    <div className="tb-search">
                        <span className="tb-search-ic">⌕</span>
                        <input
                            type="text"
                            placeholder="Tim kiem..."
                            value={query}
                            onChange={event => {
                                const value = event.target.value;
                                setQuery(value);
                                if (value.trim().length < 2) {
                                    setResults([]);
                                    setSearching(false);
                                } else {
                                    setSearching(true);
                                }
                                setSearchOpen(true);
                            }}
                            onFocus={() => setSearchOpen(true)}
                        />
                    </div>
                    {searchOpen && query.trim().length > 0 && (
                        <div className="tb-popover tb-search-popover">
                            {query.trim().length < 2 ? (
                                <div className="tb-empty">Nhap it nhat 2 ky tu de tim kiem.</div>
                            ) : searching ? (
                                <div className="tb-empty">Dang tim...</div>
                            ) : results.length ? (
                                results.map((result, index) => (
                                    <button key={`${result.type}-${result.title}-${index}`} type="button" className="tb-result" onClick={() => goToResult(result)}>
                                        <span className="tb-result-type">{TYPE_LABELS[result.type] || result.type}</span>
                                        <span className="tb-result-main">
                                            <span className="tb-result-title">{result.title}</span>
                                            <span className="tb-result-sub">{result.subtitle}</span>
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <div className="tb-empty">Khong tim thay ket qua phu hop.</div>
                            )}
                        </div>
                    )}
                </form>}

                <div className="tb-notif-wrap" ref={notifRef}>
                    <button type="button" className="tb-ic-btn" onClick={toggleNotifications} aria-label="Thong bao">
                        🔔
                        {unreadCount > 0 && <span className="notif-dot"></span>}
                    </button>
                    {notifOpen && (
                        <div className="tb-popover tb-notif-popover">
                            <div className="tb-popover-head">
                                <span>Thong bao</span>
                                <span>{notifications.length ? `${notifications.length} gan day` : 'Trong'}</span>
                            </div>
                            {notifications.length ? notifications.map(item => (
                                <button key={item.id} type="button" className={`tb-notif-item${item.read_at ? '' : ' unread'}`} onClick={() => {
                                    if (item.action_url) navigate(item.action_url);
                                    setNotifOpen(false);
                                }}>
                                    <span className="tb-notif-dot"></span>
                                    <span>
                                        <span className="tb-notif-title">{item.title || actionLabel(item.type)}</span>
                                        <span className="tb-notif-sub">{item.body || actionLabel(item.type)} - {formatDate(item.created_at)}</span>
                                    </span>
                                </button>
                            )) : (
                                <div className="tb-empty">Chua co thong bao nao.</div>
                            )}
                        </div>
                    )}
                </div>

                {!isReader && <button className="btn-primary" onClick={onAddBooking}>Them lich</button>}
            </div>
        </div>
    );
}
