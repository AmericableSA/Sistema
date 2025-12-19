
import React, { useState, useEffect } from 'react';

import ReactDOM from 'react-dom';

const ReceiptSettingsModal = ({ onClose }) => {
    const [settings, setSettings] = useState({
        company_name: '',
        company_ruc: '',
        company_phone: '',
        receipt_header: '',
        receipt_footer: ''
    });

    const [logoPreview, setLogoPreview] = useState('/logo.png');

    useEffect(() => {
        fetch('http://localhost:3001/api/settings')
            .then(r => r.json())
            .then(data => {
                setSettings({
                    company_name: data.company_name || 'Americable',
                    company_ruc: data.company_ruc || '',
                    company_phone: data.company_phone || '',
                    receipt_header: data.receipt_header || '',
                    receipt_footer: data.receipt_footer || ''
                });
            })
            .catch(console.error);
    }, []);

    const handleSave = async () => {
        try {
            await fetch('http://localhost:3001/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        }
    };

    return ReactDOM.createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card animate-entry" style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                <h2 style={{ margin: 0 }}>⚙️ Configurar Recibos</h2>
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <img src={logoPreview} alt="Logo" style={{ height: '60px' }} />
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>Logo del Sistema (Fijo)</div>
                </div>

                <div>
                    <label className="label-dark">Nombre de la Empresa</label>
                    <input type="text" className="input-dark" value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} />
                </div>
                <div>
                    <label className="label-dark">RUC</label>
                    <input type="text" className="input-dark" value={settings.company_ruc} onChange={e => setSettings({ ...settings, company_ruc: e.target.value })} />
                </div>
                <div>
                    <label className="label-dark">Teléfono</label>
                    <input type="text" className="input-dark" value={settings.company_phone} onChange={e => setSettings({ ...settings, company_phone: e.target.value })} />
                </div>
                <div>
                    <label className="label-dark">Encabezado (Frase Inicial)</label>
                    <input type="text" className="input-dark" value={settings.receipt_header} onChange={e => setSettings({ ...settings, receipt_header: e.target.value })} />
                </div>
                <div>
                    <label className="label-dark">Pie de Página (Frase Final)</label>
                    <input type="text" className="input-dark" value={settings.receipt_footer} onChange={e => setSettings({ ...settings, receipt_footer: e.target.value })} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <button onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button onClick={handleSave} className="btn-primary-glow">Guardar Cambios</button>
                </div>
            </div>
            <style>{`.label-dark { display: block; margin-bottom: 0.3rem; color: #94a3b8; font-size: 0.9rem; } .input-dark { width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid #334155; color: white; border-radius: 6px; }`}</style>
        </div>,
        document.body
    );
};

export default ReceiptSettingsModal;
