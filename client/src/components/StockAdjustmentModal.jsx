import React, { useState } from 'react';

const StockAdjustmentModal = ({ product, onClose, onSave }) => {
    const [type, setType] = useState('IN'); // IN or OUT
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Por favor indique un motivo para el ajuste.');
            return;
        }

        const payload = {
            product_id: product.id,
            transaction_type: type,
            quantity: parseInt(quantity),
            reason: reason,
            user_id: 1 // Hardcoded for now, logical TODO: Get from Auth Context
        };

        try {
            const res = await fetch('http://localhost:3001/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSave();
                onClose();
            } else {
                setError('Error al registrar el movimiento.');
            }
        } catch (err) {
            setError('Error de conexión con el servidor.');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="card animate-fade-in" style={{ width: '450px', maxWidth: '95%' }}>
                <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
                    Ajustar Stock: <span style={{ color: 'var(--color-primary-brand)' }}>{product.sku}</span>
                </h3>

                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Producto</p>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-secondary-dark)' }}>{product.name}</p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                        Stock Actual: <strong>{product.current_stock}</strong>
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Tipo de Movimiento</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{
                                flex: 1, padding: '0.75rem', borderRadius: '8px',
                                border: `2px solid ${type === 'IN' ? '#166534' : '#E2E8F0'}`,
                                background: type === 'IN' ? '#F0FDF4' : 'white',
                                cursor: 'pointer', textAlign: 'center', fontWeight: 600,
                                color: type === 'IN' ? '#166534' : '#64748B'
                            }}>
                                <input type="radio" name="type" value="IN" checked={type === 'IN'} onChange={() => setType('IN')} style={{ display: 'none' }} />
                                📥 Entrada (Sumar)
                            </label>
                            <label style={{
                                flex: 1, padding: '0.75rem', borderRadius: '8px',
                                border: `2px solid ${type === 'OUT' ? '#991B1B' : '#E2E8F0'}`,
                                background: type === 'OUT' ? '#FEF2F2' : 'white',
                                cursor: 'pointer', textAlign: 'center', fontWeight: 600,
                                color: type === 'OUT' ? '#991B1B' : '#64748B'
                            }}>
                                <input type="radio" name="type" value="OUT" checked={type === 'OUT'} onChange={() => setType('OUT')} style={{ display: 'none' }} />
                                📤 Salida (Restar)
                            </label>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Cantidad</label>
                        <input
                            type="number" min="1" className="input-field"
                            value={quantity} onChange={(e) => setQuantity(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Motivo / Razón</label>
                        <textarea
                            className="input-field"
                            rows="2"
                            placeholder="Ej: Compra de lote #123, Devolución o Dañado..."
                            value={reason} onChange={(e) => setReason(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem', background: '#FEF2F2', color: '#991B1B', borderRadius: '6px', fontSize: '0.9rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} style={{
                            background: 'white', border: '1px solid #CBD5E1',
                            padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-sm)',
                            fontWeight: 600, color: 'var(--color-text-muted)', cursor: 'pointer'
                        }}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" style={{
                            background: type === 'IN' ? undefined : '#EF4444',
                            boxShadow: type === 'IN' ? undefined : '0 10px 30px -5px rgba(239, 68, 68, 0.25)'
                        }}>
                            {type === 'IN' ? 'Registrar Entrada' : 'Registrar Salida'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockAdjustmentModal;
