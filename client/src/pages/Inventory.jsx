import React, { useState, useEffect } from 'react';
import {
    FaPlus, FaFileExcel, FaHistory, FaLayerGroup, FaSearch,
    FaEdit, FaTrash, FaArrowDown, FaArrowUp, FaCoins, FaCheckCircle,
    FaBan, FaTools, FaBoxOpen, FaBoxes
} from 'react-icons/fa';
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
            const token = localStorage.getItem('token');
            const payload = { ...quickPriceProduct, selling_price: parseFloat(quickPriceValue), reason: 'Actualización rápida de precio desde Inventario' };
            const res = await fetch(`/api/products/${quickPriceProduct.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
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
            const token = localStorage.getItem('token');
            const response = await fetch('/api/products', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await response.json();
            setProducts(Array.isArray(data) ? data : []);
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
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (product) => {
        setEditingProduct(product);
        setShowModal(true);
    };

    const handleCreate = (type = 'product') => {
        setEditingProduct({ type, is_for_sale: 1 });
        setShowModal(true);
    };

    const handleToggleSale = async (product) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/products/${product.id}/toggle-sale`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_for_sale: data.is_for_sale } : p));
                setAlert({
                    show: true,
                    type: data.is_for_sale === 1 ? 'success' : 'info',
                    title: data.is_for_sale === 1 ? '✅ Activado para Venta' : '🚫 Desactivado para Venta',
                    message: `"${product.name}" ${data.is_for_sale === 1 ? 'ahora aparecerá disponible al facturar en caja.' : 'ha sido ocultado de la lista de venta en caja.'}`
                });
            } else {
                const err = await res.json();
                setAlert({ show: true, type: 'error', title: 'Error', message: err.msg || 'No se pudo alternar el estado.' });
            }
        } catch (e) {
            setAlert({ show: true, type: 'error', title: 'Error de Red', message: 'No se pudo conectar al servidor.' });
        }
    };

    const handleToggleSale = async (product) => {
        const newStatus = product.is_for_sale === 1 ? 0 : 1;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/products/${product.id}/toggle-sale`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ is_for_sale: newStatus })
            });
            if (res.ok) {
                fetchProducts();
                setAlert({ show: true, type: 'success', title: 'Actualizado', message: 'Estado de venta actualizado.' });
            } else {
                setAlert({ show: true, type: 'error', title: 'Error', message: 'No se pudo actualizar.' });
            }
        } catch (e) {
            setAlert({ show: true, type: 'error', title: 'Error', message: 'Error de red.' });
        }
    };

    const handleDeleteProduct = (product) => {
        setConfirm({
            show: true,
            message: `¿Eliminar "${product.name}"?`,
            action: async () => {
                setConfirm({ show: false, message: '', action: null });
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/products/${product.id}`, {
                        method: 'DELETE',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                    });
                    if (res.ok) {
                        fetchProducts();
                        setAlert({ show: true, type: 'success', title: 'Eliminado', message: 'Producto eliminado correctamente.' });
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

            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ search: searchTerm });
            const res = await fetch(`/api/products/export-xls?${params.toString()}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

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
        <div className="page-container" style={{ padding: 'clamp(1rem, 2.5vw, 2rem)' }}>
            {loading && <FullPageLoader />}

            <div className="animate-entry page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', margin: 0, fontWeight: '800', color: 'white' }}>
                        <FaBoxes color="#3b82f6" /> Inventario General
                    </h1>
                    <p style={{ color: '#94a3b8', margin: '0.4rem 0 0 0', fontSize: '0.95rem' }}>
                        Control de existencias, precios y activación exclusiva de productos para venta en caja.
                    </p>
                </div>

                <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn-dark-glow"
                        onClick={handleExport}
                        style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
                    >
                        <FaFileExcel /> Exportar Excel
                    </button>
                    <button
                        className="btn-dark-glow"
                        onClick={() => setShowComboManager(true)}
                        style={{ background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.35)', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
                    >
                        <FaLayerGroup /> Combos
                    </button>
                    <button
                        className="btn-dark-glow"
                        onClick={() => setShowHistoryModal(true)}
                        style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.35)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
                    >
                        <FaHistory /> Historial
                    </button>

                    <button
                        className="btn-dark-glow"
                        onClick={() => handleCreate('product')}
                        style={{ padding: '0.8rem 1.4rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.35)' }}
                    >
                        <FaPlus /> NUEVO PRODUCTO
                    </button>
                </div>
            </div>

            <div className="animate-entry" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
                    <FaSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                        type="text"
                        placeholder="Buscar por SKU o Nombre de producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-dark"
                        style={{ width: '100%', paddingLeft: '2.75rem', borderRadius: '12px' }}
                    />
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Total: <strong style={{ color: 'white' }}>{filteredProducts.length}</strong> ítems
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(30, 41, 59, 0.5)' }}>
                <div className="responsive-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table className="table-tuani" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '850px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.7)' }}>
                                <th style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU</th>
                                <th style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</th>
                                <th style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</th>
                                <th style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Stock / Unidad</th>
                                <th style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Precio Venta</th>
                                <th style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Venta en Caja</th>
                                <th style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Accediendo a base de datos...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>{searchTerm ? 'No se encontraron productos.' : 'No hay productos registrados.'}</td></tr>
                            ) : filteredProducts.map((product) => {
                                const isForSale = product.is_for_sale !== 0;
                                return (
                                    <tr key={product.id} style={{
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                        transition: 'background 0.2s'
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '1.1rem 1.25rem', color: 'white', fontWeight: 600 }}>
                                            {product.sku}
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>ID: {product.id}</div>
                                        </td>
                                        <td style={{ padding: '1.1rem 1.25rem', color: '#e2e8f0' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>{product.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {product.description || 'Sin descripción'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.1rem 1.25rem' }}>
                                            {product.type === 'bundle' ? (
                                                <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', padding: '0.3rem 0.65rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(139, 92, 246, 0.35)', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <FaLayerGroup size={12} /> Combo
                                                </span>
                                            ) : product.type === 'service' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.3rem 0.65rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(59, 130, 246, 0.35)', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <FaTools size={12} /> Servicio
                                                    </span>
                                                </div>
                                            ) : (
                                                <span style={{ background: 'rgba(52, 211, 153, 0.12)', color: '#34d399', padding: '0.3rem 0.65rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(52, 211, 153, 0.3)', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <FaBoxOpen size={12} /> Producto
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '1.1rem 1.25rem' }}>
                                            {product.type === 'bundle' || product.type === 'service' ? (
                                                <span style={{ color: '#64748b' }}>—</span>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <button onClick={() => { setStockProduct(product); setShowStockModal(true); }}
                                                        style={{
                                                            background: 'transparent', border: 'none', cursor: 'pointer',
                                                            display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end'
                                                        }}
                                                    >
                                                        <span style={{
                                                            fontSize: '1.15rem', fontWeight: 800,
                                                            color: product.current_stock <= product.min_stock_alert ? '#ef4444' : '#22c55e',
                                                            textShadow: product.current_stock <= product.min_stock_alert ? '0 0 10px rgba(239,68,68,0.4)' : '0 0 10px rgba(34,197,94,0.4)'
                                                        }}>
                                                            {product.current_stock}
                                                        </span>
                                                    </button>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{product.unit_of_measure || 'Unidad'}</span>
                                                    {product.current_stock <= product.min_stock_alert && (
                                                        <span style={{ fontSize: '0.65rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px', fontWeight: '800' }}>Stock Crítico</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'white', fontSize: '1rem', padding: '1.1rem 1.25rem' }}>
                                            C$ {Number(product.selling_price || 0).toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '1.1rem 1.25rem' }}>
                                            <button
                                                onClick={() => handleToggleSale(product)}
                                                title={isForSale ? "Desactivar para que NO aparezca en la caja al cobrar" : "Activar para que APAREZCA en la caja al cobrar"}
                                                style={{
                                                    background: isForSale ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                                                    border: isForSale ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.35)',
                                                    color: isForSale ? '#34d399' : '#f87171',
                                                    padding: '0.45rem 0.85rem',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '700',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: isForSale ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                {isForSale ? (
                                                    <><FaCheckCircle /> En Venta (Caja)</>
                                                ) : (
                                                    <><FaBan /> Inactivo en Caja</>
                                                )}
                                            </button>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '1.1rem 1.25rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {product.type !== 'bundle' && product.type !== 'service' && (
                                                    <>
                                                        <button
                                                            onClick={() => { setStockProduct({ ...product, _defaultType: 'IN' }); setShowStockModal(true); }}
                                                            title="Registrar Entrada de Stock"
                                                            style={{
                                                                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
                                                                color: '#4ade80', padding: '0.45rem 0.65rem', borderRadius: '8px',
                                                                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                                                                display: 'flex', alignItems: 'center', gap: '4px'
                                                            }}
                                                        >
                                                            <FaArrowDown size={11} /> Entrada
                                                        </button>
                                                        <button
                                                            onClick={() => { setStockProduct({ ...product, _defaultType: 'OUT' }); setShowStockModal(true); }}
                                                            title="Registrar Salida de Stock"
                                                            style={{
                                                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                                                                color: '#f87171', padding: '0.45rem 0.65rem', borderRadius: '8px',
                                                                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                                                                display: 'flex', alignItems: 'center', gap: '4px'
                                                            }}
                                                        >
                                                            <FaArrowUp size={11} /> Salida
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => handleEdit(product)} className="btn-icon btn-edit" title="Editar producto" style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <FaEdit size={13} />
                                                </button>
                                                {product.type === 'service' && (
                                                    <button
                                                        onClick={() => { setQuickPriceProduct(product); setQuickPriceValue(product.selling_price); }}
                                                        title="Cambiar precio rápidamente"
                                                        style={{
                                                            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
                                                            color: '#fbbf24', padding: '0.45rem 0.65rem', borderRadius: '8px',
                                                            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                                                            display: 'flex', alignItems: 'center', gap: '4px'
                                                        }}
                                                    >
                                                        <FaCoins size={11} /> Precio
                                                    </button>
                                                )}
                                                <button onClick={() => handleDeleteProduct(product)} className="btn-icon btn-delete" title="Eliminar producto" style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                    <FaTrash size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
            )}

            {showStockModal && (
                <StockAdjustmentModal
                    product={stockProduct}
                    onClose={() => setShowStockModal(false)}
                    onSave={() => {
                        setShowStockModal(false);
                        fetchProducts();
                        setAlert({ show: true, type: 'success', title: 'Stock Actualizado', message: 'El movimiento de inventario se ha registrado con éxito.' });
                    }}
                />
            )}

            {showComboManager && (
                <ComboManagerModal
                    products={products}
                    onClose={() => setShowComboManager(false)}
                    onCreateNew={() => { setShowComboManager(false); handleCreate('bundle'); }}
                    onEdit={(p) => { setShowComboManager(false); handleEdit(p); }}
                    onDelete={(p) => { setShowComboManager(false); handleDeleteProduct(p); }}
                />
            )}

            {showHistoryModal && (
                <InventoryHistoryModal onClose={() => setShowHistoryModal(false)} />
            )}

            <CustomAlert
                isOpen={alert.show}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={() => setAlert({ ...alert, show: false })}
            />

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

