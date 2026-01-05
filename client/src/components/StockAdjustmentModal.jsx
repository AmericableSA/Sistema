import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const StockAdjustmentModal = ({ product, onClose, onSave }) => {
    const [type, setType] = useState('IN'); // IN or OUT
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Get user from local storage to ensure valid user_id
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Error parsing user", e);
            }
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!reason.trim()) {
            setError('Por favor indique un motivo para el ajuste.');
            return;
        }

        if (!currentUser || !currentUser.id) {
            setError('Error de sesión: No se pudo identificar al usuario. Por favor recargue.');
            return;
        }

        const payload = {
            product_id: product.id,
            transaction_type: type,
            quantity: parseInt(quantity),
            reason: reason,
            user_id: currentUser.id
        };

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                onSave();
                onClose();
            } else {
                setError(data.msg || 'Error al registrar el movimiento.');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión con el servidor.');
        }
    };

    const currentStock = parseInt(product.current_stock || 0);
    const qtyVal = parseInt(quantity || 0);
    const finalStock = type === 'IN' ? currentStock + qtyVal : currentStock - qtyVal;

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>

            <div className="glass-card" style={{
                width: '500px',
                maxWidth: '95%',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                animation: 'slideIn 0.3s ease-out',
                color: 'white'
            }}>
                <h2 style={{
                    marginTop: 0,
                    marginBottom: '1.5rem',
                    fontSize: '1.5rem',
                    borderBottom: '1px solid #334155',
                    paddingBottom: '1rem',
                    color: 'white'
                }}>
                    Ajustar Stock: <span style={{ color: '#3b82f6' }}>{product.sku || 'N/A'}</span>
                </h2>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</p>
                        <p style={{ margin: '0.25rem 0 0 0', fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>{product.name}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>

                    {/* TIPO DE MOVIMIENTO */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: '#e2e8f0' }}>Tipo de Movimiento</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setType('IN')}
                                style={{
                                    flex: 1, padding: '1rem', borderRadius: '12px',
                                    border: type === 'IN' ? '2px solid #22c55e' : '1px solid #334155',
                                    background: type === 'IN' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.02)',
                                    color: type === 'IN' ? '#4ade80' : '#94a3b8',
                                    cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📥 Entrada (Sumar)
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('OUT')}
                                style={{
                                    flex: 1, padding: '1rem', borderRadius: '12px',
                                    border: type === 'OUT' ? '2px solid #ef4444' : '1px solid #334155',
                                    background: type === 'OUT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
                                    color: type === 'OUT' ? '#f87171' : '#94a3b8',
                                    cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📤 Salida (Restar)
                            </button>
                        </div>
                    </div>

                    {/* CANTIDAD CALCULATION */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.25rem' }}>ACTUAL</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{currentStock}</div>
                            </div>

                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: type === 'IN' ? '#4ade80' : '#f87171' }}>
                                {type === 'IN' ? '+' : '-'}
                            </div>

                            <div style={{ flex: 1 }}>
                                <input
                                    type="number" min="1"
                                    value={quantity} onChange={(e) => setQuantity(e.target.value)}
                                    required
                                    style={{
                                        width: '100%', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold',
                                        padding: '0.75rem', borderRadius: '8px',
                                        background: '#1e293b', border: '1px solid #475569', color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#64748b' }}>=</div>

                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.25rem' }}>FINAL</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: finalStock < 0 ? '#ef4444' : 'white' }}>{finalStock}</div>
                            </div>
                        </div>
                    </div>

                    {/* MOTIVO */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, color: '#e2e8f0' }}>Motivo / Razón</label>
                        <textarea
                            rows="2"
                            placeholder="Ej: Compra de lote, Devolución..."
                            value={reason} onChange={(e) => setReason(e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '0.8rem', borderRadius: '8px',
                                background: '#1e293b', border: '1px solid #475569', color: 'white',
                                fontSize: '1rem', resize: 'vertical', fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} style={{
                            background: 'transparent', border: '1px solid #475569',
                            padding: '0.8rem 1.5rem', borderRadius: '8px',
                            fontWeight: 600, color: '#cbd5e1', cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}>
                            Cancelar
                        </button>
                        <button type="submit" style={{
                            background: type === 'IN' ? '#22c55e' : '#ef4444',
                            border: 'none',
                            padding: '0.8rem 2rem', borderRadius: '8px',
                            fontWeight: 700, color: 'white', cursor: 'pointer',
                            boxShadow: type === 'IN' ? '0 4px 12px rgba(34, 197, 94, 0.3)' : '0 4px 12px rgba(239, 68, 68, 0.3)',
                            transition: 'transform 0.1s'
                        }}>
                            {type === 'IN' ? 'Confirmar Entrada' : 'Confirmar Salida'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default StockAdjustmentModal;

