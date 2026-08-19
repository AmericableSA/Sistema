import React, { useState, useEffect } from 'react';
import {
    FaMoneyBillWave, FaCalendarCheck, FaReceipt, FaUser, FaUserCheck,
    FaCreditCard, FaExchangeAlt, FaShieldAlt, FaTimes, FaCheckCircle,
    FaBoxOpen, FaTools, FaPercentage, FaCheck
} from 'react-icons/fa';
import CustomAlert from './CustomAlert';
import eventBus from '../utils/eventBus';
import { useAuth } from '../context/AuthContext';

const BillingModal = ({ client, onClose, onPaymentSuccess, defaultTargetBox }) => {
    const { user, token } = useAuth();
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
    const [targetBox, setTargetBox] = useState('GLOBAL'); // Unified global box

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
    const [installationPrice, setInstallationPrice] = useState(500);

    // Product Search Modal
    const [showProductModal, setShowProductModal] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    const [alert, setAlert] = useState({ show: false, title: '', message: '', type: 'info' });

    // Anuncio Personalizado Post-Cobro
    const [successData, setSuccessData] = useState(null);

    const [boxStats, setBoxStats] = useState(null);

    const fetchBoxStats = async () => {
        try {
            const res = await fetch(`/api/billing/stats?type=${targetBox}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const data = await res.json();
                setBoxStats(data || null);
            } else {
                setBoxStats(null);
            }
        } catch (e) {
            console.error("Error fetching box stats:", e);
            setBoxStats(null);
        }
    };

    useEffect(() => {
        fetchBoxStats();
    }, [targetBox, token]);

    // 1. Initial Load (Products, Plans, Client Details)
    useEffect(() => {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        Promise.all([
            fetch('/api/billing/products', { headers }).then(r => r.ok ? r.json() : []),
            fetch('/api/billing/plans', { headers }).then(r => r.ok ? r.json() : []),
            fetch(`/api/billing/details/${client.id}`, { headers }).then(r => r.ok ? r.json() : {}),
            fetch('/api/users', { headers }).then(r => r.ok ? r.json() : [])
        ]).then(([dProds, dPlans, dClient, dUsers]) => {
            setProducts(Array.isArray(dProds) ? dProds : []);
            setPlans(Array.isArray(dPlans) ? dPlans : []);
            setClientStatus(dClient);
            setCollectors(Array.isArray(dUsers) ? dUsers : []);

            // STATUS RULES
            const status = dClient?.client?.status;

            // RULE: Suspended -> Force Reconnection
            if (status === 'suspended') {
                setType('reconnection');
                setCalculatedTotal(270);
                setEnteredAmount('270.00');
                setDescription('Reconexión de Servicio');
                return;
            }

            // Default Logic
            const owe = dClient?.months_owed > 0 ? dClient.months_owed : 1;
            setMonthsToPay(owe);

            // Default Mora: ALWAYS OFF by default
            setApplyMora(false);
            setManualMoraAmount(dClient?.has_mora ? parseFloat(dClient.mora_amount || 0) : 50);
        }).catch(err => console.error("BillingModal Init Error:", err));
    }, [client, token]);

    // 2. Auto-Calculate
    useEffect(() => {
        let total = 0;
        let desc = '';

        if (type === 'reconnection') {
            total = 270;
            desc = 'Reconexión de Servicio';
        }
        else if (type === 'monthly_fee' && clientStatus) {
            const rate = parseFloat(clientStatus.client?.zone_tariff || client.zone_tariff || 0);

            let billableMonths = monthsToPay;
            if (isPromo2x1 && monthsToPay >= 2) {
                billableMonths = Math.ceil(monthsToPay / 2);
            }

            total += (billableMonths * rate);

            if (clientStatus.client?.last_paid_month) {
                const dStr = clientStatus.client.last_paid_month.split('T')[0];
                const startParams = new Date(`${dStr}T12:00:00`);
                startParams.setMonth(startParams.getMonth() + 1);
                
                const endParams = new Date(startParams);
                endParams.setMonth(endParams.getMonth() + (monthsToPay - 1));

                const startStr = startParams.toLocaleString('es-NI', { timeZone: 'America/Managua', month: 'long', year: 'numeric' });
                const endStr = endParams.toLocaleString('es-NI', { timeZone: 'America/Managua', month: 'long', year: 'numeric' });
                const range = monthsToPay === 1 ? startStr : `${startStr} - ${endStr}`;
                setCoverageText(range);
                desc = `Mensualidad: ${range}`;
                if (applyMora) desc += ` + Mora`;
            }
        } else if (type === 'installation') {
            total = parseFloat(installationPrice) || 0;
            desc = `Instalación de Servicio - C$ ${total.toFixed(2)}`;
        } else {
            total += cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            desc = `Venta de Materiales (${cart.length} ítems)`;
        }

        // Add Mora from Input if Checked
        if (applyMora && type === 'monthly_fee') {
            total += parseFloat(manualMoraAmount || 0);
        }

        setCalculatedTotal(total);
        if (type === 'reconnection') setEnteredAmount('270.00');
        else setEnteredAmount(total.toFixed(2));

        setDescription(desc);
    }, [type, selectedPlanId, cart, plans, clientStatus, monthsToPay, applyMora, manualMoraAmount, isPromo2x1, installationPrice, client.zone_tariff]);

    useEffect(() => {
        if (type === 'monthly_fee' && isPromo2x1) {
            setDescription(`Mensualidad: 2x1 Promoción (${monthsToPay} Meses)`);
        }
    }, [isPromo2x1, monthsToPay, type]);

    // Update Mora Amount when Months Change
    useEffect(() => {
        if (type === 'monthly_fee' && clientStatus && clientStatus.has_mora) {
            const overdueMonthsCount = clientStatus.months_owed || 0;
            const overduePaying = Math.min(monthsToPay, overdueMonthsCount);
            const rate = parseFloat(clientStatus.client?.zone_tariff || client.zone_tariff || 0);
            const unitMora = rate * 0.05;
            const newMora = overduePaying * unitMora;
            setManualMoraAmount(newMora);
        }
    }, [monthsToPay, clientStatus, type, client.zone_tariff]);

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
    };

    const addToCart = (productId) => {
        const prod = products.find(p => p.id === parseInt(productId));
        if (!prod) return;
        setCart([...cart, { ...prod, quantity: 1 }]);
    };

    const handleAddToCart = (id) => {
        if (id) addToCart(id);
    };

    const isPriceChanged = Math.abs(parseFloat(enteredAmount || 0) - calculatedTotal) > 0.5;
    const isInstallationPromo = type === 'installation' && Math.abs(installationPrice - 500) > 0.5;
    const isMoraIssue = checkMoraChange();
    const needsJustification = isPriceChanged || isMoraIssue || isInstallationPromo;

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePay = async () => {
        if (isSubmitting) return;

        if (!boxStats) {
            return setAlert({ show: true, type: 'error', title: 'Caja Cerrada', message: `La caja de destino (${targetBox}) está cerrada. Debe abrirla antes de poder registrar cobros.` });
        }

        const amt = parseFloat(enteredAmount || 0);
        if (amt < 0) return setAlert({ show: true, type: 'error', title: 'Monto Inválido', message: 'El monto debe ser mayor o igual a 0.' });

        const received = parseFloat(receivedAmount || 0);
        if (received < amt && paymentMethod === 'cash') {
            return setAlert({ show: true, type: 'warning', title: 'Monto Insuficiente', message: `El cliente debe entregar al menos C$ ${amt.toFixed(2)}` });
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

        const selectedCollectorObj = collectors.find(c => String(c.id) === String(selectedCollector));
        const collectorDisplayName = selectedCollectorObj?.full_name || user?.full_name || user?.username || 'Cajero';

        const payload = {
            client_id: client.id, type, amount: enteredAmount, payment_method: paymentMethod,
            description, service_plan_id: selectedPlanId || null,
            justification: (needsJustification || isPromo2x1) ? (justification || (isPromo2x1 ? "Promoción 2x1 Aplicada" : null)) : null,
            reference_id: manualInvoiceNo || reference,
            items: cart.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price, name: i.name })),
            details_json: details,
            collector_id: selectedCollector || user?.id,
            cash_session_type: targetBox,
            current_user_id: user?.id
        };

        try {
            const res = await fetch('/api/billing/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                // Preparar los datos del anuncio personalizado
                let paymentConcept = description;
                if (type === 'monthly_fee') {
                    paymentConcept = isPromo2x1
                        ? `Promoción 2x1 — ${monthsToPay} Meses (${coverageText})`
                        : `Mes de ${coverageText} (${monthsToPay} ${monthsToPay === 1 ? 'Mes' : 'Meses'})`;
                } else if (type === 'reconnection') {
                    paymentConcept = 'Reconexión de Servicio';
                } else if (type === 'installation') {
                    paymentConcept = 'Instalación de Servicio Cable';
                } else if (type === 'material_sale') {
                    paymentConcept = `Venta de Materiales (${cart.length} productos)`;
                }

                setSuccessData({
                    clientName: client.full_name,
                    contractNumber: client.contract_number,
                    invoiceNumber: manualInvoiceNo || reference || `#${data.transactionId}`,
                    amount: enteredAmount,
                    paymentMethod: paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : paymentMethod === 'transfer' ? 'Transferencia' : 'Dólares',
                    concept: paymentConcept,
                    collectorName: collectorDisplayName,
                    transactionId: data.transactionId
                });

                // Reset fields
                setCart([]);
                setReceivedAmount('');
                setManualInvoiceNo('');
                eventBus.dispatch('GLOBAL_REFRESH');

                if (onPaymentSuccess) onPaymentSuccess();
            } else {
                setAlert({ show: true, type: 'error', title: 'Error al Registrar Cobro', message: data.msg || 'No se pudo procesar la transacción.' });
            }
        } catch (e) {
            console.error(e);
            setAlert({ show: true, type: 'error', title: 'Error de Red', message: 'No se pudo conectar con el servidor para procesar el pago.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!clientStatus) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '880px', width: '95%', background: 'radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
                {/* Header */}
                <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontSize: '1.2rem' }}>
                            <FaReceipt />
                        </div>
                        <div>
                            <h2 className="text-white" style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800' }}>Facturación / Caja</h2>
                            <small className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <FaUser size={12} color="#94a3b8" /> <strong>{client.full_name}</strong> — Contrato #{client.contract_number}
                            </small>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon" style={{ fontSize: '1.25rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaTimes />
                    </button>
                </div>

                {/* Body Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.75rem' }}>

                    {/* LEFT COLUMN: Config */}
                    <div className="flex-col">
                        <h3 style={{ color: '#60a5fa', fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1rem 0' }}>
                            <FaReceipt size={16} /> 1. Detalles del Pago
                        </h3>

                        {/* Retired Blocking */}
                        {client.status === 'disconnected' && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.92)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '24px', backdropFilter: 'blur(12px)' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⛔</div>
                                <h3 className="text-white" style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: '800' }}>CLIENTE RETIRADO</h3>
                                <p className="text-muted" style={{ maxWidth: '350px', textAlign: 'center' }}>Este cliente se encuentra retirado del sistema. Se requiere una instalación nueva para habilitar facturación.</p>
                                <button onClick={onClose} className="btn-secondary" style={{ marginTop: '1.5rem', padding: '0.75rem 2rem' }}>Cerrar</button>
                            </div>
                        )}

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>Tipo de Transacción</label>

                            {/* Force Reconnection if Suspended */}
                            {client.status === 'suspended' ? (
                                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', color: '#fca5a5' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '4px' }}>
                                        <span>⚠️</span> Cliente Cortado por Mora
                                    </div>
                                    <small style={{ color: '#fecaca' }}>Debe cancelar la reconexión de servicio.</small>
                                    <select className="input-dark" value="reconnection" disabled style={{ marginTop: '0.5rem', opacity: 1, color: 'white', fontWeight: 'bold' }}>
                                        <option value="reconnection">🔄 Reconexión (C$ 270.00)</option>
                                    </select>
                                </div>
                            ) : (
                                <select className="input-dark" value={type} onChange={e => setType(e.target.value)} style={{ fontWeight: '600' }}>
                                    <option value="monthly_fee">📅 Mensualidad Cable</option>
                                    <option value="installation">🛠️ Instalación de Servicio</option>
                                    <option value="material_sale">📦 Venta de Materiales / Equipos</option>
                                </select>
                            )}
                        </div>

                        {/* Manual Invoice Number */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', marginTop: '1rem' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>
                                No. Factura / Recibo Manual <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <input
                                type="text"
                                className="input-dark"
                                placeholder="Ej: 001523"
                                value={manualInvoiceNo}
                                onChange={e => setManualInvoiceNo(e.target.value)}
                                style={{ fontWeight: '700', letterSpacing: '0.05em' }}
                            />
                        </div>

                        {/* Dynamic Fields based on Type */}
                        {type === 'monthly_fee' && (
                            <div className="flex-col animate-slide-up" style={{ background: 'rgba(59, 130, 246, 0.06)', padding: '1.2rem', borderRadius: '14px', border: '1px solid rgba(59, 130, 246, 0.15)', marginTop: '1rem' }}>
                                <div className="flex-between">
                                    <label className="text-white" style={{ fontWeight: '600' }}>Meses a Pagar:</label>
                                    <div className="flex-center" style={{ gap: '0.5rem' }}>
                                        <button onClick={() => setMonthsToPay(Math.max(1, monthsToPay - 1))} className="btn-secondary" style={{ padding: '0.3rem 0.75rem', fontWeight: 'bold' }}>-</button>
                                        <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#60a5fa', minWidth: '35px', textAlign: 'center' }}>{monthsToPay}</span>
                                        <button onClick={() => setMonthsToPay(monthsToPay + 1)} className="btn-secondary" style={{ padding: '0.3rem 0.75rem', fontWeight: 'bold' }}>+</button>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>Periodo:</span>
                                    <span style={{ color: '#38bdf8', fontWeight: '700' }}>{coverageText}</span>
                                </div>

                                {/* 2x1 Promo Checkbox */}
                                <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.8rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px' }}>
                                    <label className="flex-center" style={{ gap: '0.6rem', cursor: 'pointer', color: '#fcd34d', justifyContent: 'flex-start' }}>
                                        <input
                                            type="checkbox"
                                            checked={isPromo2x1}
                                            onChange={e => {
                                                setIsPromo2x1(e.target.checked);
                                                if (e.target.checked && monthsToPay < 2) setMonthsToPay(2);
                                            }}
                                            style={{ transform: 'scale(1.2)' }}
                                        />
                                        <strong style={{ fontSize: '0.9rem' }}>🔥 Aplicar Promoción 2x1</strong>
                                    </label>
                                </div>

                                {/* Mora Control */}
                                <div style={{ marginTop: '0.75rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                                    <div className="flex-between">
                                        <label className="flex-center" style={{ gap: '0.5rem', cursor: 'pointer', color: '#fca5a5', fontSize: '0.9rem' }}>
                                            <input type="checkbox" checked={applyMora} onChange={e => setApplyMora(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                                            <span>Aplicar Mora / Recargo</span>
                                        </label>
                                        {applyMora && (
                                            <input
                                                type="number"
                                                className="input-dark"
                                                style={{ width: '105px', textAlign: 'right', borderColor: '#f87171', color: '#fca5a5', fontWeight: 'bold' }}
                                                value={manualMoraAmount}
                                                onChange={e => setManualMoraAmount(e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* INSTALLATION PRICE */}
                        {type === 'installation' && (
                            <div className="flex-col animate-slide-up" style={{ background: 'rgba(245, 158, 11, 0.06)', padding: '1.2rem', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.2)', marginTop: '1rem' }}>
                                <label className="text-white" style={{ marginBottom: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FaTools color="#fbbf24" /> Precio de Instalación (C$)
                                </label>
                                <input
                                    type="number"
                                    className="input-dark"
                                    value={installationPrice}
                                    onChange={e => setInstallationPrice(e.target.value)}
                                    style={{ fontSize: '1.35rem', fontWeight: '800', textAlign: 'center', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                                />
                                <small style={{ color: '#94a3b8', marginTop: '0.4rem' }}>Precio estándar: C$ 500.00 — Modifique si es promoción especial.</small>
                            </div>
                        )}

                        {/* PRODUCT SELECTOR (For Materials) */}
                        {type === 'material_sale' && (
                            <div className="flex-col animate-slide-up" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                                <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FaBoxOpen color="#60a5fa" /> Materiales a Vender
                                </label>
                                
                                {/* Autocomplete Product Search */}
                                <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <FaSearch color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input
                                            type="text"
                                            className="input-dark"
                                            placeholder="Escriba para buscar material..."
                                            value={productSearch}
                                            onChange={e => {
                                                setProductSearch(e.target.value);
                                                if (e.target.value.length > 0) setShowProductModal(true);
                                                else setShowProductModal(false);
                                            }}
                                            onFocus={() => { if (products.length > 0) setShowProductModal(true); }}
                                            onBlur={() => setTimeout(() => setShowProductModal(false), 250)}
                                            style={{ paddingLeft: '35px', width: '100%', borderRadius: '12px' }}
                                        />
                                    </div>

                                    {showProductModal && (
                                        <div style={{ 
                                            position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, 
                                            maxHeight: '220px', overflowY: 'auto', background: '#1e293b', 
                                            border: '1px solid #3b82f6', borderRadius: '12px', 
                                            zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' 
                                        }}>
                                            {products
                                                .filter(p => p.is_for_sale !== 0)
                                                .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                                .slice(0, 20) // limit results for better performance
                                                .map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => { 
                                                        handleAddToCart(p.id); 
                                                        setProductSearch(''); 
                                                        setShowProductModal(false); 
                                                    }}
                                                    style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>{p.name}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '2px' }}>
                                                        <span style={{ color: '#34d399' }}>C$ {parseFloat(p.price || p.selling_price || 0).toFixed(2)}</span>
                                                        <span style={{ color: '#94a3b8' }}>Stock: {p.current_stock || 0}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {products.filter(p => p.is_for_sale !== 0 && p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                                <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No hay resultados</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Cart Mini-View */}
                                <div style={{ maxHeight: '160px', overflowY: 'auto', marginTop: '0.75rem' }}>
                                    {cart.map((item, idx) => (
                                        <div key={idx} className="flex-between" style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.8rem', borderRadius: '10px', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>{item.quantity}x {item.name}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '0.95rem', color: '#34d399', fontWeight: '700' }}>C$ {((item.price || item.selling_price || 0) * item.quantity).toFixed(2)}</span>
                                                <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#f87171', borderRadius: '6px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {cart.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>Seleccione ítems para agregar a la venta</div>
                                )}
                            </div>
                        )}

                        {/* Collector Selection */}
                        <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>
                                Cobrador / Responsable
                            </label>
                            <select className="input-dark" value={selectedCollector} onChange={e => setSelectedCollector(e.target.value)}>
                                <option value="">-- Usuario Actual ({user?.username || 'Cajero'}) --</option>
                                {collectors.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Summary & Pay */}
                    <div className="flex-col" style={{ background: 'rgba(0,0,0,0.25)', padding: '1.75rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ color: '#34d399', fontSize: '1.05rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaMoneyBillWave size={16} /> 2. Resumen y Confirmación
                        </h3>

                        <div className="flex-between" style={{ marginBottom: '0.6rem' }}>
                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>Subtotal Servicios / Ítems:</span>
                            <span className="text-white" style={{ fontWeight: '600' }}>C$ {(calculatedTotal - (applyMora ? parseFloat(manualMoraAmount || 0) : 0)).toFixed(2)}</span>
                        </div>

                        {applyMora && (
                            <div className="flex-between" style={{ marginBottom: '0.6rem', color: '#f87171' }}>
                                <span style={{ fontSize: '0.9rem' }}>+ Mora / Recargo:</span>
                                <span style={{ fontWeight: '700' }}>C$ {parseFloat(manualMoraAmount || 0).toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex-between" style={{ marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '1.3rem', fontWeight: '800' }}>
                            <span className="text-white">TOTAL A PAGAR:</span>
                            <span style={{ color: '#34d399', textShadow: '0 2px 8px rgba(52, 211, 153, 0.3)' }}>C$ {calculatedTotal.toFixed(2)}</span>
                        </div>

                        {/* Payment Method Selector */}
                        <div style={{ marginTop: '1.25rem' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: '600' }}>Método de Pago</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                {[
                                    { value: 'cash', label: '💵 Efectivo', color: '#10b981' },
                                    { value: 'card', label: '💳 Tarjeta', color: '#3b82f6' },
                                    { value: 'transfer', label: '🏦 Transferencia', color: '#8b5cf6' },
                                    { value: 'dollars', label: '💲 Dólares', color: '#f59e0b' }
                                ].map(pm => (
                                    <button
                                        key={pm.value}
                                        onClick={() => setPaymentMethod(pm.value)}
                                        style={{
                                            padding: '0.65rem 0.5rem',
                                            borderRadius: '12px',
                                            border: paymentMethod === pm.value ? `2px solid ${pm.color}` : '1px solid rgba(255,255,255,0.08)',
                                            background: paymentMethod === pm.value ? `${pm.color}22` : 'rgba(0,0,0,0.25)',
                                            color: paymentMethod === pm.value ? pm.color : '#94a3b8',
                                            cursor: 'pointer',
                                            fontWeight: paymentMethod === pm.value ? '700' : '500',
                                            fontSize: '0.9rem',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {pm.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '1.25rem' }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>Monto Recibido</label>
                            <input
                                type="number"
                                className="input-dark"
                                style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white', textAlign: 'right', padding: '0.85rem 1rem', border: '1px solid #3b82f6', background: 'rgba(59, 130, 246, 0.08)' }}
                                placeholder="0.00"
                                value={receivedAmount}
                                onChange={e => setReceivedAmount(e.target.value)}
                            />
                        </div>

                        <div className="flex-between" style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Cambio a Devolver:</span>
                            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: (receivedAmount - calculatedTotal) >= 0 ? '#fbbf24' : '#64748b' }}>
                                C$ {Math.max(0, receivedAmount - calculatedTotal).toFixed(2)}
                            </span>
                        </div>

                        {/* Justification Field */}
                        {needsJustification && (
                            <div className="animate-slide-up" style={{ marginTop: '1rem', background: 'rgba(251, 191, 36, 0.1)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                                    <label className="text-muted" style={{ color: '#fbbf24', fontWeight: '700', fontSize: '0.85rem' }}>
                                        {isMoraIssue && !applyMora ? 'Perdón de Mora Requerido' : isInstallationPromo ? 'Justificación de Promoción' : 'Justificación de Precio'}
                                    </label>
                                </div>
                                <textarea
                                    className="input-dark"
                                    rows="2"
                                    placeholder="Indique el motivo o autorización..."
                                    value={justification}
                                    onChange={e => setJustification(e.target.value)}
                                    style={{ borderColor: '#eab308', fontSize: '0.85rem' }}
                                />
                            </div>
                        )}

                        <button
                            onClick={handlePay}
                            disabled={isSubmitting}
                            className={`btn-primary-glow ${isSubmitting ? 'loading' : ''}`}
                            style={{
                                marginTop: '1.5rem',
                                padding: '1.1rem',
                                fontSize: '1.1rem',
                                fontWeight: '800',
                                opacity: isSubmitting ? 0.6 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                borderRadius: '14px',
                                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)'
                            }}
                        >
                            {isSubmitting ? (
                                <div className="flex-center" style={{ gap: '0.8rem' }}>
                                    <span className="spinner-small"></span>
                                    PROCESANDO COBRO...
                                </div>
                            ) : (
                                <div className="flex-center" style={{ gap: '0.5rem' }}>
                                    <FaCheckCircle /> REGISTRAR COBRO
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ANUNCIO PERSONALIZADO DE FACTURA EXITOSA */}
            {successData && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.88)',
                    backdropFilter: 'blur(16px)',
                    zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{
                        background: 'radial-gradient(circle at top, #1e293b 0%, #0f172a 100%)',
                        border: '1px solid rgba(52, 211, 153, 0.35)',
                        borderRadius: '24px',
                        padding: '2.5rem 2rem',
                        maxWidth: '520px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.3)',
                        textAlign: 'center',
                        color: 'white',
                        fontFamily: 'Inter, sans-serif'
                    }}>
                        {/* Glowing Success Badge */}
                        <div style={{
                            width: '84px', height: '84px', borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '3px solid #10b981',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.25rem auto',
                            fontSize: '2.8rem', color: '#34d399',
                            boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)'
                        }}>
                            <FaCheck />
                        </div>

                        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.6rem', fontWeight: '900', background: 'linear-gradient(135deg, #f8fafc 0%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            ¡COBRO REGISTRADO CON ÉXITO!
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            La transacción fue guardada y reflejada en caja, inventario e historial.
                        </p>

                        {/* Detailed Card Breakdown */}
                        <div style={{
                            background: 'rgba(0,0,0,0.35)',
                            borderRadius: '16px',
                            padding: '1.25rem',
                            border: '1px solid rgba(255,255,255,0.06)',
                            textAlign: 'left',
                            marginBottom: '1.75rem',
                            display: 'flex', flexDirection: 'column', gap: '0.75rem'
                        }}>
                            <div className="flex-between">
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>👤 Cliente:</span>
                                <strong style={{ color: '#f1f5f9', fontSize: '0.95rem' }}>{successData.clientName}</strong>
                            </div>
                            <div className="flex-between">
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🏷️ Contrato:</span>
                                <span style={{ color: '#60a5fa', fontWeight: '700' }}>#{successData.contractNumber}</span>
                            </div>
                            <div className="flex-between">
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🧾 Factura Manual:</span>
                                <span style={{ color: '#fbbf24', fontWeight: '800' }}>#{successData.invoiceNumber}</span>
                            </div>
                            <div className="flex-between">
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>📅 Concepto / Periodo:</span>
                                <span style={{ color: '#38bdf8', fontWeight: '700', textAlign: 'right', maxWidth: '240px' }}>{successData.concept}</span>
                            </div>
                            <div className="flex-between">
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>💳 Método:</span>
                                <span style={{ color: '#cbd5e1', fontWeight: '600' }}>{successData.paymentMethod}</span>
                            </div>
                            <div className="flex-between">
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🧑‍💼 Cobrador:</span>
                                <span style={{ color: '#cbd5e1', fontWeight: '600' }}>{successData.collectorName}</span>
                            </div>
                            <div className="flex-between" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                <span style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>MONTO PAGADO:</span>
                                <span style={{ color: '#34d399', fontWeight: '900', fontSize: '1.4rem' }}>
                                    C$ {parseFloat(successData.amount).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Confirmation Button */}
                        <button
                            onClick={() => {
                                setSuccessData(null);
                                onClose();
                            }}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '14px',
                                fontSize: '1.05rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <FaCheck /> Entendido y Continuar
                        </button>
                    </div>
                </div>
            )}

            {/* Custom Alert */}
            <CustomAlert isOpen={alert.show} title={alert.title} message={alert.message} type={alert.type} onClose={() => {
                setAlert({ ...alert, show: false });
            }} />
        </div>
    );
};

export default BillingModal;


