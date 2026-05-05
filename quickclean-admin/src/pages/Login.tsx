import { useState } from 'react';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('admin@quickclean.in');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 800));
    if (email === 'admin@quickclean.in' && password === 'admin123') {
      onLogin();
    } else {
      setError('Invalid credentials. Try admin@quickclean.in / admin123');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-glow" />
      <div style={{ position:'absolute', bottom:'-100px', left:'-100px', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)' }} />

      <div className="login-card animate-in">
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:28 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>✨</div>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:'#f1f5f9' }}>QuickClean</div>
            <div style={{ fontSize:11,color:'#64748b',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase' }}>Admin Panel</div>
          </div>
        </div>

        <h1 style={{ marginBottom:8 }}>Welcome back 👋</h1>
        <p>Sign in to your admin dashboard</p>

        {error && (
          <div style={{ background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#ef4444',fontWeight:500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" style={{ width:'100%',padding:'13px',fontSize:15,marginTop:8,borderRadius:10 }} disabled={loading}>
            {loading ? '⏳ Signing in...' : '→ Sign In to Dashboard'}
          </button>
        </form>

        <div style={{ marginTop:24,padding:14,background:'rgba(99,102,241,0.08)',borderRadius:10,border:'1px solid rgba(99,102,241,0.15)',fontSize:12,color:'#64748b' }}>
          <strong style={{ color:'#94a3b8' }}>Demo credentials:</strong><br />
          Email: admin@quickclean.in<br />
          Password: admin123
        </div>
      </div>
    </div>
  );
}
