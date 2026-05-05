import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';
import './index.css';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [period, setPeriod] = useState('Weekly');

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage period={period} />;
      case 'bookings':  return <DashboardPage period={period} />;
      case 'workers':   return <DashboardPage period={period} />;
      case 'revenue':   return <DashboardPage period={period} />;
      default:
        return (
          <div className="card animate-in" style={{ textAlign:'center', padding:80 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🚧</div>
            <h2 style={{ color:'#f1f5f9', marginBottom:8 }}>{page.charAt(0).toUpperCase() + page.slice(1)}</h2>
            <p style={{ color:'#64748b' }}>This section is coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar page={page} setPage={setPage} />
      <div className="main-area">
        <Header page={page} period={period} setPeriod={setPeriod} />
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
