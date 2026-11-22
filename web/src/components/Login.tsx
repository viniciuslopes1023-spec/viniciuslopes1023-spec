import { useState, type FormEvent } from 'react';
import { api } from '../api';

interface LoginProps {
  onBack: () => void;
  onSuccess: (email: string) => void;
}

export default function Login({ onBack, onSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api.login(email, password);
      onSuccess(result.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao entrar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="grid-bg" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-login" aria-hidden="true" />
      <button className="auth-back" onClick={onBack}>← VOLTAR</button>

      <div className="auth-card">
        <div className="auth-head">
          <span className="brand-mark">G</span>
          <div className="mono muted">GRINGA / ACESSO PRIVADO</div>
          <h1>Bem-vindo de volta.</h1>
          <p>Entre para abrir o console de prospecção.</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            <span className="mono">E-MAIL</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@gringa.local"
              required
            />
          </label>
          <label>
            <span className="mono">SENHA</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••••"
              required
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'ENTRANDO…' : 'ENTRAR →'}
          </button>
        </form>

        <div className="auth-foot mono">SEM CADASTRO PÚBLICO · SESSÃO VIA COOKIE HTTPONLY</div>
      </div>
    </div>
  );
}
