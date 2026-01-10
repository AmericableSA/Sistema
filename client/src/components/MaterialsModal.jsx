import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const MaterialsModal = ({ order, onClose }) => {
    const [materials, setMaterials] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);

    // Fetch Materials and Inventory
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Used Materials
                const matRes = await fetch(`/api/clients/orders/${order.id}/materials`);
                const matData = await matRes.json();
                setMaterials(Array.isArray(matData) ? matData : []);

                // 2. Fetch Inventory for Selection
                const invRes = await fetch('/api/products'); // Reusing existing endpoint
                const invData = await invRes.json();
                setInventory(Array.isArray(invData) ? invData.filter(p => p.type === 'product' && p.is_active !== 0) : []);

                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };
        fetchData();
    }, [order.id]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!selectedProductId || quantity <= 0) return;
        setAdding(true);

        try {
            const res = await fetch(`/api/clients/orders/${order.id}/materials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: selectedProductId,
                    quantity: quantity,
                    user_id: 1 // TODO: Auth
                })
            });

            if (res.ok) {
                const newItem = await res.json();
                // Refresh list
                const matRes = await fetch(`/api/clients/orders/${order.id}/materials`);
                const matData = await matRes.json();
                setMaterials(matData);

                // Reset Form
                setSelectedProductId('');
                setQuantity(1);
            } else {
                alert('Error al agregar material');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (id) => {
        if (!window.confirm('¿Eliminar material y restaurar stock?')) return;
        try {
            const res = await fetch(`/api/clients/orders/materials/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: 1 })
            });
            if (res.ok) {
                setMaterials(materials.filter(m => m.id !== id));
            } else {
                alert('Error al eliminar');
            }
        } catch (e) { console.error(e); }
    };

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="glass-card" style={{ width: '800px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'white' }}>📦 Materiales Utilizados</h3>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Orden #{order.id} - {order.type}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                {/* ADD SECTION */}
                <form onSubmit={handleAdd} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label className="label-dark">Seleccionar Material / Producto</label>
                        <select
                            className="input-dark"
                            value={selectedProductId}
                            onChange={e => setSelectedProductId(e.target.value)}
                            required
                        >
                            <option value="">-- Buscar en Inventario --</option>
                            {inventory.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (Stock: {p.current_stock} {p.unit_of_measure})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ width: '100px' }}>
                        <label className="label-dark">Cantidad</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input-dark"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            min="0.01"
                            required
                        />
                    </div>
                    <button type="submit" disabled={adding} className="btn-primary-glow" style={{ padding: '0.7rem 1.5rem' }}>
                        {adding ? 'Agregando...' : '➕ Agregar'}
                    </button>
                </form>

                {/* LIST SECTION */}
                <h4 style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>Listado de Materiales</h4>
                {loading ? <p style={{ color: '#94a3b8' }}>Cargando...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left', color: '#94a3b8' }}>
                                <th style={{ padding: '0.75rem' }}>Producto</th>
                                <th style={{ padding: '0.75rem' }}>Cantidad</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials.length === 0 ? (
                                <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No se han registrado materiales para esta orden.</td></tr>
                            ) : materials.map(m => (
                                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem' }}>
                                        <div style={{ fontWeight: 'bold' }}>{m.product_name || 'Producto Desconocido'}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {m.sku}</div>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <span style={{ fontWeight: 'bold', color: 'white' }}>{m.quantity}</span> <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{m.unit_of_measure || 'Unidad'}</span>
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                        <button onClick={() => handleRemove(m.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                            Eliminar 🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                    <button onClick={onClose} className="btn-secondary">Cerrar</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MaterialsModal;
