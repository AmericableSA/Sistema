import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    FaArrowLeft, FaPlus, FaSearch, FaFileInvoiceDollar,
    FaCalendarAlt, FaCheckCircle, FaExclamationCircle, FaClock,
    FaMoneyBillWave, FaTrashAlt, FaTimes, FaStore,
    FaFilter, FaReceipt, FaUserPlus
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import * as api from '../service/api';
import { API_URL } from '../service/api';

// --- HELPERS ---
const getTodayManaguaISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Managua' });

const formatDateManagua = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString.includes('T') ? isoString : `${isoString}T12:00:00`);
    return new Intl.DateTimeFormat('es-NI', {
        timeZone: 'America/Managua', day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date);
};

// --- STYLES (DARK PREMIUM) ---
const fadeIn = keyframes`from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); }`;

const PageWrapper = styled.div`
    padding: clamp(1rem, 3vw, 2.5rem); 
    background: #0f172a; /* Dark Background */
    min-height: 100vh; 
    font-family: 'Inter', system-ui, sans-serif;
    color: #f8fafc;
    animation: ${fadeIn} 0.5s ease-out;
`;

const HeaderContainer = styled.div`
    display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1.5rem;
`;

const Title = styled.h1`
    font-size: clamp(1.8rem, 2.5vw, 2.2rem); color: #f8fafc; display: flex; align-items: center; gap: 0.75rem; margin: 0; font-weight: 800;
    svg { color: #3b82f6; }
`;
const Subtitle = styled.p`color: #94a3b8; margin: 0.5rem 0 0 0; font-size: 1rem;`;

const ActionButtons = styled.div`
    display: flex; gap: 0.75rem; flex-wrap: wrap;
    @media (max-width: 600px) { width: 100%; button, a { flex: 1; } }
`;

