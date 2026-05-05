import { LayoutDashboard, BookOpen, Users, Wrench, DollarSign, BarChart2, Settings, LogOut } from 'lucide-react';

const nav = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: BookOpen, label: 'Bookings', id: 'bookings', badge: '3' },
  { icon: Users, label: 'Users', id: 'users' },
  { icon: Wrench, label: 'Workers', id: 'workers' },
  { icon: DollarSign, label: 'Revenue', id: 'revenue' },
  { icon: BarChart2, label: 'Analytics', id: 'analytics' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

export default function Sidebar({ page, setPage }: { page: string; setPage: (p: string) => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">✨</div>
        <div>
          <span>QuickClean</span><br />
          <small>Admin Panel</small>
        </div>
      </div>

      <p className="sidebar-section">Main Menu</p>
      <ul className="sidebar-nav">
        {nav.map(({ icon: Icon, label, id, badge }) => (
          <li key={id}>
            <a
              href="#"
              className={page === id ? 'active' : ''}
              onClick={e => { e.preventDefault(); setPage(id); }}
            >
              <Icon size={18} className="nav-icon" />
              {label}
              {badge && <span className="sidebar-badge">{badge}</span>}
            </a>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 'auto', padding: '0 12px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>🔴 Live Mode</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Real-time Firebase sync active</div>
        </div>
        <button className="sidebar-nav" style={{ width: '100%' }} onClick={() => setPage('login')}>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#ef4444' }}>
            <LogOut size={18} />&nbsp;Sign Out
          </a>
        </button>
      </div>
    </aside>
  );
}
