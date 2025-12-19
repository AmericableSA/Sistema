import React, { useState, useEffect } from 'react';

const ProductModal = ({ product, allProducts, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        description: '',
        current_stock: 0,
        min_stock_alert: 5,
        selling_price: 0,
        unit_cost: 0,
        type: 'product' // default
    });

    // Bundle Logic
    const [bundleItems, setBundleItems] = useState([]);
    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [ingredientQty, setIngredientQty] = useState(1);

    // Providers Logic
    const [providers, setProviders] = useState([]);
    const [newProviderName, setNewProviderName] = useState('');
    const [showProviderInput, setShowProviderInput] = useState(false);

    useEffect(() => {
        // Fetch Providers
        fetch('http://localhost:3001/api/providers')
            .then(r => r.json())
            .then(data => setProviders(data))
            .catch(e => console.error(e));

        if (product) {
            setFormData(product);
            if (product.type === 'bundle') {
                fetch(`http://localhost:3001/api/products/${product.id}/bundle`)
                    .then(r => r.json())
                    .then(items => setBundleItems(items))
                    .catch(e => console.error(e));
            } else {
                setBundleItems([]);
            }
        } else {
            // Reset for new
            setFormData({
                sku: '', name: '', description: '',
                current_stock: 0, min_stock_alert: 5,
                selling_price: 0, unit_cost: 0, type: 'product',
                provider_id: ''
            });
            setBundleItems([]);
        }
    }, [product]);

    const handleCreateProvider = async () => {
        if (!newProviderName.trim()) return;
        try {
            const res = await fetch('http://localhost:3001/api/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProviderName })
            });
            const data = await res.json();
            setProviders([...providers, data]); // Add to list
            setFormData({ ...formData, provider_id: data.id }); // Auto-select
            setShowProviderInput(false);
            setNewProviderName('');
        } catch (e) { console.error(e); }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const addIngredient = () => {
        if (!selectedIngredientId || ingredientQty <= 0) return;
        const prod = allProducts.find(p => p.id === parseInt(selectedIngredientId));
        if (!prod) return;

        // Check if exists
        if (bundleItems.find(i => i.product_id === prod.id)) {
            alert('Producto ya está en el combo');
            return;
        }

        setBundleItems([...bundleItems, { product_id: prod.id, name: prod.name, quantity: parseInt(ingredientQty) }]);
        setSelectedIngredientId('');
        setIngredientQty(1);
    };

    const removeIngredient = (id) => {
        setBundleItems(bundleItems.filter(i => i.product_id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // VALIDATION: Validate Reason if Stock Changed (Only for edits)
        if (product && formData.type === 'product') {
            const oldStock = Number(product.current_stock);
            const newStock = Number(formData.current_stock);

            if (oldStock !== newStock && !formData.reason?.trim()) {
                alert('⚠️ REQUERIDO: Debes escribir una "Razón del Cambio" cuando modificas el stock manualmente.');
                return;
            }
        }

        try {
            const method = product ? 'PUT' : 'POST';
            const url = product
                ? `http://localhost:3001/api/products/${product.id}`
                : 'http://localhost:3001/api/products';

            const payload = { ...formData, bundle_items: bundleItems };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                onSave();
                onClose();
            } else {
                alert('Error: ' + (data.msg || data.message || 'Error al guardar el producto'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión con el servidor.');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="glass-card" style={{ width: '700px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', border: '1px solid #1e293b' }}>
                <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem', color: 'white' }}>
                    {product ? `Editar ${product.name || 'Item'}` : 'Crear Nuevo Producto'}
                </h3>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>

                    {/* TYPE SELECTOR */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label-dark">Tipo de Item</label>
                        <select
                            name="type"
                            value={formData.type || 'product'}
                            onChange={handleChange}
                            className="input-dark"
                            style={{ width: '100%', padding: '0.5rem' }}
                        >
                            <option value="product">📦 Producto Físico (Inventariable)</option>
                            <option value="bundle">✨ Combo Key (Kit / Paquete)</option>
                            <option value="service">🛠️ Servicio (Mano de Obra)</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="label-dark">SKU / Código</label>
                            <input className="input-dark" name="sku" value={formData.sku} onChange={handleChange} required placeholder="Ej: COMBO-01" />
                        </div>
                        <div>
                            <label className="label-dark">Nombre</label>
                            <input className="input-dark" name="name" value={formData.name} onChange={handleChange} required placeholder="Ej: Kit Instalación" />
                        </div>
                    </div>

                    <div>
                        <label className="label-dark">Descripción</label>
                        <textarea className="input-dark" name="description" value={formData.description} onChange={handleChange} rows="2" />
                    </div>

                    {/* PROVIDER SELECTOR */}
                    {formData.type === 'product' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="label-dark">Proveedor (Opcional)</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                    name="provider_id"
                                    value={formData.provider_id || ''}
                                    onChange={handleChange}
                                    className="input-dark"
                                    style={{ flex: 1, padding: '0.5rem' }}
                                >
                                    <option value="">-- Sin Proveedor --</option>
                                    {providers.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => setShowProviderInput(!showProviderInput)} className="btn-secondary" style={{ padding: '0 1rem', fontSize: '1.2rem' }} title="Crear Proveedor">+</button>
                            </div>
                            {/* Quick Create Provider Input */}
                            {showProviderInput && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                                    <input
                                        className="input-dark"
                                        placeholder="Nombre Nuevo Proveedor"
                                        value={newProviderName}
                                        onChange={e => setNewProviderName(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <button type="button" onClick={handleCreateProvider} className="btn-primary-glow" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Guardar</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DYNAMIC FIELDS BASED ON TYPE */}
                    {formData.type === 'product' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="label-dark">Stock Actual</label>
                                <input type="number" className="input-dark" name="current_stock" value={formData.current_stock} onChange={handleChange} required />
                            </div>
                            <div>
                                <label className="label-dark">Costo Unitario (C$)</label>
                                <input type="number" step="0.01" className="input-dark" name="unit_cost" value={formData.unit_cost} onChange={handleChange} required />
                            </div>
                        </div>
                    )}

                    {formData.type === 'bundle' && (
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                            <h4 style={{ color: '#60a5fa', margin: '0 0 1rem 0' }}>📦 Contenido del Combo</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <select
                                    className="input-dark"
                                    value={selectedIngredientId}
                                    onChange={e => setSelectedIngredientId(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">-- Seleccionar Producto --</option>
                                    {allProducts && allProducts.filter(p => p.type === 'product').map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    className="input-dark"
                                    value={ingredientQty}
                                    onChange={e => setIngredientQty(e.target.value)}
                                    style={{ width: '80px' }}
                                    placeholder="Cant"
                                />
                                <button type="button" onClick={addIngredient} className="btn-primary-glow" style={{ padding: '0.5rem', background: '#22c55e', borderColor: '#22c55e' }}>➕</button>
                            </div>

                            {/* LIST */}
                            {bundleItems.length > 0 ? (
                                <table style={{ width: '100%', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #475569' }}>
                                            <th>Producto</th>
                                            <th>Cant</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bundleItems.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '0.5rem' }}>{item.name}</td>
                                                <td>{item.quantity}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button type="button" onClick={() => removeIngredient(item.product_id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No hay items en este combo.</p>}
                        </div>
                    )}

                    {/* Reason Field for Edits */}
                    {product && formData.type === 'product' && (
                        <div style={{ marginBottom: '1rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                            <label className="label-dark" style={{ color: Number(product.current_stock) !== Number(formData.current_stock) ? '#ef4444' : '#fbbf24', fontWeight: 'bold' }}>
                                {Number(product.current_stock) !== Number(formData.current_stock) ? '📝 Razón del Cambio (REQUERIDO)' : '📝 Razón del Cambio (Opcional)'}
                            </label>
                            <input
                                className="input-dark"
                                name="reason"
                                placeholder={Number(product.current_stock) !== Number(formData.current_stock) ? "Explica el ajuste de stock..." : "Ej: Corrección de precio, Cambio de nombre..."}
                                value={formData.reason || ''}
                                onChange={handleChange}
                                style={{ borderColor: Number(product.current_stock) !== Number(formData.current_stock) && !formData.reason ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label-dark">Precio Venta (C$)</label>
                        <input type="number" step="0.01" className="input-dark" name="selling_price" value={formData.selling_price} onChange={handleChange} />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1' }}>Cancelar</button>
                        <button type="submit" className="btn-primary-glow" style={{ flex: 1, padding: '0.8rem' }}>
                            {product ? 'Actualizar' : 'Guardar Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
