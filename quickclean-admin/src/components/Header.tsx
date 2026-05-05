import { Search, Bell, Download } from 'lucide-react';

const periods = ['Today', 'Weekly', 'Monthly'];

export default function Header({ page, period, setPeriod }: {
  page: string; period: string; setPeriod: (p: string) => void;
}) {
  const title: Record<string, string> = {
    dashboard: 'Dashboard', bookings: 'Bookings', users: 'Users',
    workers: 'Workers', revenue: 'Revenue', analytics: 'Analytics', settings: 'Settings',
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <div>
          <div className="header-title">{title[page] || 'Dashboard'}</div>
          <div className="header-breadcrumb">Admin / {title[page]}</div>
        </div>
      </div>

      <div className="search-box">
        <Search size={15} color="#64748b" />
        <input placeholder="Search bookings, users..." />
      </div>

      <div className="header-right">
        <div className="date-filter">
          {periods.map(p => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>

        <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 12px' }}>
          <Download size={13} /> Export CSV
        </button>

        <div className="icon-btn">
          <Bell size={16} />
          <span className="notif-dot" />
        </div>

        <div className="admin-avatar">A</div>
      </div>
    </header>
  );
}
