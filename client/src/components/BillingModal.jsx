import React, { useState, useEffect } from 'react';
import CustomAlert from './CustomAlert';
import ReceiptModal from './ReceiptModal';

import { useAuth } from '../context/AuthContext';

const BillingModal = ({ client, onClose, onPaymentSuccess, defaultTargetBox }) => {
    const { user } = useAuth();
    // Data
    const [products, setProducts] = useState([]);
    const [plans, setPlans] = useState([]);
    const [clientStatus, setClientStatus] = useState(null); // Arrears/Months info
    const [cart, setCart] = useState([]);

    // Config
    const [type, setType] = useState('monthly_fee'); // monthly_fee, installation, material_sale
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Collector Logic
    const [collectors, setCollectors] = useState([]);
    const [selectedCollector, setSelectedCollector] = useState('');
    const [targetBox, setTargetBox] = useState(defaultTargetBox || 'OFICINA'); // New: Target Box selection (OFICINA/COBRADOR)

    // Billing Period Logic
    const [monthsToPay, setMonthsToPay] = useState(1); // Default to 1 month
    const [coverageText, setCoverageText] = useState('');

    // Mora Logic (Flexible)
    const [applyMora, setApplyMora] = useState(false);
    const [manualMoraAmount, setManualMoraAmount] = useState(0);

    // Money
    const [enteredAmount, setEnteredAmount] = useState('');
    const [calculatedTotal, setCalculatedTotal] = useState(0);
    const [receivedAmount, setReceivedAmount] = useState('');
    const [reference, setReference] = useState('');

    // Justification
    const [justification, setJustification] = useState('');
    const [description, setDescription] = useState('');

    // New Features
    const [isPromo2x1, setIsPromo2x1] = useState(false);
    const [manualInvoiceNo, setManualInvoiceNo] = useState('');

    const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });

    // Receipt
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastTransaction, setLastTransaction] = useState(null);

    // 1. Initial Load (Products, Plans, Client Details)
    useEffect(() => {
        Promise.all([
            fetch('/api/billing/products').then(r => r.json()),
            fetch('/api/billing/plans').then(r => r.json()),
            fetch(`/api/billing/details/${client.id}`).then(r => r.json()),
            fetch('/api/users').then(r => r.json())
        ]).then(([dProds, dPlans, dClient, dUsers]) => {
            setProducts(dProds);
            setPlans(dPlans);
            setClientStatus(dClient);
            setCollectors(dUsers || []);

            // STATUS RULES
            const status = dClient.client.status;

            // RULE: Suspended -> Force Reconnection
            if (status === 'suspended') {
                setType('reconnection');
                setCalculatedTotal(270);
                setEnteredAmount(270);
                setDescription('Reconexión de Servicio');
                return; // Skip normal defaults
            }

            // RULE: Retired -> Handled in render (blocking UI)

            // Default Logic:
            // If debt > 0, set monthsToPay = debt.
            // If debt <= 0, set monthsToPay = 1 (Ahead).
            const owe = dClient.months_owed > 0 ? dClient.months_owed : 1;
            setMonthsToPay(owe);

            // Default Mora: ALWAYS OFF by default
            setApplyMora(false);
            setManualMoraAmount(dClient.has_mora ? parseFloat(dClient.mora_amount || 0) : 50);
        });
    }, [client]);

    // 2. Auto-Calculate (Modified for Reconnection)
    useEffect(() => {
        let total = 0;
        let desc = '';

        if (type === 'reconnection') {
            total = 270;
            desc = 'Reconexión de Servicio';
        }
        else if (type === 'monthly_fee' && clientStatus) {
            const rate = parseFloat(clientStatus.client.zone_tariff || client.zone_tariff || 0);


            // 2x1 Logic: If active, we charge for (monthsToPay / 2). 
            // Simplified Rule: User pays for 1 month but gets 2.
            // Requirement from User: "se cobrara normal 1 mes pero se le facturaran 2"
            // So if isPromo2x1 is TRUE, we force calculation to be based on monthsToPay - 1? 
            // Or simpler: We calculate price as floor(monthsToPay / 2) + remainder? 
            // Or strictly: if 2x1 is checked, we assume user picked "2 months" but we charge "1 month".

            let billableMonths = monthsToPay;
            if (isPromo2x1 && monthsToPay >= 2) {
                // For every 2 months, pay 1. (e.g. 2->1, 4->2).
                // User specific request: "pay 1 month but 2 are billed".
                // We will simply deduct half the months from calculation if even?
                // Let's stick to the specific "2x1" scenario.
                // If isPromo2x1 is ON, we assume it applies to the pair.
                billableMonths = Math.ceil(monthsToPay / 2);
            }

            total += (billableMonths * rate);

            if (clientStatus.client.last_paid_month) {
                const startParams = new Date(clientStatus.client.last_paid_month);
                startParams.setMonth(startParams.getMonth() + 1);
                const endParams = new Date(startParams);
                endParams.setMonth(endParams.getMonth() + (monthsToPay - 1));

                const startStr = startParams.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                const endStr = endParams.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                const range = monthsToPay === 1 ? startStr : `${startStr} - ${endStr}`;
                setCoverageText(range);
                desc = `Mensualidad: ${range}`;
                if (applyMora) desc += ` + Mora`;
            }
        } else if (type === 'installation' && selectedPlanId) {
            const plan = plans.find(p => p.id === parseInt(selectedPlanId));
            if (plan) { total += parseFloat(plan.base_price); desc = `Instalación: ${plan.name}`; }
        } else {
            total += cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }

        // Add Mora from Input if Checked (Only for Monthly)
        if (applyMora && type === 'monthly_fee') {
            total += parseFloat(manualMoraAmount || 0);
        }

        setCalculatedTotal(total);
        // Only update enteredAmount if we are auto-calculating strictly, but allow manual override? 
        // For reconnection fixed price, force it.
        if (type === 'reconnection') setEnteredAmount(270);
        else setEnteredAmount(total.toFixed(2));

        setDescription(desc);
    }, [type, selectedPlanId, cart, plans, clientStatus, monthsToPay, applyMora, manualMoraAmount, isPromo2x1]);

    // Update Description when 2x1 toggles
    useEffect(() => {
        if (type === 'monthly_fee' && isPromo2x1) {
            setDescription(`Mensualidad: 2x1 Promoción (${monthsToPay} Meses)`);
        }
    }, [isPromo2x1, monthsToPay]);


    // ... [Mora Update Effect remains same] ...


    // Update Mora Amount when Months Change (Convenience)
    useEffect(() => {
        if (type === 'monthly_fee' && clientStatus && clientStatus.has_mora) {
            const overdueMonthsCount = clientStatus.months_owed || 0;
            const overduePaying = Math.min(monthsToPay, overdueMonthsCount);

            // NEW: Calculate 5% of the monthly rate
            const rate = parseFloat(clientStatus.client.zone_tariff || client.zone_tariff || 0);
            const unitMora = rate * 0.05;

            const newMora = overduePaying * unitMora;
            setManualMoraAmount(newMora);
        }
    }, [monthsToPay, clientStatus, type]);

    // Mora Check Logic helper
    const checkMoraChange = () => {
        let requiredMora = 0;
        if (clientStatus?.has_mora && type === 'monthly_fee') {
            const overdueMonthsCount = clientStatus.months_owed || 0;
            const overduePaying = Math.min(monthsToPay, overdueMonthsCount);
            const unitMora = parseFloat(clientStatus.mora_amount || 0);
            requiredMora = overduePaying * unitMora;
        }

        const isMoraIssue = clientStatus?.has_mora && type === 'monthly_fee' && (
            !applyMora ||
            (applyMora && Math.abs(parseFloat(manualMoraAmount || 0) - requiredMora) > 0.5)
        );
        return isMoraIssue;
    }

    const addToCart = (productId) => {
        const prod = products.find(p => p.id === parseInt(productId));
        if (!prod) return;
        setCart([...cart, { ...prod, quantity: 1 }]);
    };

    const handleAddToCart = (id) => {
        if (id) addToCart(id);
    }

    /* Justification Logic */
    const isPriceChanged = Math.abs(parseFloat(enteredAmount || 0) - calculatedTotal) > 0.5;
    const isMoraIssue = checkMoraChange();
    const needsJustification = isPriceChanged || isMoraIssue;

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePay = async () => {
        if (isSubmitting) return;

        const amt = parseFloat(enteredAmount || 0);
        if (amt <= 0) return setAlert({ show: true, type: 'error', title: 'Monto Inválido', message: 'El monto debe ser > 0.' });

        // Validate Payment
        const received = parseFloat(receivedAmount || 0);
        if (received < calculatedTotal) {
            return setAlert({ show: true, type: 'warning', title: 'Monto Insuficiente', message: `El cliente debe pagar al menos C$ ${calculatedTotal.toFixed(2)}` });
        }

        if (needsJustification && !justification.trim()) {
            return setAlert({ show: true, type: 'warning', title: 'Falta Justificación', message: 'Has modificado el precio o la mora. Justifica el cambio.' });
        }

        if (amt < calculatedTotal - 0.5 && !justification.trim()) {
            return setAlert({ show: true, type: 'warning', title: 'Monto Menor', message: 'Cobras menos de lo calculado. Justifícalo.' });
        }

        if (!manualInvoiceNo.trim()) {
            return setAlert({ show: true, type: 'warning', title: 'Faltan Datos', message: 'El número de factura manual es obligatorio.' });
        }

        setIsSubmitting(true);

        const details = { months_paid: 0, mora_paid: 0 };
        if (type === 'monthly_fee' && clientStatus) {
            if (applyMora) details.mora_paid = manualMoraAmount;

            details.months_paid = monthsToPay;
            if (isPromo2x1) details.promo = '2x1_APPLIED';
        }
        if (type === 'reconnection') {
            details.reconnection_paid = true;
        }

        const payload = {
            client_id: client.id, type, amount: enteredAmount, payment_method: paymentMethod,
            description, service_plan_id: selectedPlanId || null,
            justification: (needsJustification || isPromo2x1) ? (justification || (isPromo2x1 ? "Promoción 2x1 Aplicada" : null)) : null,
            reference_id: manualInvoiceNo || reference,
            items: cart.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price, name: i.name })),
            details_json: details,
            collector_id: selectedCollector || user?.id, // Default to current user if none selected
            cash_session_type: targetBox, // NEW: Explicitly target a box
            current_user_id: user?.id // WHO is actually processing the payment (The Logged In User)
        };

        try {
            const res = await fetch('/api/billing/pay', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                // Success - Show Alert instead of Receipt
                setAlert({ show: true, type: 'success', title: 'Cobrado con Éxito', message: 'La transacción ha sido registrada correctamente.' });
                // Reset fields
                setCart([]);
                setReceivedAmount('');
                setManualInvoiceNo('');
            } else {
                setAlert({ show: true, type: 'error', title: 'Error', message: data.msg });
            }
        } catch (e) {
            console.error(e);
            setAlert({ show: true, type: 'error', title: 'Error', message: 'Error de conexión' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!clientStatus) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '850px', width: '95%' }}>
                {/* Header */}
                <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                    <div>
                        <h2 className="text-white" style={{ margin: 0 }}>Facturación / Caja</h2>
                        <small className="text-muted">{client.full_name} — {client.contract_number}</small>
                    </div>
                    <button onClick={onClose} className="btn-icon" style={{ fontSize: '1.5rem', color: '#94a3b8' }}>×</button>
                </div>

                {/* Body Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

                    {/* LEFT COLUMN: Config */}
                    <div className="flex-col">
                        <h3 style={{ color: '#60a5fa', fontSize: '1.1rem' }}>1. Detalles de Pago</h3>

                        {/* Type Selector */}
                        {/* Retired Blocking */}
                        {client.status === 'disconnected' && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛔</div>
                                <h3 className="text-white" style={{ marginBottom: '0.5rem' }}>CLIENTE RETIRADO</h3>
                                <p className="text-muted">Se requiere instalación nueva.</p>
                                <button onClick={onClose} className="btn-secondary" style={{ marginTop: '1rem' }}>Cerrar</button>
                            </div>
                        )}

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Tipo de Transacción</label>

                            {/* Force Reconnection if Suspended */}
                            {client.status === 'suspended' ? (
                                <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5' }}>
                                    ⚠️ <strong>Cliente Cortado</strong><br />
                                    <small>Debe pagar reconexión primero.</small>
                                    <select className="input-dark" value="reconnection" disabled style={{ marginTop: '0.5rem', opacity: 1, color: 'white' }}>
                                        <option value="reconnection">🔄 Reconexión (C$ 270)</option>
                                    </select>
                                </div>
                            ) : (
                                <select className="input-dark" value={type} onChange={e => setType(e.target.value)}>
                                    <option value="monthly_fee">📅 Mensualidad Cable</option>
                                    <option value="installation">🛠️ Instalación</option>
                                    <option value="material_sale">📦 Venta de Materiales</option>
                                </select>
                            )}
                        </div>

                        {/* Manual Invoice Number */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginTop: '1rem' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>No. Factura Manual (Requerido)</label>
                            <input
                                type="text"
                                className="input-dark"
                                placeholder="Ej: 001523"
                                value={manualInvoiceNo}
                                onChange={e => setManualInvoiceNo(e.target.value)}
                            />
                        </div>

                        {/* Dynamic Fields based on Type */}
                        {type === 'monthly_fee' && (
                            <div className="flex-col animate-slide-up" style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <div className="flex-between">
                                    <label className="text-white">Meses a Pagar:</label>
                                    <div className="flex-center" style={{ gap: '0.5rem' }}>
                                        <button onClick={() => setMonthsToPay(Math.max(1, monthsToPay - 1))} className="btn-secondary" style={{ padding: '0.2rem 0.6rem' }}>-</button>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', minWidth: '30px', textAlign: 'center' }}>{monthsToPay}</span>
                                        <button onClick={() => setMonthsToPay(monthsToPay + 1)} className="btn-secondary" style={{ padding: '0.2rem 0.6rem' }}>+</button>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'right' }}>
                                    Cobertura: <span style={{ color: '#fff' }}>{coverageText}</span>
                                </div>

                                {/* 2x1 Promo Checkbox */}
                                <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <label className="flex-center" style={{ gap: '0.5rem', cursor: 'pointer', color: '#fcd34d' }}>
                                        <input
                                            type="checkbox"
                                            checked={isPromo2x1}
                                            onChange={e => {
                                                setIsPromo2x1(e.target.checked);
                                                if (e.target.checked && monthsToPay < 2) setMonthsToPay(2); // Auto set to 2
                                            }}
                                            style={{ transform: 'scale(1.2)' }}
                                        />
                                        <strong>🔥 Promoción 2x1</strong>
                                    </label>
                                </div>

                                {/* Mora Control */}
                                <div style={{ marginTop: '1rem', borderTop: '1px dashed #334155', paddingTop: '0.5rem' }}>
                                    <div className="flex-between">
                                        <label className="flex-center" style={{ gap: '0.5rem', cursor: 'pointer', color: '#fca5a5' }}>
                                            <input type="checkbox" checked={applyMora} onChange={e => setApplyMora(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                                            Aplicar Mora
                                        </label>
                                        {applyMora && (
                                            <input
                                                type="number"
                                                className="input-dark"
                                                style={{ width: '100px', textAlign: 'right', borderColor: '#f87171' }}
                                                value={manualMoraAmount}
                                                onChange={e => setManualMoraAmount(e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PRODUCT SELECTOR (For Installation/Materials) */}
                        {type !== 'monthly_fee' && (
                            <div className="flex-col animate-slide-up">
                                <label className="text-muted">Seleccionar Producto / Servicio</label>
                                <select className="input-dark" onChange={e => handleAddToCart(e.target.value)}>
                                    <option value="">-- Agregar al Carrito --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} - C$ {parseFloat(p.price).toFixed(2)} (Stock: {p.current_stock})</option>
                                    ))}
                                </select>

                                {/* Cart Mini-View */}
                                <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '0.5rem' }}>
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="flex-between" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{item.quantity}x {item.name}</span>
                                            <span style={{ fontSize: '0.9rem', color: 'white' }}>{item.total.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Target Box Selection (For Admins/Cajeros) */}
                        <div style={{ marginTop: '1rem', background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <label className="text-white" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>🛒 Caja de Destino</label>
                            <div className="flex-center" style={{ gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setTargetBox('OFICINA')}
                                    className={`btn-tab-premium ${targetBox === 'OFICINA' ? 'active' : ''}`}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        fontSize: '0.85rem',
                                        background: targetBox === 'OFICINA' ? '#3b82f6' : 'rgba(30, 41, 59, 0.6)',
                                        border: 'none',
                                        borderRadius: '8px'
                                    }}
                                >🏢 Oficina</button>
                                <button
                                    type="button"
                                    onClick={() => setTargetBox('COBRADOR')}
                                    className={`btn-tab-premium ${targetBox === 'COBRADOR' ? 'active' : ''}`}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        fontSize: '0.85rem',
                                        background: targetBox === 'COBRADOR' ? '#8b5cf6' : 'rgba(30, 41, 59, 0.6)',
                                        border: 'none',
                                        borderRadius: '8px'
                                    }}
                                >🛵 Cobrador</button>
                            </div>
                        </div>

                        {/* Collector Selection */}
                        <div style={{ marginTop: '1rem' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Cobrador / Vendedor (Atribución)</label>
                            <select className="input-dark" value={selectedCollector} onChange={e => setSelectedCollector(e.target.value)}>
                                <option value="">-- Cajero Actual (Por Defecto) --</option>
                                {collectors.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Summary & Pay */}
                    <div className="flex-col" style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid #1e293b' }}>
                        <h3 style={{ color: '#34d399', fontSize: '1.1rem', marginBottom: '1rem' }}>2. Resumen</h3>

                        <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                            <span className="text-muted">Subtotal Servicios:</span>
                            <span className="text-white">C$ {(calculatedTotal - (applyMora ? parseFloat(manualMoraAmount || 0) : 0)).toFixed(2)}</span>
                        </div>

                        {applyMora && (
                            <div className="flex-between" style={{ marginBottom: '0.5rem', color: '#f87171' }}>
                                <span>+ Mora / Recargo:</span>
                                <span>C$ {parseFloat(manualMoraAmount || 0).toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex-between" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155', fontSize: '1.25rem', fontWeight: 'bold' }}>
                            <span className="text-white">TOTAL A PAGAR:</span>
                            <span style={{ color: '#34d399' }}>C$ {calculatedTotal.toFixed(2)}</span>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Monto Recibido</label>
                            <input
                                type="number"
                                className="input-dark"
                                style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', textAlign: 'right', padding: '1rem', border: '1px solid #3b82f6', background: 'rgba(59, 130, 246, 0.1)' }}
                                placeholder="0.00"
                                value={receivedAmount}
                                onChange={e => setReceivedAmount(e.target.value)}
                            />
                        </div>

                        <div className="flex-between" style={{ marginTop: '0.5rem' }}>
                            <span className="text-muted">Cambio:</span>
                            <span style={{ fontSize: '1.2rem', color: (receivedAmount - calculatedTotal) >= 0 ? '#fbbf24' : '#64748b' }}>
                                C$ {Math.max(0, receivedAmount - calculatedTotal).toFixed(2)}
                            </span>
                        </div>

                        {/* Justification Field (Conditional) */}
                        {needsJustification && (
                            <div className="animate-slide-up" style={{ marginTop: '1rem', background: 'rgba(251, 191, 36, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '1.2rem' }}>🤔</span>
                                    <label className="text-muted" style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                                        {isMoraIssue && !applyMora ? 'Perdón de Mora Requerido' : 'Justificación de Precio'}
                                    </label>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                                    {isMoraIssue && !applyMora
                                        ? 'Estás cobrando una factura vencida sin aplicar mora. Por favor indica la razón (autorización).'
                                        : 'El precio total ha sido modificado manualmente. Explica la razón.'}
                                </p>
                                <textarea
                                    className="input-dark"
                                    rows="2"
                                    placeholder="Ej: Autorizado por Gerencia..."
                                    value={justification}
                                    onChange={e => setJustification(e.target.value)}
                                    style={{ borderColor: '#eab308' }}
                                />
                            </div>
                        )}

                        <button
                            onClick={handlePay}
                            // disabled removed to allow validation clicks
                            className="btn-primary-glow"
                            style={{ marginTop: 'auto', padding: '1.2rem', fontSize: '1.1rem' }}
                        >
                            💰 REALIZAR PAGO
                        </button>
                    </div>
                </div>
            </div>

            {/* Receipt Modal Removed as per user request */}
            {/* Success Alert is handled via 'alert' state */}
            <CustomAlert isOpen={alert.show} title={alert.title} message={alert.message} type={alert.type} onClose={() => {
                setAlert({ ...alert, show: false });
                if (alert.type === 'success') {
                    onClose();
                    onPaymentSuccess();
                }
            }} />
        </div>
    );
};

export default BillingModal;

