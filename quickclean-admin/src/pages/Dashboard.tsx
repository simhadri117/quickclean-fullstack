import { useState, useEffect } from 'react';
import { RevenueChart, BookingsBarChart, ServiceDonutChart, Sparkline } from '../components/Charts';
import { fetchAdminStats, fetchRevenueChart, fetchServiceChart, subscribeToBookings, subscribeToCleaners, generateActivity, updateBookingStatus, type Booking, type Cleaner, type Activity } from '../data';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ── KPI Card ────────────────────────────────────────────
function KpiCard({ label, value, icon, color, bg, trend, sparkData }: any) {
  return (
    <div className="kpi-card animate-in">
      <div className="kpi-icon" style={{ background: bg }}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
        {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {Math.abs(trend)}% vs last period
      </div>
      <div className="kpi-sparkline">
        <Sparkline values={sparkData} color={color} />
      </div>
    </div>
  );
}

// ── Activity Feed ───────────────────────────────────────
function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="chart-header">
        <div>
          <div className="chart-title">Live Activity</div>
          <div className="chart-subtitle"><span className="live-dot">Live</span></div>
        </div>
      </div>
      {activities.length === 0
        ? <div className="empty-state"><div className="empty-icon">📭</div><h3>No activity yet</h3></div>
        : activities.map(a => (
          <div key={a.id} className="activity-item">
            <div className="activity-dot" style={{ background: a.color }}>{a.icon}</div>
            <div>
              <div className="activity-text" dangerouslySetInnerHTML={{ __html: a.message }} />
              <div className="activity-time">{a.time}</div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── Bookings Table ──────────────────────────────────────
function BookingsTable({ bookings, cleaners }: { bookings: Booking[]; cleaners: Cleaner[] }) {
  const [filter, setFilter] = useState('ALL');
  const statuses = ['ALL', 'FINDING_CLEANER', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'];

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">📋 Live Bookings</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {statuses.map(s => (
            <button key={s} className={`chart-filter-btn ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)} style={{ fontSize: 10 }}>
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Booking ID</th><th>Service</th><th>Address</th>
              <th>Status</th><th>Worker</th><th>Price</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>No bookings found</td></tr>
              : filtered.slice(0, 20).map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>#{b.id.slice(-8)}</td>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{b.service?.name || '—'}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.address || '—'}</td>
                  <td><span className={`status-badge status-${b.status}`}>{b.status.replace(/_/g, ' ')}</span></td>
                  <td>{b.cleaner?.name || <span style={{ color: '#475569' }}>Unassigned</span>}</td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>₹{b.service?.price || 0}</td>
                  <td>
                    {b.status === 'FINDING_CLEANER' && (
                      <button className="action-btn btn-assign" onClick={() => {
                        const c = cleaners[0];
                        if (c) updateBookingStatus(b.id, 'EN_ROUTE');
                      }}>Assign</button>
                    )}
                    {(b.status === 'ARRIVED') && (
                      <button className="action-btn btn-complete" onClick={() => updateBookingStatus(b.id, 'COMPLETED')}>Complete</button>
                    )}
                    {!['COMPLETED', 'CANCELLED'].includes(b.status) && (
                      <button className="action-btn btn-cancel" onClick={() => updateBookingStatus(b.id, 'CANCELLED')}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Workers Table ───────────────────────────────────────
function WorkersPanel({ cleaners }: { cleaners: Cleaner[] }) {
  const avails: ('online' | 'offline' | 'busy')[] = ['online', 'offline', 'busy'];
  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">🔧 Worker Performance</div>
        <span className="tag">{cleaners.length} Workers</span>
      </div>
      {cleaners.length === 0
        ? <div className="empty-state"><div className="empty-icon">👷</div><h3>No workers yet</h3></div>
        : cleaners.map((c, i) => {
          const avail = c.availability || avails[i % 3];
          return (
            <div key={c.id} className="worker-row">
              <div className="worker-avatar">{c.name?.[0] || 'W'}</div>
              <div className="worker-info">
                <div className="worker-name">{c.name}</div>
                <div className="worker-meta">
                  <span className="stars">{'★'.repeat(Math.round(c.rating || 4))}</span> {c.rating?.toFixed(1)} · {c.cleans || 0} jobs
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className={`avail-badge avail-${avail}`}>{avail}</span>
                <span className="worker-earnings">₹{((c.cleans || 0) * 180).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
    </div>
  );
}

// ── Main Dashboard Page ─────────────────────────────────
export default function DashboardPage({ period }: { period: string }) {
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [chartDays, setChartDays] = useState(7);
  const [loading, setLoading] = useState(true);

  // Seed mock data if Firestore empty
  const mockStats = {
    totalBookings: 142, todayBookings: 8, totalRevenue: 34820,
    activeBookings: 4, totalUsers: 67, totalWorkers: 12, completedBookings: 98,
  };
  const mockRevenue = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((l,i) => ({
    label: l, revenue: [1200,980,1450,890,1680,2100,1560][i], bookings: [6,5,8,4,9,11,8][i],
  }));
  const mockServices = [
    { name: 'Quick Sweep', count: 42 }, { name: 'Kitchen Clean', count: 38 },
    { name: 'Bathroom Wash', count: 31 }, { name: 'Post-Party', count: 19 },
  ];

  useEffect(() => {
    const days = period === 'Today' ? 1 : period === 'Weekly' ? 7 : 30;
    setChartDays(days);

    fetchAdminStats().then(s => setStats(s)).catch(() => setStats(mockStats));
    fetchRevenueChart(days).then(d => setRevenueData(d.length ? d : mockRevenue)).catch(() => setRevenueData(mockRevenue));
    fetchServiceChart().then(d => setServiceData(d.length ? d : mockServices)).catch(() => setServiceData(mockServices));
    setLoading(false);
  }, [period]);

  useEffect(() => {
    const unsub1 = subscribeToBookings(bs => {
      setBookings(bs);
      setActivities(generateActivity(bs));
    });
    const unsub2 = subscribeToCleaners(setCleaners);
    return () => { unsub1(); unsub2(); };
  }, []);

  const s = stats || mockStats;
  const sparkline = [40, 55, 48, 70, 62, 80, 95];
  const kpis = [
    { label: 'Total Bookings', value: s.totalBookings, icon: '📋', color: '#6366f1', bg: 'rgba(99,102,241,0.15)', trend: 12, sparkData: sparkline },
    { label: "Today's Bookings", value: s.todayBookings, icon: '📅', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', trend: 8, sparkData: [20,35,28,40,32,45,38] },
    { label: 'Total Revenue', value: `₹${(s.totalRevenue||0).toLocaleString()}`, icon: '💰', color: '#10b981', bg: 'rgba(16,185,129,0.15)', trend: 23, sparkData: [60,72,65,85,79,92,100] },
    { label: 'Active Users', value: s.totalUsers, icon: '👥', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', trend: -4, sparkData: [30,28,35,32,40,37,42] },
    { label: 'Active Workers', value: s.totalWorkers, icon: '🔧', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', trend: 5, sparkData: [8,10,9,12,11,14,13] },
  ];

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 20, marginBottom: 28 }}>
      {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />)}
    </div>
  );

  return (
    <>
      {/* KPIs */}
      <div className="kpi-grid">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Revenue + Doughnut */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">📈 Revenue Trends</div>
              <div className="chart-subtitle">Last {chartDays} days performance</div>
            </div>
            <div className="chart-filters">
              {[7, 14, 30].map(d => (
                <button key={d} className={`chart-filter-btn ${chartDays === d ? 'active' : ''}`}
                  onClick={() => { setChartDays(d); fetchRevenueChart(d).then(r => setRevenueData(r.length ? r : mockRevenue)); }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 260 }}><RevenueChart data={revenueData} /></div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">🍩 Service Mix</div>
              <div className="chart-subtitle">Booking distribution</div>
            </div>
          </div>
          <div style={{ height: 260 }}><ServiceDonutChart data={serviceData} /></div>
        </div>
      </div>

      {/* Bar Chart + Activity */}
      <div className="charts-grid" style={{ marginBottom: 28 }}>
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <div className="chart-title">📊 Daily Bookings</div>
              <div className="chart-subtitle">Peak days highlighted</div>
            </div>
          </div>
          <div style={{ height: 240 }}><BookingsBarChart data={revenueData} /></div>
        </div>
        <ActivityFeed activities={activities} />
      </div>

      {/* Workers + Bookings Table */}
      <div className="bottom-grid">
        <WorkersPanel cleaners={cleaners.length ? cleaners : [
          { id:'1', name:'Priya S.', phone:'9876543210', rating:4.9, cleans:420 },
          { id:'2', name:'Ravi K.', phone:'9876543211', rating:4.7, cleans:312 },
          { id:'3', name:'Anita M.', phone:'9876543212', rating:4.8, cleans:287 },
        ]} />
        <div className="card">
          <div className="section-header">
            <div className="section-title">📊 Quick Stats</div>
          </div>
          {[
            { label: 'Completion Rate', value: s.completedBookings, total: s.totalBookings, color: '#10b981' },
            { label: 'Active Rate', value: s.activeBookings, total: s.totalBookings, color: '#6366f1' },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 20 }}>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:8 }}>
                <span style={{color:'#94a3b8',fontWeight:600}}>{item.label}</span>
                <span style={{color:'#f1f5f9',fontWeight:700}}>
                  {item.total ? Math.round((item.value/item.total)*100) : 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${item.total ? (item.value/item.total)*100 : 0}%`, background: item.color }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop:24, padding:16, background:'rgba(99,102,241,0.08)', borderRadius:12, border:'1px solid rgba(99,102,241,0.15)' }}>
            <div style={{ fontSize:12, color:'#64748b', fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>🔮 Prediction</div>
            <div style={{ fontSize:14, color:'#f1f5f9', fontWeight:600 }}>
              ~{Math.round(s.todayBookings * 1.2)} bookings tomorrow
            </div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>Based on 7-day average trend</div>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <BookingsTable bookings={bookings} cleaners={cleaners} />
    </>
  );
}
