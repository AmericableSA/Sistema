
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductModal from '../components/ProductModal';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import CustomAlert from '../components/CustomAlert';
import ComboManagerModal from '../components/ComboManagerModal';
import InventoryHistoryModal from '../components/InventoryHistoryModal';
import FullPageLoader from '../components/FullPageLoader';

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });
    const [confirm, setConfirm] = useState({ show: false, message: '', action: null });

    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showStockModal, setShowStockModal] = useState(false);
    const [stockProduct, setStockProduct] = useState(null);

    const [showComboManager, setShowComboManager] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Quick-price modal state (for services)
    const [quickPriceProduct, setQuickPriceProduct] = useState(null);
    const [quickPriceValue, setQuickPriceValue] = useState('');
    const [quickPriceSaving, setQuickPriceSaving] = useState(false);

    const handleQuickPriceSave = async () => {
        if (!quickPriceProduct || isNaN(parseFloat(quickPriceValue)) || parseFloat(quickPriceValue) < 0) {
            setAlert({ show: true, type: 'error', title: 'Error', message: 'Ingrese un precio válido mayor o igual a 0.' });
            return;
        }
        setQuickPriceSaving(true);
        try {
            const payload = { ...quickPriceProduct, selling_price: parseFloat(quickPriceValue), reason: 'Actualización rápida de precio desde Inventario' };
            const res = await fetch(`/api/products/${quickPriceProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setAlert({ show: true, type: 'success', title: '✅ Precio Actualizado', message: `"${quickPriceProduct.name}" ahora cuesta C$ ${parseFloat(quickPriceValue).toFixed(2)}` });
                setQuickPriceProduct(null);
                fetchProducts();
            } else {
                const err = await res.json();
                setAlert({ show: true, type: 'error', title: 'Error', message: err.msg || 'No se pudo actualizar el precio.' });
            }
        } catch (e) {
            setAlert({ show: true, type: 'error', title: 'Error', message: 'Error de conexión.' });
        } finally { setQuickPriceSaving(false); }
    };

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            setProducts(data);
            setLoading(false);
        } catch (error) {
            console.error("Error al obtener productos:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (product) => {
        setEditingProduct(product);
        setShowModal(true);
    };

    const handleCreate = (type = 'product') => {
        setEditingProduct({ type });
        setShowModal(true);
    };
    const handleDeleteProduct = (product) => {
        setConfirm({
            show: true,
            message: `¿Eliminar "${product.name}"?`,
            action: async () => {
                setConfirm({ show: false, message: '', action: null });
                try {
                    const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        fetchProducts();
                        setAlert({ show: true, type: 'success', title: 'Eliminado', message: 'Producto eliminado.' });
                    } else {
                        const err = await res.json();
                        setAlert({ show: true, type: 'error', title: 'Error', message: err.msg || 'No se puede eliminar.' });
                    }
                } catch (e) {
                    setAlert({ show: true, type: 'error', title: 'Error', message: 'Error de conexión.' });
                }
            }
        });
    };
    const handleExport = async () => {
        try {
            setAlert({ show: true, type: 'info', title: 'Exportando...', message: 'Generando archivo Excel, por favor espere.' });

            const params = new URLSearchParams({
                search: searchTerm
            });

            const res = await fetch(`/api/products/export-xls?${params.toString()}`);

            if (!res.ok) throw new Error('Error al generar reporte');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Reporte_Inventario.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setAlert({ show: true, type: 'success', title: 'Éxito', message: 'Reporte descargado correctamente.' });
        } catch (error) {
            console.error(error);
            setAlert({ show: true, type: 'error', title: 'Error', message: 'No se pudo exportar el archivo. Intente nuevamente.' });
        }
    };

    return (
        <div className="page-container">
            {loading && <FullPageLoader />}

            <div className="animate-entry page-header">
                <div>
                    <h1>Inventario General</h1>
                    <p>Gestión completa de productos, existencias y precios.</p>
                </div>

                <div className="header-actions">
                    <button
                        className="btn-dark-glow"
                        onClick={handleExport}
                        style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}
                    >
                        Exportar Excel
                    </button>
                    <button className="btn-dark-glow" onClick={() => setShowComboManager(true)} style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#a78bfa' }}>
                        Administrar Combos
                    </button>
                    <button className="btn-dark-glow" onClick={() => setShowHistoryModal(true)} style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        Historial
                    </button>

                    <button className="btn-dark-glow" onClick={() => handleCreate('product')} style={{ padding: '0.8rem 1.5rem' }}>
                        + NUEVO PRODUCTO
                    </button>
                </div>
            </div>

            <div className="animate-entry" style={{ marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Buscar SKU o Nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-dark"
                    style={{ maxWidth: '400px' }}
                />
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="responsive-table-wrapper">
                    <table className="table-tuani">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Producto</th>
                                <th>Tipo</th>
                                <th style={{ textAlign: 'right' }}>Stock / Unidad</th>
                                <th style={{ textAlign: 'right' }}>Precio</th>
                                <th style={{ textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Accediendo a base de datos...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>{searchTerm ? 'No hay resultados.' : 'Inventario vacío.'}</td></tr>
                            ) : filteredProducts.map((product) => (
                                <tr key={product.id} style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'background 0.2s'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '1.25rem 1.5rem', color: 'white', fontWeight: 600 }}>
                                        {product.sku}
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>ID: {product.id}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', color: '#e2e8f0' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{product.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {product.description || '---'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        {product.type === 'bundle' ? (
                                            <span style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                                                ✨ Combo
                                            </span>
                                        ) : product.type === 'service' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                                                    🛠️ Servicio
                                                </span>
                                                {product.creates_service_order ? (
                                                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                        ⚡ Auto-Trámite: {product.service_order_type}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <span style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                                📦 Producto
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {product.type === 'bundle' || product.type === 'service' ? (
                                            <span style={{ color: '#64748b' }}>-</span>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <button onClick={() => { setStockProduct(product); setShowStockModal(true); }}
                                                    style={{
                                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                                        display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end'
                                                    }}
                                                >
                                                    <span style={{
                                                        fontSize: '1.1rem', fontWeight: 700,
                                                        color: product.current_stock <= product.min_stock_alert ? '#ef4444' : '#22c55e',
                                                        textShadow: product.current_stock <= product.min_stock_alert ? '0 0 10px rgba(239,68,68,0.4)' : '0 0 10px rgba(34,197,94,0.4)'
                                                    }}>
                                                        {product.current_stock}
                                                    </span>
                                                </button>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{product.unit_of_measure || 'Unidad'}</span>
                                                {product.current_stock <= product.min_stock_alert && <span style={{ fontSize: '0.65rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Crítico</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'white' }}>
                                        C$ {Number(product.selling_price).toFixed(2)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {/* Bug 4: Visible Entrada/Salida buttons for products only */}
                                            {product.type !== 'bundle' && product.type !== 'service' && (
                                                <>
                                                    <button
                                                        onClick={() => { setStockProduct({ ...product, _defaultType: 'IN' }); setShowStockModal(true); }}
                                                        title="Registrar Entrada de Stock"
                                                        style={{
                                                            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
                                                            color: '#4ade80', padding: '0.45rem 0.75rem', borderRadius: '8px',
                                                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                                                            display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                    >
                                                        📥 Entrada
                                                    </button>
                                                    <button
                                                        onClick={() => { setStockProduct({ ...product, _defaultType: 'OUT' }); setShowStockModal(true); }}
                                                        title="Registrar Salida de Stock"
                                                        style={{
                                                            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                                                            color: '#f87171', padding: '0.45rem 0.75rem', borderRadius: '8px',
                                                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                                                            display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                    >
                                                        📤 Salida
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => handleEdit(product)} className="btn-icon btn-edit" title="Editar producto">
                                                ✎
                                            </button>
                                            {/* Quick-price button for services */}
                                            {product.type === 'service' && (
                                                <button
                                                    onClick={() => { setQuickPriceProduct(product); setQuickPriceValue(product.selling_price); }}
                                                    title="Cambiar precio rápidamente"
                                                    style={{
                                                        background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
                                                        color: '#fbbf24', padding: '0.45rem 0.75rem', borderRadius: '8px',
                                                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                                                        display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                >
                                                    💰 Precio
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteProduct(product)} className="btn-icon btn-delete" title="Eliminar producto">
                                                ✕
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                    <ProductModal
                        product={editingProduct}
                        allProducts={products}
                        onClose={() => setShowModal(false)}
                        onSave={fetchProducts}
                    />
                )
            }

            {/* STOCK MODAL */}
            {
                showStockModal && (
                    <StockAdjustmentModal
                        product={stockProduct}
                        onClose={() => setShowStockModal(false)}
                        onSave={() => {
                            setShowStockModal(false);
                            fetchProducts();
                            setAlert({ show: true, type: 'success', title: 'Stock Actualizado', message: 'El movimiento de inventario se ha registrado.' });
                        }}
                    />
                )
            }

            {/* PROVIDER MANAGER MODAL REMOVED */}

            {/* COMBO MANAGER MODAL */}
            {showComboManager && (
                <ComboManagerModal
                    products={products}
                    onClose={() => setShowComboManager(false)}
                    onCreateNew={() => { setShowComboManager(false); handleCreate('bundle'); }}
                    onEdit={(p) => { setShowComboManager(false); handleEdit(p); }}
                    onDelete={(p) => { setShowComboManager(false); handleDeleteProduct(p); }}
                />
            )}

            {/* HISTORY MODAL (GLOBAL) */}
            {showHistoryModal && (
                <InventoryHistoryModal onClose={() => setShowHistoryModal(false)} />
            )}

            {/* Custom Alerts */}
            <CustomAlert
                isOpen={alert.show}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, show: false })}
            />

            {/* Confirmation Dialog */}
            <CustomAlert
                isOpen={confirm.show}
                title="¿Estás seguro?"
                message={confirm.message}
                type="warning"
                showCancel={true}
                onClose={() => setConfirm({ ...confirm, show: false })}
                onConfirm={confirm.action}
            />

            {/* ===== QUICK PRICE MODAL ===== */}
            {quickPriceProduct && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000, backdropFilter: 'blur(6px)'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        border: '1px solid rgba(245,158,11,0.4)',
                        borderRadius: '20px', padding: '2rem', width: '420px', maxWidth: '95%',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.15)'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '2rem' }}>💰</span>
                            <div>
                                <h3 style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1.15rem' }}>
                                    Cambiar Precio
                                </h3>
                                <p style={{ margin: 0, color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {quickPriceProduct.name}
                                </p>
                            </div>
                        </div>

                        {/* Current price info */}
                        <div style={{
                            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Precio actual:</span>
                            <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.1rem' }}>
                                C$ {Number(quickPriceProduct.selling_price).toFixed(2)}
                            </span>
                        </div>

                        {/* New price input */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                                Nuevo Precio (C$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                autoFocus
                                className="input-dark"
                                value={quickPriceValue}
                                onChange={e => setQuickPriceValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleQuickPriceSave(); if (e.key === 'Escape') setQuickPriceProduct(null); }}
                                style={{ width: '100%', fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', padding: '0.75rem', color: '#fbbf24' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                Presiona Enter para guardar · Esc para cancelar
                            </p>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setQuickPriceProduct(null)}
                                style={{
                                    flex: 1, padding: '0.8rem', borderRadius: '10px',
                                    background: 'transparent', border: '1px solid #334155',
                                    color: '#94a3b8', cursor: 'pointer', fontWeight: 600
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleQuickPriceSave}
                                disabled={quickPriceSaving}
                                style={{
                                    flex: 2, padding: '0.8rem', borderRadius: '10px',
                                    background: quickPriceSaving ? '#78350f' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    border: 'none', color: 'white', cursor: quickPriceSaving ? 'not-allowed' : 'pointer',
                                    fontWeight: 800, fontSize: '1rem',
                                    boxShadow: quickPriceSaving ? 'none' : '0 4px 15px rgba(245,158,11,0.35)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {quickPriceSaving ? '⏳ Guardando...' : '✅ Guardar Precio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Inventory;