const Button = styled.button`
    padding: 0.75rem 1.25rem; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s;
    ${props => props.$primary && css`
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;
        box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
        &:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(37, 99, 235, 0.4); }
    `}
    ${props => props.$secondary && css`
        background: rgba(30, 41, 59, 0.5); color: #e2e8f0; border: 1px solid rgba(148, 163, 184, 0.2);
        &:hover { background: rgba(51, 65, 85, 0.8); border-color: #94a3b8; }
    `}
    ${props => props.$danger && css`background: rgba(239, 68, 68, 0.2); color: #fca5a5; &:hover { background: rgba(239, 68, 68, 0.3); }`}
`;

const BackButton = styled(Link)`
    padding: 0.75rem 1.25rem; background: rgba(30, 41, 59, 0.5); color: #e2e8f0; border-radius: 12px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 0.5rem; border: 1px solid rgba(148, 163, 184, 0.2);
    &:hover { background: rgba(51, 65, 85, 0.8); }
`;

const StatsGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;`;
const StatCard = styled.div`
    background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(10px); padding: 1.75rem; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); position: relative; overflow: hidden;
    &::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${props => props.color}; }
    .value { font-size: 2rem; font-weight: 800; color: #f8fafc; margin: 0.5rem 0; }
    .label { font-size: 0.85rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
`;

const Toolbar = styled.div`
    background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(10px); padding: 1rem; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem;
`;

const FilterTabs = styled.div`display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);`;
const TabButton = styled.button`
    background: ${props => props.active ? props.activeBg : 'transparent'}; color: ${props => props.active ? props.activeColor : '#94a3b8'};
    padding: 0.5rem 1rem; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; display: flex; gap: 0.5rem; align-items: center;
    &:hover { background: rgba(255,255,255,0.05); }
`;

const SearchContainer = styled.div`
    position: relative; flex: 2; input { width: 100%; padding: 0.8rem 1rem 0.8rem 2.8rem; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; color: white; &:focus { border-color: #3b82f6; outline: none; } } svg { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #64748b; }
`;
const FilterGroup = styled.div`
    flex: 1; display: flex; flex-direction: column; gap: 0.4rem; label { font-size: 0.8rem; color: #94a3b8; }
    select, input { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); color: white; padding: 0.7rem; border-radius: 8px; width: 100%; }
`;

const InvoicesGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem;`;
const InvoiceCard = styled.div`
    background: rgba(30, 41, 59, 0.4); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s;
    &:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.1); }
    .header { padding: 1.25rem; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; }
    .body { padding: 1.25rem; flex: 1; }
    .row { display: flex; justify-content: space-between; margin-bottom: 0.8rem; font-size: 0.9rem; color: #cbd5e1; }
    .amount { font-size: 1.5rem; font-weight: 800; color: #f8fafc; text-align: right; }
    .footer { padding: 1rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 0.5rem; background: rgba(15, 23, 42, 0.3); }
`;
const StatusBadge = styled.span`padding: 0.3rem 0.8rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: ${props => props.bg}; color: ${props => props.text};`;

// Modal Styles
const ModalOverlay = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
const ModalContent = styled.div`background: #1e293b; padding: 2rem; border-radius: 20px; width: 95%; max-width: 500px; border: 1px solid rgba(255,255,255,0.1); color: white; h2 { margin-top: 0; margin-bottom: 1.5rem; }`;
const FormGroup = styled.div`margin-bottom: 1rem; label { display: block; margin-bottom: 0.5rem; color: #94a3b8; } input, select, textarea { width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; &:focus { border-color: #3b82f6; outline: none; } }`;

const Alert = ({ info, onClose }) => {
    if (!info.show) return null;
    return (
        <ModalOverlay onClick={onClose}>
            <ModalContent style={{ maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', color: info.type === 'error' ? '#ef4444' : '#22c55e' }}>
                    {info.type === 'error' ? <FaTimes /> : <FaCheckCircle />}
                </div>
                <h3>{info.title}</h3>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{info.message}</p>
                <Button $primary style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>OK</Button>
            </ModalContent>
        </ModalOverlay>
    );
};

const Invoices = () => {
    const { token } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [filter, setFilter] = useState('PENDIENTE');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [alertInfo, setAlertInfo] = useState({ show: false, title: '', message: '', type: 'info' });

    // Forms
    const [formData, setFormData] = useState({ proveedor: '', numero_factura: '', fecha_emision: getTodayManaguaISO(), fecha_vencimiento: '', monto_total: '', notas: '' });
    const [provData, setProvData] = useState({ nombre: '', contacto: '', telefono: '', email: '', direccion: '' });
    const [payData, setPayData] = useState({ amount: '', reference: '' });

    const showAlert = (title, message, type = 'info') => setAlertInfo({ show: true, title, message, type });

    useEffect(() => {
        if (!token) return;
        const load = async () => {
            setLoading(true);
            try {
                // Load Providers Independent of Invoices
                try {
                    const provRes = await axios.get(`${API_URL}/providers`, { headers: { Authorization: `Bearer ${token}` } });
                    setProviders(Array.isArray(provRes.data) ? provRes.data : []);
                } catch (e) { console.error("Error loading providers:", e); }

                // Load Invoices
                try {
                    const invRes = await api.fetchProviderInvoices(token);
                    setInvoices(Array.isArray(invRes) ? invRes : []);
                } catch (e) { console.error("Error loading invoices:", e); }

            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, [token, refreshTrigger]);

    const handleCreateProvider = async (e) => {
        e.preventDefault();
        try {
            await api.createProvider(provData, token);
            setRefreshTrigger(p => p + 1);
            setShowProviderModal(false);
            setProvData({ nombre: '', contacto: '', telefono: '', email: '', direccion: '' });
            showAlert("Éxito", "Proveedor registrado correctamente", "success");
        } catch (e) { showAlert("Error", "No se pudo crear el proveedor", "error"); }
    };

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        try {
            await api.createProviderInvoice(formData, token);
            setRefreshTrigger(p => p + 1);
            setShowCreateModal(false);
            setFormData({ ...formData, numero_factura: '', monto_total: '', notas: '' });
            showAlert("Éxito", "Factura registrada", "success");
        } catch (e) { showAlert("Error", "Error al registrar factura", "error"); }
    };

    const handlePay = async (e) => {
        e.preventDefault();
        try {
            const payAmount = parseFloat(payData.amount);
            const total = parseFloat(selectedInvoice.monto_total);
            const paid = parseFloat(selectedInvoice.monto_abonado);
            const pending = total - paid;

            const newStatus = (payAmount >= pending - 0.1) ? 'PAGADA' : 'PENDIENTE'; // Simple logic

            await api.payProviderInvoice(selectedInvoice.id, payAmount, payData.reference, newStatus, token);
            setRefreshTrigger(p => p + 1);
            setShowPayModal(false);
            showAlert("Abono", "Pago registrado correctamente", "success");
        } catch (e) { showAlert("Error", "Falló el pago", "error"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Eliminar factura?")) return;
        try {
            await api.deleteProviderInvoice(id, token);
            setRefreshTrigger(p => p + 1);
        } catch (e) { console.error(e); }
    };

    // Filter Logic
    const filtered = useMemo(() => {
        let data = invoices.filter(inv => {
            const status = inv.monto_abonado >= (inv.monto_total - 0.1) ? 'PAGADA' : 'PENDIENTE';
            // Simplified status logic for brevity, can enhance
            if (filter !== 'TODAS' && filter !== status) return false;
            return true;
        });
        if (searchTerm) data = data.filter(i => i.proveedor?.toLowerCase().includes(searchTerm.toLowerCase()));
        return data;
    }, [invoices, filter, searchTerm]);

    const stats = useMemo(() => {
        const total = invoices.reduce((acc, i) => acc + (parseFloat(i.monto_total) - parseFloat(i.monto_abonado)), 0);
        return { totalDebt: total, count: invoices.length };
    }, [invoices]);

    return (
        <PageWrapper>
            <Alert info={alertInfo} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />
            <HeaderContainer>
                <div>
                    <Title><FaFileInvoiceDollar /> Cuentas por Pagar</Title>
                    <Subtitle>Gestión de Facturas de Proveedores</Subtitle>
                </div>
                <ActionButtons>
                    <BackButton to="/dashboard"><FaArrowLeft /> Volver</BackButton>
                    <Button $secondary onClick={() => setShowProviderModal(true)}><FaUserPlus /> Crear Proveedor</Button>
                    <Button $primary onClick={() => setShowCreateModal(true)}><FaPlus /> Nueva Factura</Button>
                </ActionButtons>
            </HeaderContainer>

            <StatsGrid>
                <StatCard color="#f59e0b">
                    <div className="icon-wrapper"><FaMoneyBillWave /></div>
                    <div className="value">C$ {stats.totalDebt.toLocaleString()}</div>
                    <div className="label">Deuda Total Pendiente</div>
                </StatCard>
                <StatCard color="#3b82f6">
                    <div className="icon-wrapper"><FaClock /></div>
                    <div className="value">{stats.count}</div>
                    <div className="label">Facturas Registradas</div>
                </StatCard>
            </StatsGrid>

            <Toolbar>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <FilterTabs>
                        <TabButton active={filter === 'PENDIENTE'} activeColor="#3b82f6" activeBg="rgba(59,130,246,0.2)" onClick={() => setFilter('PENDIENTE')}>Pendientes</TabButton>
                        <TabButton active={filter === 'PAGADA'} activeColor="#22c55e" activeBg="rgba(34,197,94,0.2)" onClick={() => setFilter('PAGADA')}>Pagadas</TabButton>
                        <TabButton active={filter === 'TODAS'} activeColor="#94a3b8" activeBg="rgba(148,163,184,0.2)" onClick={() => setFilter('TODAS')}>Todas</TabButton>
                    </FilterTabs>
                    <SearchContainer>
                        <FaSearch />
                        <input placeholder="Buscar por proveedor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </SearchContainer>
                </div>
            </Toolbar>

            {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando...</div> :
                <InvoicesGrid>
                    {filtered.map(inv => {
                        const total = parseFloat(inv.monto_total);
                        const paid = parseFloat(inv.monto_abonado);
                        const balance = total - paid;
                        return (
                            <InvoiceCard key={inv.id}>
                                <div className="header">
                                    <div style={{ fontWeight: '700', color: 'white' }}><FaStore style={{ color: '#94a3b8', marginRight: 5 }} /> {inv.proveedor}</div>
                                    <StatusBadge bg={balance < 1 ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)'} text={balance < 1 ? '#22c55e' : '#3b82f6'}>
                                        {balance < 1 ? 'PAGADA' : 'PENDIENTE'}
                                    </StatusBadge>
                                </div>
                                <div className="body">
                                    <div className="row"><span>Factura</span> <span>#{inv.numero_factura}</span></div>
                                    <div className="row"><span>Vence</span> <span>{formatDateManagua(inv.fecha_vencimiento)}</span></div>
                                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Saldo Pendiente</div>
                                        <div className="amount" style={{ color: balance > 0 ? '#ef4444' : '#22c55e' }}>C$ {balance.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total: C$ {total.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="footer">
                                    {balance > 1 && <Button $primary style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setSelectedInvoice(inv); setShowPayModal(true); }}><FaMoneyBillWave /> Abonar</Button>}
                                    <Button $danger onClick={() => handleDelete(inv.id)}><FaTrashAlt /></Button>
                                </div>
                            </InvoiceCard>
                        );
                    })}
                </InvoicesGrid>}

            {/* CREATE PROVIDER MODAL */}
            {showProviderModal && (
                <ModalOverlay onClick={() => setShowProviderModal(false)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <h2>Nuevo Proveedor</h2>
                        <form onSubmit={handleCreateProvider}>
                            <FormGroup><label>Nombre Empresa</label><input required value={provData.nombre} onChange={e => setProvData({ ...provData, nombre: e.target.value })} /></FormGroup>
                            <FormGroup><label>Contacto Principal</label><input value={provData.contacto} onChange={e => setProvData({ ...provData, contacto: e.target.value })} /></FormGroup>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FormGroup><label>Teléfono</label><input value={provData.telefono} onChange={e => setProvData({ ...provData, telefono: e.target.value })} /></FormGroup>
                                <FormGroup><label>Email</label><input value={provData.email} onChange={e => setProvData({ ...provData, email: e.target.value })} /></FormGroup>
                            </div>
                            <FormGroup><label>Dirección</label><input value={provData.direccion} onChange={e => setProvData({ ...provData, direccion: e.target.value })} /></FormGroup>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <Button type="button" $secondary onClick={() => setShowProviderModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancelar</Button>
                                <Button type="submit" $primary style={{ flex: 1, justifyContent: 'center' }}>Guardar Proveedor</Button>
                            </div>
                        </form>
                    </ModalContent>
                </ModalOverlay>
            )}

            {/* CREATE INVOICE MODAL */}
            {showCreateModal && (
                <ModalOverlay onClick={() => setShowCreateModal(false)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <h2>Registrar Factura</h2>
                        <form onSubmit={handleCreateInvoice}>
                            <FormGroup>
                                <label>Proveedor</label>
                                <select required value={formData.proveedor} onChange={e => setFormData({ ...formData, proveedor: e.target.value })}>
                                    <option value="">Seleccione...</option>
                                    {providers.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </FormGroup>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FormGroup><label>No. Factura</label><input required value={formData.numero_factura} onChange={e => setFormData({ ...formData, numero_factura: e.target.value })} /></FormGroup>
                                <FormGroup><label>Monto Total</label><input type="number" step="0.01" required value={formData.monto_total} onChange={e => setFormData({ ...formData, monto_total: e.target.value })} /></FormGroup>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <FormGroup><label>Fecha Emisión</label><input type="date" required value={formData.fecha_emision} onChange={e => setFormData({ ...formData, fecha_emision: e.target.value })} /></FormGroup>
                                <FormGroup><label>Vencimiento</label><input type="date" required value={formData.fecha_vencimiento} onChange={e => setFormData({ ...formData, fecha_vencimiento: e.target.value })} /></FormGroup>
                            </div>
                            <FormGroup><label>Notas</label><textarea value={formData.notas} onChange={e => setFormData({ ...formData, notas: e.target.value })} /></FormGroup>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <Button type="button" $secondary onClick={() => setShowCreateModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancelar</Button>
                                <Button type="submit" $primary style={{ flex: 1, justifyContent: 'center' }}>Registrar</Button>
                            </div>
                        </form>
                    </ModalContent>
                </ModalOverlay>
            )}

            {showPayModal && (
                <ModalOverlay onClick={() => setShowPayModal(false)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <h2>Registrar Abono</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Factura #{selectedInvoice?.numero_factura}</p>
                        <form onSubmit={handlePay}>
                            <FormGroup><label>Monto</label><input autoFocus type="number" step="0.01" required value={payData.amount} onChange={e => setPayData({ ...payData, amount: e.target.value })} /></FormGroup>
                            <FormGroup><label>Referencia</label><input value={payData.reference} onChange={e => setPayData({ ...payData, reference: e.target.value })} placeholder="Banco, Cheque..." /></FormGroup>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <Button type="button" $secondary onClick={() => setShowPayModal(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancelar</Button>
                                <Button type="submit" $primary style={{ flex: 1, justifyContent: 'center' }}>Confirmar Pago</Button>
                            </div>
                        </form>
                    </ModalContent>
                </ModalOverlay>
            )}

        </PageWrapper>
    );
};

export default Invoices;

