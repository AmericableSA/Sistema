import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Header = ({ onMenuClick }) => {
    const { user } = useAuth();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!user) return null;

    return (
        <header style={{
            height: '70px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'center' : 'flex-start',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 80, /* Lower than Overlay */
            transition: 'all 0.3s ease',
            pointerEvents: 'none' /* Allow clicks to pass through empty space */
        }}>
            {/* Hamburger */}
            <button
                onClick={onMenuClick}
                style={{
                    display: isMobile ? 'block' : 'none',
                    position: 'absolute',
                    left: '1rem',
                    background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'white',
                    pointerEvents: 'auto' /* Capture clicks on button */
                }}
            >
                ☰
            </button>

            {/* User Pill */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.8rem',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '0.5rem 1.2rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                marginLeft: isMobile ? 0 : '1rem',
                pointerEvents: 'auto' /* Capture clicks on user info */
            }}>
                {/* Avatar Removed as requested ("eliminalo esa primera foto") */}

                <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'white', lineHeight: 1.2 }}>
                        {user.full_name || user.username}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                        {user.role}
                    </span>
                </div>
            </div>
        </header>
    );
};

export default Header;
