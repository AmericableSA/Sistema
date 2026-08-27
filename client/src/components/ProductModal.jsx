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
    const [saving, setSaving] = useState(false);

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
        fetchUnits();

        if (product && product.id) {
            setFormData(product);
            if (product.type === 'bundle') {
                fetchBundleItems(product.id);
            } else {
                setBundleItems([]);
            }
        } else {
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
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000);
            finalSku = `PROD-${timestamp}-${random}`;
        }

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

        setSaving(true);
        try {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit
                ? `/api/products/${product.id}`
                : '/api/products';

            // FIX: Include Authorization token
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const response = await fetch(url, {
                method,
                headers,
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
        } finally {
            setSaving(false);
        }
    };

    const isEdit = product && product.id;

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(6px)',
            padding: '1rem',
            overflowY: 'auto'
        }}>
            <div style={{
                width: '700px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: 'clamp(1rem, 3vw, 2rem)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)',
                margin: 'auto'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
                    paddingBottom: '1rem', gap: '1rem', flexWrap: 'wrap'
                }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', fontWeight: 800 }}>
                        {isEdit ? `✏️ Editar: ${product.name || 'Item'}` : '➕ Crear Nuevo Producto'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8', width: '32px', height: '32px', borderRadius: '50%',
                            cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                    >✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>

                    {/* TYPE SELECTOR */}
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Tipo de Item</label>
                        <select
                            name="type"
                            value={formData.type || 'product'}
                            onChange={handleChange}
                            className="input-dark"
                            style={{ width: '100%', padding: '0.7rem 1rem' }}
                        >
                            <option value="product">📦 Producto Físico (Inventariable)</option>
                            <option value="bundle">✨ Combo Key (Kit / Paquete)</option>
                            <option value="service">🛠️ Servicio (Mano de Obra)</option>
                        </select>
                    </div>

                    {/* SKU + Name */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>SKU / Código (Auto si vacío)</label>
                            <input className="input-dark" name="sku" value={formData.sku} onChange={handleChange} placeholder="(Autogenerado)" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Nombre *</label>
                            <input className="input-dark" name="name" value={formData.name} onChange={handleChange} required placeholder="Ej: Kit Instalación" style={{ width: '100%' }} />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Descripción</label>
                        <textarea className="input-dark" name="description" value={formData.description || ''} onChange={handleChange} rows="2" style={{ width: '100%', resize: 'vertical' }} />
                    </div>

                    {/* ═══════ PRECIO DE VENTA — ALWAYS VISIBLE & PROMINENT ═══════ */}
                    <div style={{
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        borderRadius: '14px',
                        padding: 'clamp(0.75rem, 2vw, 1.25rem)'
                    }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            color: '#fbbf24', fontSize: '0.85rem', fontWeight: 800,
                            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem'
                        }}>
                            💰 Precio de Venta (C$)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input-dark"
                            name="selling_price"
                            value={formData.selling_price}
                            onChange={handleChange}
                            placeholder="0.00"
                            style={{
                                width: '100%', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                                fontWeight: 800, textAlign: 'center',
                                color: '#fbbf24', padding: '0.8rem',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(245,158,11,0.3)',
                                borderRadius: '10px'
                            }}
                        />
                        {isEdit && (
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                                Precio anterior: C$ {Number(product.selling_price || 0).toFixed(2)}
                            </p>
                        )}
                    </div>

                    {/* DYNAMIC FIELDS BASED ON TYPE */}
                    {formData.type === 'product' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Stock Actual</label>
                                <input type="number" className="input-dark" name="current_stock" value={formData.current_stock} onChange={handleChange} required style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Unidad Medida</label>
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
                                                        fetchUnits();
                                                        setFormData(prev => ({ ...prev, unit_of_measure: created.name }));
                                                    } else {
                                                        const err = await res.json();
                                                        alert(err.msg || 'Error creando unidad');
                                                    }
                                                } catch (e) { alert('Error de conexión'); }
                                            }
                                        }}
                                        style={{
                                            padding: '0 12px', fontSize: '1.2rem', fontWeight: 'bold',
                                            background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                                            border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
                                        title="Crear Nueva Unidad"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Costo Unitario (C$)</label>
                                <input type="number" step="0.01" className="input-dark" name="unit_cost" value={formData.unit_cost} onChange={handleChange} required style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Alerta Stock Mín.</label>
                                <input type="number" className="input-dark" name="min_stock_alert" value={formData.min_stock_alert} onChange={handleChange} style={{ width: '100%' }} />
                            </div>
                        </div>
                    )}

                    {formData.type === 'bundle' && (
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 'clamp(0.75rem, 2vw, 1rem)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
                            <h4 style={{ color: '#60a5fa', margin: '0 0 1rem 0', fontSize: '0.95rem' }}>📦 Contenido del Combo</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <select
                                    className="input-dark"
                                    value={selectedIngredientId}
                                    onChange={e => setSelectedIngredientId(e.target.value)}
                                    style={{ flex: '1 1 200px', minWidth: 0 }}
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
                                    style={{ width: '80px', flexShrink: 0 }}
                                    placeholder="Cant"
                                />
                                <button type="button" onClick={addIngredient} style={{
                                    padding: '0.5rem 0.75rem', background: 'rgba(34,197,94,0.15)',
                                    color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)',
                                    borderRadius: '8px', cursor: 'pointer', fontWeight: 700, flexShrink: 0
                                }}>➕</button>
                            </div>

                            {bundleItems.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #475569' }}>
                                                <th style={{ padding: '0.5rem' }}>Producto</th>
                                                <th style={{ padding: '0.5rem' }}>Cant</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bundleItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '0.5rem' }}>{item.name}</td>
                                                    <td style={{ padding: '0.5rem' }}>{item.quantity}</td>
                                                    <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                                                        <button type="button" onClick={() => removeIngredient(item.product_id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>No hay items en este combo.</p>}
                        </div>
                    )}

                    {/* SERVICE ORDER AUTOMATION — shown only for services */}
                    {formData.type === 'service' && (
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: '12px', padding: 'clamp(0.75rem, 2vw, 1.25rem)'
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
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Tipo de Trámite que se Generará</label>
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
                    {isEdit && formData.type === 'product' && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                            <label style={{
                                display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.05em', marginBottom: '0.5rem',
                                color: Number(product.current_stock) !== Number(formData.current_stock) ? '#ef4444' : '#fbbf24'
                            }}>
                                {Number(product.current_stock) !== Number(formData.current_stock) ? '📝 Razón del Cambio (REQUERIDO)' : '📝 Razón del Cambio (Opcional)'}
                            </label>
                            <input
                                className="input-dark"
                                name="reason"
                                placeholder={Number(product.current_stock) !== Number(formData.current_stock) ? "Explica el ajuste de stock..." : "Ej: Corrección de precio, Cambio de nombre..."}
                                value={formData.reason || ''}
                                onChange={handleChange}
                                style={{
                                    width: '100%',
                                    borderColor: Number(product.current_stock) !== Number(formData.current_stock) && !formData.reason ? '#ef4444' : 'rgba(255,255,255,0.1)'
                                }}
                            />
                        </div>
                    )}

                    {/* ACTIVAR PARA VENTA EN CAJA */}
                    <div style={{
                        background: (formData.is_for_sale === 0) ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: (formData.is_for_sale === 0) ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '12px',
                        padding: 'clamp(0.75rem, 2vw, 1rem)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                    }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: (formData.is_for_sale === 0) ? '#f87171' : '#34d399', fontSize: '0.95rem' }}>
                                🛒 Activar para Venta en Facturación
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                                Si está activado, aparecerá en el menú de cobro y venta de materiales en caja.
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            <input
                                type="checkbox"
                                checked={formData.is_for_sale !== 0}
                                onChange={e => setFormData(prev => ({ ...prev, is_for_sale: e.target.checked ? 1 : 0 }))}
                                style={{ width: '22px', height: '22px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                        </label>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: '1 1 120px', padding: '0.8rem', borderRadius: '12px',
                                background: 'transparent', border: '1px solid #334155',
                                color: '#94a3b8', cursor: 'pointer', fontWeight: 600,
                                fontSize: '0.95rem', transition: 'all 0.2s'
                            }}
                        >Cancelar</button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                flex: '2 1 180px', padding: '0.8rem', borderRadius: '12px',
                                background: saving ? '#1e3a5f' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                border: 'none', color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
                                fontWeight: 800, fontSize: '1rem',
                                boxShadow: saving ? 'none' : '0 4px 15px rgba(59,130,246,0.35)',
                                transition: 'all 0.2s', opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? '⏳ Guardando...' : (isEdit ? '✅ Actualizar Producto' : '✅ Guardar Producto')}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ProductModal;
