import React, { useState } from 'react';
import { API_URL } from '../service/api';

const BulkUploadModal = ({ onClose, onUpload }) => {
    const [file, setFile] = useState(null);
    const [clearDb, setClearDb] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setStatus('Leyendo archivo...');

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            try {
                setStatus('Procesando datos en el servidor...');
                const res = await fetch(`${API_URL}/upload/clients`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ csvData: text, clearDb })
                });
                const data = await res.json();

                if (res.ok) {
                    setStatus(`✅ Completado: ${data.added} agregados, ${data.updated} actualizados.`);
                    setTimeout(() => {
                        onUpload();
                    }, 2000);
                } else {
                    setStatus(`❌ Error: ${data.msg}`);
                }
            } catch (err) {
                setStatus(`❌ Error de Conexión: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="glass-card animate-entry" style={{ width: '90%', maxWidth: '500px', padding: '2rem' }}>
                <h2 style={{ color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📥 Carga Masiva de Clientes
                </h2>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem', border: '2px dashed #475569', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
                        <input
                            type="file"
                            accept=".csv, .txt"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                            <div style={{ color: '#94a3b8' }}>
                                {file ? <span style={{ color: '#38bdf8' }}>{file.name}</span> : 'Click para seleccionar CSV'}
                            </div>
                        </label>
                    </div>

                    <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px' }}>
                        <input
                            type="checkbox"
                            checked={clearDb}
                            onChange={e => setClearDb(e.target.checked)}
                            style={{ width: '20px', height: '20px' }}
                        />
                        <div>
                            <div style={{ color: '#f87171', fontWeight: 'bold' }}>Borrar base de datos actual</div>
                            <div style={{ color: '#fca5a5', fontSize: '0.85rem' }}>Elimina todos los clientes antes de importar.</div>
                        </div>
                    </div>

                    {status && (
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', textAlign: 'center' }}>
                            {status}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                        <button type="submit" disabled={!file || loading} className="btn-primary-glow" style={{ flex: 1, opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Procesando...' : 'Iniciar Carga'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkUploadModal;
