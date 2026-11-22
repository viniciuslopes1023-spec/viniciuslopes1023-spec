import { useEffect, useState } from 'react';
import { api } from './api';
import Landing from './components/Landing';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

type View = 'loading' | 'landing' | 'login' | 'dashboard';

export default function App() {
  const [view, setView] = useState<View>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((session) => {
        if (!active) return;
        if (session.authenticated) {
          setEmail(session.email);
          setView('dashboard');
        } else {
          setView('landing');
        }
      })
      .catch(() => active && setView('landing'));
    return () => {
      active = false;
    };
  }, []);

  if (view === 'loading') {
    return (
      <div className="boot-screen">
        <div className="boot-mark">G</div>
        <div className="boot-label">INICIANDO GRINGA</div>
      </div>
    );
  }

  if (view === 'dashboard') {
    return <Dashboard email={email} onLogout={() => { setEmail(null); setView('landing'); }} />;
  }

  if (view === 'login') {
    return <Login onBack={() => setView('landing')} onSuccess={(value) => { setEmail(value); setView('dashboard'); }} />;
  }

  return <Landing onLogin={() => setView('login')} />;
}
