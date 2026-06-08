import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';

const ST = { pending: ['b-amber', 'Chờ duyệt'], confirmed: ['b-green', 'Đã xác nhận'], completed: ['b-violet', 'Hoàn thành'], cancelled: ['b-rose', 'Đã huỷ'] };
const BUSY = [3, 7, 9, 12, 14, 17, 19, 21, 23, 26, 28];

function MiniCalendar() {
  const [cur, setCur] = useState(new Date(2026, 4, 1));
  const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const y = cur.getFullYear(), m = cur.getMonth();
  const fd = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const dprev = new Date(y, m, 0).getDate();
  const today = new Date();
  const cells = [];
  for (let i = fd - 1; i >= 0; i--) cells.push({ d: dprev - i, other: true });
  for (let d = 1; d <= dim; d++) cells.push({ d, today: d === today.getDate() && m === today.getMonth() && y === today.getFullYear(), busy: BUSY.includes(d) });
  const rem = 7 - ((fd + dim) % 7); if (rem < 7) for (let d = 1; d <= rem; d++) cells.push({ d, other: true });

  return (
    <div>
      <div className="mc-nav">
        <button className="mc-arr" onClick={() => setCur(new Date(y, m - 1, 1))}>←</button>
        <span className="mc-title">{MONTHS[m]} {y}</span>
        <button className="mc-arr" onClick={() => setCur(new Date(y, m + 1, 1))}>→</button>
      </div>
      <div className="mc-hdr">{DAYS.map(d => <div key={d} className="mc-dlbl">{d}</div>)}</div>
      <div className="mc-grid">
        {cells.map((c, i) => (
          <div key={i} className={`mc-d${c.other ? ' other' : ''}${c.today ? ' today' : ''}${c.busy ? ' busy' : ''}`}>
            {c.d}
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ vals, labels, color }) {
  const mx = Math.max(...vals.filter(v => v > 0)) || 1;
  return (
    <div className="bar-wrap" style={{ height: 54, marginBottom: '1.5rem' }}>
      {vals.map((v, i) => (
        <div key={i} className="bar"
          style={{ height: `${v > 0 ? (v / mx) * 100 : 5}%`, background: color, border: `1px solid ${color}44`, opacity: v > 0 ? 1 : .15 }}
          title={`${labels[i]}: ${v}tr`}>
          <span className="bar-lbl">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.admin.stats(),
      api.admin.bookings.getAll(),
    ])
      .then(([statsData, bookingsData]) => {
        setStats(statsData);
        setBookings(bookingsData || []);
      })
      .catch(err => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

  const todayKey = new Date().toISOString().slice(0, 10);
  const filtered = filter === 'pending' ? bookings.filter(b => b.status === 'pending')
    : filter === 'today' ? bookings.filter(b => b.date === todayKey)
      : bookings.slice(0, 6);

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card c-gold"><div className="stat-icon">💰</div><div className="stat-lbl">Doanh thu tháng</div><div className="stat-val">{stats?.revenue || '0'}tr</div><div className="stat-delta"><span className="du">↑ {stats?.revenue_growth || '0'}%</span></div></div>
        <div className="stat-card c-violet"><div className="stat-icon">◷</div><div className="stat-lbl">Lịch đặt tháng</div><div className="stat-val">{stats?.total_bookings || '0'}</div><div className="stat-delta"><span className="du">↑ {stats?.new_bookings || '0'}</span> lịch mới</div></div>
        <div className="stat-card c-green"><div className="stat-icon">○</div><div className="stat-lbl">Khách hàng mới</div><div className="stat-val">{stats?.new_customers || '0'}</div><div className="stat-delta"><span className="du">↑ {stats?.customer_growth || '0'}%</span></div></div>
        <div className="stat-card c-rose"><div className="stat-icon">◇</div><div className="stat-lbl">Đánh giá TB</div><div className="stat-val">{stats?.avg_rating || '0'}</div><div className="stat-delta"><span className="du">↑ {stats?.rating_change || '0'}</span> điểm</div></div>
      </div>

      <div className="g2">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Lịch đặt gần đây</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
              <div className="tabs" style={{ border: 'none', margin: 0 }}>
                {[['all', 'Tất cả'], ['pending', 'Chờ duyệt'], ['today', 'Hôm nay']].map(([k, l]) => (
                  <button key={k} className={`tab-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
                ))}
              </div>
              <button className="card-act" onClick={() => navigate('/bookings')}>Xem tất cả →</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>ID</th><th>Khách hàng</th><th>Dịch vụ</th><th>Reader</th><th>Giờ</th><th>Giá</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id}>
                    <td className="tc-id">BK-{b.id}</td>
                    <td className="tc-name">{b.user}</td>
                    <td style={{ fontSize: '.78rem' }}>{b.svc}</td>
                    <td style={{ fontSize: '.78rem' }}>{b.reader?.split(' ').pop() || ''}</td>
                    <td className="tc-mono">{b.booked_at_iso ? new Date(b.booked_at_iso).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="tc-gold">{b.price}</td>
                    <td><span className={`badge ${ST[b.status]?.[0]}`}><span className="badge-dot"></span>{ST[b.status]?.[1] || b.status}</span></td>
                    <td><div className="act-row"><div className="ic-btn">⊙</div><div className="ic-btn">✎</div><div className="ic-btn del">✕</div></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-stack">
          <div className="card">
            <div className="card-head"><div className="card-title">Lịch tháng 5</div><span className="card-meta">{bookings.length} buổi</span></div>
            <div className="card-body"><MiniCalendar /></div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Hôm nay</div><span className="card-meta">{new Date().toLocaleDateString('vi-VN')}</span></div>
            <div className="card-body">
              <div className="prog"><div className="prog-head"><span className="prog-lbl">Lịch hoàn thành</span><span className="prog-val">{stats?.completed_today || '0'} / {stats?.total_today || '0'}</span></div><div className="prog-track"><div className="prog-fill" style={{ width: `${stats?.completion_rate || '0'}%`, background: 'var(--green)' }}></div></div></div>
              <div className="prog"><div className="prog-head"><span className="prog-lbl">Tỷ lệ xác nhận</span><span className="prog-val">{stats?.confirmation_rate || '0'}%</span></div><div className="prog-track"><div className="prog-fill" style={{ width: `${stats?.confirmation_rate || '0'}%`, background: 'var(--violet)' }}></div></div></div>
              <div className="prog"><div className="prog-head"><span className="prog-lbl">Công suất Reader</span><span className="prog-val">{stats?.reader_capacity || '0'}%</span></div><div className="prog-track"><div className="prog-fill" style={{ width: `${stats?.reader_capacity || '0'}%`, background: 'var(--gold)' }}></div></div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="g3">
        <div className="card">
          <div className="card-head"><div className="card-title">Top Reader</div><button className="card-act" onClick={() => navigate('/readers')}>Quản lý →</button></div>
          <div style={{ padding: '0 1.2rem' }}>
            {(stats?.top_readers || []).map((r) => (
              <div key={r.id} className="rr">
                <div className="rr-av">{r.avatar || '🔮'}</div>
                <div style={{ flex: 1 }}><div className="rr-name">{r.name}</div><div className="rr-sub">{r.specialty}</div></div>
                <div className="rr-right"><div className="rr-val">{r.sessions || '0'}</div><div className="rr-r">★ {r.rating || '0'}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Doanh thu 7 ngày</div><span className="card-meta">triệu đ</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--gold)' }}>{stats?.revenue_week || '0'}tr</span>
              <span style={{ fontSize: '.7rem', color: 'var(--green)' }}>↑ {stats?.revenue_growth || '0'}%</span>
            </div>
            <BarChart vals={stats?.revenue_7days || [0,0,0,0,0,0,0]} labels={['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']} color="var(--gold)" />
          </div>
        </div>
      </div>
    </div>
  );
}
