import React, { useState, useEffect } from 'react';

const ConfirmModal = ({ isOpen, title, message, type = 'confirm', onConfirm, onCancel, inputPlaceholder = '' }) => {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (isOpen) setInputValue('');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="animate-entry" style={{
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '90%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.25rem' }}>{title}</h3>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.5' }}>{message}</p>

                {type === 'prompt' && (
                    <input
                        type="number"
                        className="input-dark"
                        placeholder={inputPlaceholder}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        autoFocus
                        style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}
                    />
                )}

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'transparent', border: '1px solid #475569',
                            color: '#cbd5e1', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(inputValue)}
                        className="btn-dark-glow"
                        style={{ background: '#ef4444', borderColor: '#f87171' }}
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
