import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const StockAdjustmentModal = ({ product, onClose, onSave }) => {
    const [type, setType] = useState(product?._defaultType || 'IN'); // Default from button clicked (IN or OUT)
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Error al procesar usuario", e);
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
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <h2 style={{
                    marginTop: 0,
                    marginBottom: '1.5rem',
                    fontSize: '1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
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

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Tipo de Movimiento</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setType('IN')}
                                className="btn-secondary"
                                style={{
                                    flex: 1, padding: '1rem', borderRadius: '12px',
                                    border: type === 'IN' ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                                    background: type === 'IN' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                    color: type === 'IN' ? '#4ade80' : '#94a3b8',
                                    fontWeight: 'bold', fontSize: '1rem'
                                }}
                            >
                                📥 Entrada
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('OUT')}
                                className="btn-secondary"
                                style={{
                                    flex: 1, padding: '1rem', borderRadius: '12px',
                                    border: type === 'OUT' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                                    background: type === 'OUT' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                    color: type === 'OUT' ? '#f87171' : '#94a3b8',
                                    fontWeight: 'bold', fontSize: '1rem'
                                }}
                            >
                                📤 Salida
                            </button>
                        </div>
                    </div>

                    {/* CANTIDAD CALCULATION */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
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
                                    className="input-dark"
                                    style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}
                                />
                            </div>

                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#64748b' }}>=</div>

                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.25rem' }}>FINAL</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: finalStock < 0 ? '#ef4444' : 'white' }}>{finalStock}</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Motivo / Razón</label>
                        <textarea
                            rows="2"
                            placeholder="Ej: Compra de lote, Devolución..."
                            value={reason} onChange={(e) => setReason(e.target.value)}
                            required
                            className="input-dark"
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary-glow" style={{
                            background: type === 'IN' ? '#22c55e' : '#ef4444',
                            boxShadow: type === 'IN' ? '0 4px 12px rgba(34, 197, 94, 0.3)' : '0 4px 12px rgba(239, 68, 68, 0.3)',
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

