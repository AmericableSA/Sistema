import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const ProductModal = ({ product, allProducts, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        description: '',
        current_stock: 0,
        min_stock_alert: 5,
        selling_price: 0,
        unit_cost: 0,
        type: 'product',
        unit_of_measure: 'Unidad',
        creates_service_order: 0,
        service_order_type: 'INSTALLATION'
    });

    const [bundleItems, setBundleItems] = useState([]);
    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [ingredientQty, setIngredientQty] = useState(1);
    const [availableUnits, setAvailableUnits] = useState([]);

    const fetchUnits = async () => {
        try {
            const res = await fetch('/api/products/units');
            if (res.ok) setAvailableUnits(await res.json());
        } catch (e) { console.error("Error fetching units:", e); }
    };

    const fetchBundleItems = async (bundleId) => {
        try {
            const res = await fetch(`/api/products/bundles/${bundleId}`);
            if (res.ok) setBundleItems(await res.json());
        } catch (e) { console.error("Error fetching bundle items:", e); }
    };



    useEffect(() => {
        fetchUnits(); // Fetch units when modal opens

        // If product has an ID, it's an EDIT.
        if (product && product.id) {
            setFormData(product);
            if (product.type === 'bundle') {
                fetchBundleItems(product.id);
            } else {
                setBundleItems([]);
            }
        } else {
            // Reset for new (or partial initial data provided like {type: 'bundle'})
            setFormData({
                sku: '', name: '', description: '',
                current_stock: 0, min_stock_alert: 5,
                selling_price: 0, unit_cost: 0, type: 'product',
                unit_of_measure: 'Unidad',
                creates_service_order: 0,
                service_order_type: 'INSTALLATION',
                ...(product || {})
            });
            setBundleItems([]);
        }
    }, [product]);



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

        // AUTO-SKU Generation
        let finalSku = formData.sku;
        if (!finalSku || !finalSku.trim()) {
            // Generate simple unique SKU: PROD-TIMESTAMP-RANDOM
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000);
            finalSku = `PROD-${timestamp}-${random}`;
        }

        // Prepare payload with potentially new SKU
        const payload = { ...formData, sku: finalSku, bundle_items: bundleItems };

        const isEdit = product && product.id;

        // VALIDATION: Validate Reason if Stock Changed (Only for edits)
        if (isEdit && formData.type === 'product') {
            const oldStock = Number(product.current_stock);
            const newStock = Number(formData.current_stock);

            if (oldStock !== newStock && !formData.reason?.trim()) {
                alert('⚠️ REQUERIDO: Debes escribir una "Razón del Cambio" cuando modificas el stock manualmente.');
                return;
            }
        }

        try {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit
                ? `/api/products/${product.id}`
                : '/api/products';

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

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)'
        }}>
            <div className="glass-card" style={{ width: '700px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: '#0f172a', border: '1px solid #1e293b' }}>
                <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem', color: 'white' }}>
                    {product && product.id ? `Editar ${product.name || 'Item'}` : 'Crear Nuevo Producto'}
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
                            <label className="label-dark">SKU / Código (Auto si vacío)</label>
                            <input className="input-dark" name="sku" value={formData.sku} onChange={handleChange} placeholder="(Autogenerado)" />
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



                    {/* DYNAMIC FIELDS BASED ON TYPE */}
                    {formData.type === 'product' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="label-dark">Stock Actual</label>
                                <input type="number" className="input-dark" name="current_stock" value={formData.current_stock} onChange={handleChange} required />
                            </div>
                            <div>
                                <label className="label-dark">Unidad Medida</label>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <select
                                        className="input-dark"
                                        name="unit_of_measure"
                                        value={formData.unit_of_measure}
                                        onChange={handleChange}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="Unidad">Unidad (Default)</option>
                                        {availableUnits.map(u => (
                                            <option key={u.id} value={u.name}>{u.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const newUnit = prompt('Nombre de la nueva unidad (ej: Litros, Metros, etc):');
                                            if (newUnit && newUnit.trim()) {
                                                try {
                                                    const res = await fetch('/api/products/units', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ name: newUnit.trim() })
                                                    });
                                                    if (res.ok) {
                                                        const created = await res.json();
                                                        fetchUnits(); // Refresh list
                                                        setFormData(prev => ({ ...prev, unit_of_measure: created.name })); // Auto select
                                                    } else {
                                                        const err = await res.json();
                                                        alert(err.msg || 'Error creando unidad');
                                                    }
                                                } catch (e) { alert('Error de conexión'); }
                                            }
                                        }}
                                        className="btn-secondary"
                                        style={{ padding: '0 10px', fontSize: '1.2rem', fontWeight: 'bold' }}
                                        title="Crear Nueva Unidad"
                                    >
                                        +
                                    </button>
                                </div>
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

                    {/* SERVICE ORDER AUTOMATION — shown only for services */}
                    {formData.type === 'service' && (
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: '12px', padding: '1.25rem', marginTop: '0.5rem'
                        }}>
                            <h4 style={{ color: '#60a5fa', margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700 }}>
                                🛠️ Automatización de Trámite al Facturar
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    cursor: 'pointer', color: '#cbd5e1', fontWeight: 600, fontSize: '0.9rem'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={!!formData.creates_service_order}
                                        onChange={e => setFormData(prev => ({ ...prev, creates_service_order: e.target.checked ? 1 : 0 }))}
                                        style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }}
                                    />
                                    Crear trámite automáticamente al facturar
                                </label>
                            </div>
                            {!!formData.creates_service_order && (
                                <div style={{ marginTop: '1rem' }}>
                                    <label className="label-dark">Tipo de Trámite que se Generará</label>
                                    <select
                                        className="input-dark"
                                        value={formData.service_order_type || 'INSTALLATION'}
                                        onChange={e => setFormData(prev => ({ ...prev, service_order_type: e.target.value }))}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="INSTALLATION">📡 Instalación</option>
                                        <option value="RECONNECTION">🔌 Reconexión</option>
                                        <option value="REPAIR">🔧 Reparación / Avería</option>
                                        <option value="CHANGE_ADDRESS">📍 Cambio de Dirección</option>
                                        <option value="CHANGE_NAME">📝 Cambio de Nombre</option>
                                        <option value="SERVICE">⚙️ Servicio General</option>
                                    </select>
                                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
                                        Al momento de cobrar este servicio, se creará automáticamente una orden de tipo <strong style={{ color: '#60a5fa' }}>{formData.service_order_type}</strong> en Pendientes.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reason Field for Edits */}
                    {product && product.id && formData.type === 'product' && (
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
                            {product && product.id ? 'Actualizar' : 'Guardar Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ProductModal;

