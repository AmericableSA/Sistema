import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/logo.png';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await login(username, password);
        if (res.success) {
            navigate('/');
        } else {
            setError(res.error);
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            background: 'radial-gradient(circle at top right, #1e293b, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Orbs */}
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: '#3b82f6', filter: 'blur(100px)', opacity: 0.2 }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: '#8b5cf6', filter: 'blur(100px)', opacity: 0.2 }}></div>

            <div className="glass-card" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '3rem',
                zIndex: 10,
                backdropFilter: 'blur(20px)',
                backgroundColor: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '120px', height: '120px',
                        background: 'transparent',
                        borderRadius: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem',
                        // boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)'
                    }}>
                        <img src={logo} alt="Americable Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>Ameri-Cable</h1>
                    <p style={{ color: '#94a3b8' }}>Sistema de Gestión Inteligente</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem' }}>Usuario</label>
                        <input
                            type="text"
                            className="input-dark"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)' }}
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Ingrese su usuario"
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem' }}>Contraseña</label>
                        <input
                            type="password"
                            className="input-dark"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)' }}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn-primary-glow" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '12px' }}>
                        Iniciar Sesión
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
                    v1.5.0 - Americable Enterprise Edition
                </p>
            </div>
        </div>
    );
};

export default Login;
