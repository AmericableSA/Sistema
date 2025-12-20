import React, { useEffect, useRef, useState } from 'react';
import { API_URL } from '../service/api';

const ReceiptModal = ({ transaction, onClose, autoPrint }) => {
    const printRef = useRef();
    const [settings, setSettings] = useState(null);
    const [format, setFormat] = useState('80mm'); // '80mm' or 'a4'

    useEffect(() => {
        fetch(`${API_URL}/settings`)
            .then(r => r.json())
            .then(setSettings)
            .catch(console.error);
    }, []);

    // Auto-Print Effect
    useEffect(() => {
        if (autoPrint && transaction && settings) {
            // Small delay to ensure render
            setTimeout(() => {
                handlePrint();
            }, 500);
        }
    }, [transaction, settings, autoPrint]);

    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const printWindow = window.open('', '_blank', 'height=600,width=800');

        if (!printWindow) {
            alert('Por favor permite ventanas emergentes para imprimir.');
            return;
        }

        let css = `
            @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;700&display=swap');
            body { font-family: 'League Spartan', sans-serif; margin: 0; padding: 0; color: black; -webkit-print-color-adjust: exact; }
            .receipt-container { padding: 10px; }
            .header { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px; }
            .logo { max-width: 80px; margin-bottom: 10px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items-table th { text-align: left; border-bottom: 1px solid #000; }
            .items-table td { padding: 4px 0; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 15px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; font-style: italic; }
            
            /* A4 Specifics */
            .a4-container { padding: 40px; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; }
            .a4-header { display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .a4-logo { max-height: 100px; margin-bottom: 15px; }
            .a4-company-info { margin-bottom: 20px; }
        `;

        if (format === '80mm') {
            css += `
                @page { margin: 0; size: 80mm auto; }
                body { width: 80mm; }
                .receipt-container { width: 100%; box-sizing: border-box; }
            `;
        } else {
            css += `
                @page { size: A4; margin: 2cm; }
                body { font-size: 14px; }
            `;
        }

        printWindow.document.write('<html><head><title>Imprimir Recibo</title>');
        printWindow.document.write(`<style>${css}</style>`);
        printWindow.document.write('</head><body>');
        printWindow.document.write(content);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();

        // Robust wait for styles
        setTimeout(() => {
            printWindow.print();
            // Optional: Close after print (user preference usually to verify before closing, but auto-closing is cleaner)
            // printWindow.close(); 
        }, 1000); // Increased timeout to 1s to ensure fonts load
    };

    if (!transaction) return null;
    if (!settings) return <div className="modal-overlay">Loading...</div>;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <h2 className="text-white">Vista Previa</h2>
                    <div style={{ background: '#1e293b', padding: '4px', borderRadius: '8px', display: 'flex' }}>
                        <button onClick={() => setFormat('80mm')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: format === '80mm' ? '#3b82f6' : 'transparent', color: 'white', cursor: 'pointer' }}>🧾 80mm</button>
                        <button onClick={() => setFormat('a4')} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: format === 'a4' ? '#3b82f6' : 'transparent', color: 'white', cursor: 'pointer' }}>📄 Carta (A4)</button>
                    </div>
                </div>

                <div style={{ flex: 1, background: '#e2e8f0', overflowY: 'auto', padding: '2rem', display: 'flex', justifyContent: 'center', borderRadius: '8px' }}>
                    {/* PRINT CONTENT REF */}
                    <div ref={printRef} style={{ background: 'white', color: 'black', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontFamily: "'League Spartan', sans-serif" }}>

                        {format === '80mm' ? (
                            // THERMAL LAYOUT (80mm)
                            <div className="receipt-container" style={{ width: '80mm', minHeight: '100px', padding: '15px' }}>
                                <div className="header">
                                    {/* LOGO CENTERED & LARGER */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                                        <img src="/logo.png" className="logo" style={{ maxWidth: '120px', height: 'auto', display: 'block' }} />
                                    </div>
                                    <h3 style={{ margin: '5px 0', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '1px' }}>{settings.company_name}</h3>
                                    <div style={{ fontSize: '12px', color: '#444' }}>{settings.company_address}</div>
                                    <div style={{ fontSize: '12px', color: '#444' }}>Tel: {settings.company_phone}</div>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>RUC: {settings.company_ruc}</div>
                                </div>

                                {settings.receipt_header && <div style={{ textAlign: 'center', fontSize: '12px', margin: '10px 0', fontStyle: 'italic', borderBottom: '1px dashed #000', paddingBottom: '10px' }}>{settings.receipt_header}</div>}

                                <div className="info-row"><span>Fecha:</span> <span>{new Date(transaction.created_at || new Date()).toLocaleString()}</span></div>
                                <div className="info-row"><span>Recibo #:</span> <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{String(transaction.transactionId || transaction.id).padStart(6, '0')}</span></div>
                                <div className="info-row"><span>Cliente:</span> <span style={{ textAlign: 'right', maxWidth: '140px' }}>{transaction.client_name}</span></div>
                                <div className="info-row"><span>Atendió:</span> <span style={{ textTransform: 'uppercase' }}>{transaction.collector_name || transaction.collector_username || 'Cajero'}</span></div>
                                <div className="divider"></div>

                                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Concepto:</div>
                                <div style={{ fontSize: '14px', marginBottom: '10px', lineHeight: '1.4' }}>{transaction.description}</div>

                                <div className="divider"></div>
                                {/* NEW: Explicitly show Monthly Fee / Mora if available */}
                                {Number(transaction.months_paid) > 0 && (
                                    <div className="info-row" style={{ fontWeight: 'bold' }}>
                                        <span>Mensualidad ({transaction.months_paid} Meses)</span>
                                        <span>C$ {(parseFloat(transaction.amount) - (parseFloat(transaction.mora_paid || 0)) - (Array.isArray(transaction.items) ? transaction.items.reduce((s, i) => s + (i.price * i.quantity), 0) : 0)).toFixed(2)}</span>
                                    </div>
                                )}
                                {Number(transaction.mora_paid) > 0 && (
                                    <div className="info-row">
                                        <span>+ Mora / Recargo</span>
                                        <span>C$ {parseFloat(transaction.mora_paid).toFixed(2)}</span>
                                    </div>
                                )}

                                {Array.isArray(transaction.items) && transaction.items.length > 0 && (
                                    <table className="items-table">
                                        <thead><tr><th>Cant</th><th>Desc</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                                        <tbody>
                                            {transaction.items.map((item, i) => (
                                                <tr key={i}>
                                                    <td>{item.quantity}</td>
                                                    <td>{item.name}</td>
                                                    <td style={{ textAlign: 'right' }}>{parseFloat(item.price * item.quantity).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                <div className="divider"></div>
                                <div className="total-row" style={{ fontSize: '20px', alignItems: 'center' }}>
                                    <span>TOTAL</span>
                                    <span>C$ {parseFloat(transaction.amount).toFixed(2)}</span>
                                </div>
                                <div className="divider"></div>

                                {settings.receipt_footer && <div className="footer" style={{ marginTop: '20px' }}>{settings.receipt_footer}</div>}
                                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px' }}>*** Gracias por su preferencia ***</div>
                            </div>
                        ) : (
                            // A4 LAYOUT
                            <div className="a4-container" style={{ width: '210mm', minHeight: '297mm', padding: '40px', boxSizing: 'border-box', background: 'white' }}>
                                <div className="a4-header" style={{ borderBottom: '3px solid #0f172a', paddingBottom: '30px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                                    {/* Left: Logo & Company Info */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '50%' }}>
                                        <img src="/logo.png" className="a4-logo" style={{ maxHeight: '120px', marginBottom: '15px' }} />
                                        <h1 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '26px', color: '#0f172a' }}>{settings.company_name}</h1>
                                        <div style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>{settings.company_address}</div>
                                        <div style={{ fontSize: '14px', color: '#64748b' }}>Tel: {settings.company_phone} | RUC: {settings.company_ruc}</div>
                                    </div>

                                    {/* Right: Receipt Meta */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ background: '#f1f5f9', padding: '15px 30px', borderRadius: '8px' }}>
                                            <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a', textTransform: 'uppercase' }}>Recibo de Caja</h2>
                                            <div style={{ fontSize: '28px', color: '#ef4444', fontWeight: 'bold', margin: '5px 0' }}>#{String(transaction.transactionId || transaction.id).padStart(6, '0')}</div>
                                            <div style={{ fontSize: '14px', color: '#64748b' }}>{new Date(transaction.created_at || new Date()).toLocaleString()}</div>
                                        </div>
                                        <div style={{ fontSize: '14px', marginTop: '10px', color: '#475569', fontWeight: 'bold' }}>Le atendió: {transaction.collector_name || transaction.collector_username || 'Cajero'}</div>
                                    </div>
                                </div>

                                {/* Client & Payment Details Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                                    <div style={{ border: '1px solid #e2e8f0', padding: '25px', borderRadius: '12px', background: '#f8fafc' }}>
                                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #cbd5e1', paddingBottom: '10px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            👤 Datos del Cliente
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px', fontSize: '15px' }}>
                                            <strong>Nombre:</strong> <span style={{ textTransform: 'uppercase' }}>{transaction.client_name}</span>
                                            <strong>Contrato:</strong> <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{transaction.contract_number || 'N/A'}</span>
                                            <strong>Dirección:</strong> <span>{client?.address || 'N/A'}</span> {/* Optional if client arg passed, usually in transaction */}
                                        </div>
                                    </div>
                                    <div style={{ border: '1px solid #e2e8f0', padding: '25px', borderRadius: '12px', background: '#f8fafc' }}>
                                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #cbd5e1', paddingBottom: '10px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            💳 Detalles del Pago
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '15px' }}>
                                            <strong>Método:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{transaction.payment_method || 'Efectivo'}</span>
                                            <strong>Referencia:</strong> <span style={{ fontFamily: 'monospace' }}>{transaction.reference_id || 'N/A'}</span>
                                            <strong>Estado:</strong> <span style={{ color: '#16a34a', fontWeight: 'bold' }}>PAGADO</span>
                                        </div>
                                    </div>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', marginBottom: '30px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                    <thead>
                                        <tr style={{ background: '#0f172a', textTransform: 'uppercase', color: 'white' }}>
                                            <th style={{ padding: '15px', textAlign: 'left' }}>Descripción / Concepto</th>
                                            <th style={{ padding: '15px', textAlign: 'right' }}>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* NEW: Explicitly show Monthly Fee / Mora in A4 */}
                                        {Number(transaction.months_paid) > 0 && (
                                            <tr>
                                                <td style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', fontSize: '16px' }}>
                                                    <strong>Pago de Mensualidad</strong>
                                                    <div style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>
                                                        • Cubriendo: {transaction.months_paid} Mes(es)
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '18px', fontWeight: '600' }}>
                                                    C$ {(parseFloat(transaction.amount) - (parseFloat(transaction.mora_paid || 0)) - (Array.isArray(transaction.items) ? transaction.items.reduce((s, i) => s + (i.price * i.quantity), 0) : 0)).toFixed(2)}
                                                </td>
                                            </tr>
                                        )}

                                        {Number(transaction.mora_paid) > 0 && (
                                            <tr>
                                                <td style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', fontSize: '16px' }}>
                                                    <strong>Recargo por Mora</strong>
                                                </td>
                                                <td style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '18px', fontWeight: '600' }}>
                                                    C$ {parseFloat(transaction.mora_paid).toFixed(2)}
                                                </td>
                                            </tr>
                                        )}

                                        {Array.isArray(transaction.items) && transaction.items.map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', fontSize: '16px' }}>
                                                    <strong>{item.name}</strong>
                                                    <div style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>
                                                        • {item.quantity} unidades
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '18px', fontWeight: '600' }}>
                                                    C$ {parseFloat(item.price * item.quantity).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}

                                        <tr style={{ background: '#f8fafc' }}>
                                            <td style={{ padding: '20px', fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
                                                Nota: {transaction.description}
                                            </td>
                                            <td style={{}}></td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Total Section */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                                    <div style={{ width: '350px', background: '#0f172a', padding: '25px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '28px', fontWeight: 'bold', color: 'white' }}>
                                            <span>TOTAL:</span>
                                            <span style={{ color: '#34d399' }}>C$ {parseFloat(transaction.amount).toFixed(2)}</span>
                                        </div>
                                        <div style={{ textAlign: 'right', color: '#94a3b8', fontSize: '14px', marginTop: '5px' }}>
                                            MONEDA CÓRDOBAS (NIO)
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                                    <div style={{ borderTop: '2px solid #cbd5e1', width: '250px', paddingTop: '10px', color: '#475569' }}>
                                        Recibí Conforme (Caja)
                                    </div>
                                    <div style={{ borderTop: '2px solid #cbd5e1', width: '250px', paddingTop: '10px', color: '#475569' }}>
                                        Entregué Conforme (Cliente)
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', textAlign: 'center', color: '#64748b', fontSize: '13px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                    {settings.receipt_footer || 'Gracias por su pago. Por favor conserve este documento para cualquier reclamo.'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ padding: '1.5rem', background: '#0b1121', display: 'flex', justifyContent: 'center', gap: '1rem', borderTop: '1px solid #1e293b' }}>
                    <button onClick={onClose} className="btn-secondary">Cerrar</button>
                    <button onClick={handlePrint} className="btn-primary-glow" style={{ padding: '0.8rem 3rem', fontSize: '1.2rem' }}>🖨️ IMPRIMIR</button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
