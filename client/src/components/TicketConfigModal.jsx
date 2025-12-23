import React, { useState, useEffect } from 'react';

const TicketConfigModal = ({ onClose }) => {
    const [config, setConfig] = useState({
        companyName: 'AMERI-CABLE',
        ruc: 'J031000000',
        address: 'Dirección Principal',
        phone: '2222-2222',
        footerMessage: '¡Gracias por su pago!'
    });

    useEffect(() => {
        const saved = localStorage.getItem('ticketConfig');
        if (saved) {
            setConfig(JSON.parse(saved));
        }
    }, []);

    const handleChange = (e) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        localStorage.setItem('ticketConfig', JSON.stringify(config));
        onClose();
        // Optional: Trigger a custom event or alert
        alert('Configuración de ticket guardada.');
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content animate-entry">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>🖨️ Configurar Ticket</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Nombre de la Empresa</label>
                        <input
                            type="text"
                            name="companyName"
                            value={config.companyName}
                            onChange={handleChange}
                            className="input-dark"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>RUC / Identificación</label>
                        <input
                            type="text"
                            name="ruc"
                            value={config.ruc}
                            onChange={handleChange}
                            className="input-dark"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Dirección</label>
                        <input
                            type="text"
                            name="address"
                            value={config.address}
                            onChange={handleChange}
                            className="input-dark"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Teléfono</label>
                        <input
                            type="text"
                            name="phone"
                            value={config.phone}
                            onChange={handleChange}
                            className="input-dark"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem' }}>Mensaje al Pie (Pie de Página)</label>
                        <textarea
                            name="footerMessage"
                            value={config.footerMessage}
                            onChange={handleChange}
                            className="input-dark"
                            rows={3}
                            style={{ resize: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'end', gap: '1rem' }}>
                    <button onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button onClick={handleSave} className="btn-primary-glow">Guardar Configuración</button>
                </div>
            </div>
        </div>
    );
};

export default TicketConfigModal;

