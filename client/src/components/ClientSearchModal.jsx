import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const ClientSearchModal = ({ isOpen, onClose, onSelect, initialQuery = '' }) => {
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialQuery) {
            setSearchTerm(initialQuery);
            handleSearch(initialQuery);
        } else if (isOpen) {
            setSearchTerm('');
            setClients([]);
        }
    }, [isOpen, initialQuery]);

    const handleSearch = async (query) => {
        if (!query) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/clients?search=${encodeURIComponent(query)}&limit=10`);
            const data = await res.json();
            setClients(data.clients || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch(searchTerm);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="modal-overlay">
            <div className="modal-content glass-card" style={{ maxWidth: '600px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: 'white', margin: 0 }}>🔍 Buscar Cliente</h2>
                    <button onClick={onClose} className="btn-icon">✖</button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        className="input-dark"
                        placeholder="Nombre, Cédula o Contrato..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{ flex: 1 }}
                        autoFocus
                    />
                    <button onClick={() => handleSearch(searchTerm)} className="btn-primary-glow">
                        Buscar
                    </button>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Buscando...</div>
                    ) : clients.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            {searchTerm ? 'No se encontraron resultados.' : 'Ingrese un término para buscar.'}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1' }}>
                            <tbody>
                                {clients.map(client => (
                                    <tr key={client.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 'bold', color: 'white' }}>{client.full_name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{client.contract_number} • {client.address_street}</div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => onSelect(client)}
                                                className="btn-secondary"
                                                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                                            >
                                                Seleccionar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <style>{`
                .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; align-items: center; justifyContent: center; z-index: 999999; backdrop-filter: blur(5px); }
            `}</style>
        </div>,
        document.body
    );
};

export default ClientSearchModal;
