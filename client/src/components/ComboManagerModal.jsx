
import React, { useState } from 'react';

const ComboManagerModal = ({ products, onEdit, onDelete, onClose, onCreateNew }) => {
    // Filter only bundles
    const combos = products.filter(p => p.type === 'bundle');

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div className="glass-card" style={{ width: '700px', maxHeight: '80vh', overflowY: 'auto', background: '#0f172a', border: '1px solid #7c3aed' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>✨ Administrar Combos</h3>
                        <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Gestiona tus paquetes y ofertas especiales.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>

                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onCreateNew} className="btn-primary-glow" style={{ padding: '0.6rem 1.2rem', fontSize: '0.95rem' }}>
                        + Nuevo Combo
                    </button>
                </div>

                {combos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontStyle: 'italic' }}>
                        No tienes combos creados aún. ¡Crea uno para empezar!
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {combos.map(combo => (
                            <div key={combo.id} style={{
                                background: 'rgba(124, 58, 237, 0.05)',
                                border: '1px solid rgba(124, 58, 237, 0.2)',
                                borderRadius: '8px',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.1rem' }}>{combo.name}</h4>
                                        <span style={{ fontSize: '0.8rem', color: '#a78bfa', background: 'rgba(124, 58, 237, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{combo.sku}</span>
                                    </div>
                                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>{combo.description || 'Sin descripción'}</p>
                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.2rem', marginBottom: '1rem' }}>C$ {Number(combo.selling_price).toFixed(2)}</div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button onClick={() => { onClose(); onEdit(combo); }} className="btn-secondary" style={{ flex: 1, fontSize: '0.9rem' }}>Editar</button>
                                    <button onClick={() => onDelete(combo)} className="btn-icon btn-delete" style={{ padding: '0.5rem' }}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComboManagerModal;
