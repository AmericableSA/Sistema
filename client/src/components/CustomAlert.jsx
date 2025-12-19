import React from 'react';

const CustomAlert = ({ isOpen, title, message, type = 'info', onClose, onConfirm, showCancel = false }) => {
    if (!isOpen) return null;

    const getColors = () => {
        // Darkened colors for glass theme
        switch (type) {
            case 'error': return {
                bgGradient: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(185,28,28,0.2))',
                border: '#ef4444',
                text: '#fca5a5',
                icon: '⚠️',
                glow: '0 0 15px rgba(239, 68, 68, 0.4)'
            };
            case 'success': return {
                bgGradient: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(21,128,61,0.2))',
                border: '#22c55e',
                text: '#86efac',
                icon: '✅',
                glow: '0 0 15px rgba(34, 197, 94, 0.4)'
            };
            case 'warning': return {
                bgGradient: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(180,83,9,0.2))',
                border: '#f59e0b',
                text: '#fcd34d',
                icon: '⚠️',
                glow: '0 0 15px rgba(245, 158, 11, 0.4)'
            };
            default: return {
                bgGradient: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.2))',
                border: '#3b82f6',
                text: '#93c5fd',
                icon: 'ℹ️',
                glow: '0 0 15px rgba(59, 130, 246, 0.4)'
            };
        }
    };

    const colors = getColors();

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 2000,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '5rem',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="glass-card" style={{
                width: '400px', maxWidth: '90%',
                padding: '0', overflow: 'hidden',
                background: '#0f172a', /* Solid base for readability */
                border: `1px solid ${colors.border}`,
                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), ${colors.glow}`,
                animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                {/* Header / Body */}
                <div style={{
                    padding: '2rem 1.5rem',
                    background: colors.bgGradient,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                    gap: '1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{
                        fontSize: '3rem',
                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                    }}>
                        {colors.icon}
                    </div>
                    <div>
                        <h3 style={{
                            margin: '0 0 0.5rem 0',
                            color: 'white',
                            fontSize: '1.5rem',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}>
                            {title}
                        </h3>
                        <p style={{
                            margin: 0,
                            color: '#cbd5e1',
                            fontSize: '1rem',
                            lineHeight: '1.5'
                        }}>
                            {message}
                        </p>
                    </div>
                </div>

                {/* Footer Controls */}
                <div style={{
                    padding: '1.25rem', background: '#0b1121',
                    display: 'flex', justifyContent: 'center', gap: '1rem',
                }}>
                    {showCancel && (
                        <button onClick={onClose} style={{
                            padding: '0.75rem 1.5rem', background: 'transparent',
                            border: '1px solid #475569', borderRadius: '12px',
                            color: '#94a3b8', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                            onMouseEnter={(e) => {
                                e.target.style.borderColor = 'white';
                                e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.borderColor = '#475569';
                                e.target.style.color = '#94a3b8';
                            }}
                        >
                            Cancelar
                        </button>
                    )}

                    <button onClick={onConfirm || onClose}
                        className="btn-dark-glow"
                        style={{
                            padding: '0.75rem 2rem',
                            borderRadius: '12px',
                            minWidth: '120px',
                            borderColor: colors.border
                        }}
                    >
                        {showCancel ? 'Confirmar' : 'Entendido'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomAlert;
