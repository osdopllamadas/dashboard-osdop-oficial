import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate('/');
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="login-header">
          <div className="logo-container-login">
            <img src="/renton-logo.png.png" alt="Renton Connective" className="renton-logo-img" />
          </div>
          <h1>Bienvenido</h1>
          <p>Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Usuario</label>
            <div className="input-wrapper">
              <User size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="login-btn">
            Iniciar Sesión
          </button>
        </form>
      </div>

      <style jsx="true">{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-header h1 {
          font-size: 1.5rem;
          margin-top: 1rem;
          color: white;
        }

        .logo-container-login {
          width: 100%;
          height: 120px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .renton-logo-img {
          width: 500px; /* Tamaño mucho más grande para ver el logo real */
          height: auto;
          margin-top: 10px; /* Ajuste fino vertical */
          filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.15));
        }

        .login-header p {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-top: 0.4rem;
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .input-group label {
          display: block;
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper svg {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.75rem 0.75rem 0.75rem 2.5rem;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: white;
          transition: border-color 0.2s;
        }

        .input-wrapper input:focus {
          border-color: var(--primary);
        }

        .login-btn {
          width: 100%;
          padding: 0.75rem;
          background: var(--primary);
          color: white;
          font-weight: 600;
          border-radius: var(--radius-md);
          margin-top: 1rem;
        }

        .login-btn:hover {
          background: var(--primary-hover);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--error);
          font-size: 0.85rem;
          margin-top: -0.5rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};

export default Login;
