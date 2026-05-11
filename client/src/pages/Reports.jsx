import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import {
    FaCalendarAlt, FaChartBar, FaUserTimes, FaUserCheck,
    FaMoneyBillWave, FaArrowLeft, FaSync, FaCashRegister, FaExchangeAlt, FaUndo, FaBan
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import AlertModal from '../components/CustomAlert';
import DailyReportModal from '../components/DailyReportModal';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const getTodayISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Managua' });

const fadeIn = keyframes`from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); }`;

const PageWrapper = styled.div`
  padding: clamp(1rem, 3vw, 2.5rem);
  background: radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: #f8fafc;
  animation: ${fadeIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1);
`;

const Header = styled.header`
  display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem;
  background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(16px);
  padding: 1.5rem; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
  @media (min-width: 1024px) { flex-direction: row; justify-content: space-between; align-items: flex-start; }
`;

const HeaderControls = styled.div`
  display: flex; 
  flex-wrap: wrap; 
  gap: 1rem; 
  align-items: center;
  justify-content: flex-start;
  @media (min-width: 1024px) { justify-content: flex-end; }
  
  & > button, & > div {
    flex: 1 1 100%;
    @media (min-width: 640px) { flex: 1 1 calc(50% - 0.5rem); }
    @media (min-width: 1024px) { flex: 0 1 auto; }
  }
`;

const TitleHeader = styled.h1`
  font-size: clamp(1.5rem, 4vw, 2.2rem); color: white; margin: 0; font-weight: 800;
  background: linear-gradient(135deg, #f8fafc 0%, #cbd5e1 50%, #94a3b8 100%); 
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  line-height: 1.2;
`;

const Grid = styled.div`
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); 
  gap: 1.5rem; 
  margin-bottom: 2.5rem;
`;

const Card = styled.div`
  background: rgba(30, 41, 59, 0.5); 
  backdrop-filter: blur(12px);
  padding: 1.5rem; 
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.05); 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover { 
    transform: translateY(-5px) scale(1.02); 
    border-color: rgba(255,255,255,0.15); 
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  }
  ${props => props.$highlight && css`
    background: ${props.$highlight}; 
    border: none;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
  `}
`;

const Value = styled.div`
  font-size: clamp(1.8rem, 3vw, 2.2rem); 
  font-weight: 800; 
  color: white; 
  margin: 0.5rem 0;
  text-shadow: 0 2px 10px rgba(0,0,0,0.2);
`;

const Label = styled.div`
  font-size: 0.85rem; 
  font-weight: 700; 
  color: #94a3b8; 
  text-transform: uppercase; 
  letter-spacing: 0.05em; 
  display: flex; 
  align-items: center; 
  gap: 0.5rem;
`;

const SectionTitle = styled.h2`
  font-size: clamp(1.1rem, 2vw, 1.4rem); 
  color: #f1f5f9; 
  margin-bottom: 1rem; 
  font-weight: 700; 
  border-left: 4px solid #3b82f6; 
  padding-left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const OverflowWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 12px;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
`;

const CashClosingTable = styled.table`
    width: 100%; border-collapse: separate; border-spacing: 0; min-width: 400px;
    th, td { padding: 1.2rem 1rem; text-align: left; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.05); }
    th { font-weight: 600; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(0,0,0,0.2); }
    tr:last-child td { border-bottom: none; }
    tr { transition: background-color 0.2s; }
    tr:hover td { background-color: rgba(255,255,255,0.02); }
`;

const DateInputContainer = styled.div`
  position: relative;
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 0.7rem 1.2rem;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  &:hover, &:focus-within { 
    border-color: rgba(59, 130, 246, 0.5); 
    background: rgba(30, 41, 59, 0.8); 
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const DateInput = styled.input`
  background: transparent; border: none; color: white;
  font-family: inherit; font-size: 0.95rem; font-weight: 500;
  width: 130px;
  &::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; transition: filter 0.2s; }
  &::-webkit-calendar-picker-indicator:hover { filter: invert(1); }
  outline: none;
`;

const ActionButton = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.8rem 1.5rem; border-radius: 14px; font-weight: 600; font-size: 0.95rem;
  cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;

  ${props => props.$variant === 'primary' && css`
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    &:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); }
  `}

  ${props => props.$variant === 'success' && css`
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    &:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4); }
  `}

  ${props => props.$variant === 'outline-primary' && css`
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    border-color: rgba(59, 130, 246, 0.3);
    &:hover { background: rgba(59, 130, 246, 0.2); border-color: #3b82f6; transform: translateY(-2px); }
  `}

  ${props => props.$variant === 'outline-success' && css`
    background: rgba(16, 185, 129, 0.1);
    color: #34d399;
    border-color: rgba(16, 185, 129, 0.3);
    &:hover { background: rgba(16, 185, 129, 0.2); border-color: #10b981; transform: translateY(-2px); }
  `}
  
  ${props => props.$variant === 'outline-warning' && css`
    background: rgba(245, 158, 11, 0.1);
    color: #fbbf24;
    border-color: rgba(245, 158, 11, 0.3);
    &:hover { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; transform: translateY(-2px); }
  `}
  
  ${props => props.$variant === 'outline-danger' && css`
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.3);
    &:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; transform: translateY(-2px); }
  `}
  
  ${props => props.$variant === 'outline-purple' && css`
    background: rgba(139, 92, 246, 0.1);
    color: #a78bfa;
    border-color: rgba(139, 92, 246, 0.3);
    &:hover { background: rgba(139, 92, 246, 0.2); border-color: #8b5cf6; transform: translateY(-2px); }
  `}
`;

// ─── Facturas por Cobrador: Styled Components extras ─────────────────────────
const InvFilterPanel = styled.div`
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const InvFilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  label { font-size: 0.78rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  input, select {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(255,255,255,0.1);
    color: #f1f5f9;
    padding: 0.65rem 0.9rem;
    border-radius: 10px;
    font-size: 0.9rem;
    transition: border-color 0.2s;
    &:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
    option { background: #1e293b; }
  }
`;

const InvTable = styled.table`
  width: 100%; border-collapse: separate; border-spacing: 0; min-width: 900px;
  th {
    padding: 0.9rem 1rem; text-align: left; color: #64748b;
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700;
    background: rgba(0,0,0,0.25); border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  th:first-child { border-radius: 10px 0 0 0; }
  th:last-child { border-radius: 0 10px 0 0; }
  td {
    padding: 0.95rem 1rem; color: #cbd5e1; font-size: 0.88rem;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tbody tr { transition: background 0.15s; }
  tbody tr:hover td { background: rgba(255,255,255,0.03); }
`;

const InvPagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.06);
`;

const PageBtn = styled.button`
  width: 36px; height: 36px; border-radius: 8px; border: 1px solid;
  font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
  background: ${p => p.$active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#60a5fa' : '#94a3b8'};
  border-color: ${p => p.$active ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.07)'};
  &:hover:not(:disabled) { background: rgba(59,130,246,0.2); color: #60a5fa; border-color: rgba(59,130,246,0.4); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const InvSummaryBadge = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700;
  background: ${p => p.$bg || 'rgba(59,130,246,0.1)'};
  color: ${p => p.$color || '#60a5fa'};
  border: 1px solid ${p => p.$border || 'rgba(59,130,246,0.2)'};
`;
// ─────────────────────────────────────────────────────────────────────────────

const Reports = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [cableStats, setCableStats] = useState({ morosos: { count: 0, deuda: 0 }, retirados: 0, instalaciones_mes: 0, clientes_activos: 0, suspendidos: 0, desconectados_solicitud: 0 });
    const [dailyClosing, setDailyClosing] = useState({ ingresos: 0, egresos: 0, devoluciones: 0, balance_dia: 0, por_usuario: [] });
    const [topCollectors, setTopCollectors] = useState([]);
    const [collectorPerformance, setCollectorPerformance] = useState([]);
    const [movements, setMovements] = useState({});
    const [orders, setOrders] = useState({ byType: [], byStatus: [] });
    const [showDailyReport, setShowDailyReport] = useState(false);
    const [refresh, setRefresh] = useState(0);

    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // ── Estado: Facturas por Cobrador ────────────────────────────────────────
    const [invData, setInvData] = useState([]);
    const [invPagination, setInvPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
    const [invSummary, setInvSummary] = useState({ totalMonto: 0, totalCanceladas: 0, montoCancelado: 0, totalFacturas: 0 });
    const [invLoading, setInvLoading] = useState(false);
    const [invSearched, setInvSearched] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [invFilters, setInvFilters] = useState({
        collectorId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        clientSearch: '',
        limit: '25'
    });
    // ─────────────────────────────────────────────────────────────────────────
    const formatCurrency = (val) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(val || 0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api') + '/reports';
        const headers = { 'Authorization': `Bearer ${token}` };

        // Dates for Month Range (for cable stats context if needed, though mostly unused now)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        try {
            const [statsRes, closingRes, topRes, performanceRes, moveRes, ordersRes] = await Promise.all([
                fetch(`${apiBaseUrl}/cable-stats?startDate=${startDate}&endDate=${endDate}`, { headers }),
                fetch(`${apiBaseUrl}/daily-closing?startDate=${startDate}&endDate=${endDate}`, { headers }),
                fetch(`${apiBaseUrl}/sales-by-user?startDate=${startDate}&endDate=${endDate}`, { headers }),
                fetch(`${apiBaseUrl}/collector-performance?startDate=${startDate}&endDate=${endDate}`, { headers }),
                fetch(`${apiBaseUrl}/movements?startDate=${startDate}&endDate=${endDate}`, { headers }),
                fetch(`${apiBaseUrl}/orders?startDate=${startDate}&endDate=${endDate}`, { headers })
            ]);

            setCableStats(await statsRes.json());
            setDailyClosing(await closingRes.json());
            setTopCollectors(await topRes.json());
            setCollectorPerformance(await performanceRes.json());
            setMovements(await moveRes.json());
            setOrders(await ordersRes.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [refresh, startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Cargar lista de cobradores/usuarios ──────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then(data => setUsersList(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    // ── Función: buscar facturas paginadas ───────────────────────────────────
    const fetchInvoices = useCallback(async (pageOverride = null) => {
        setInvLoading(true);
        setInvSearched(true);
        const token = localStorage.getItem('token');
        const apiBase = (import.meta.env.VITE_API_URL || '/api') + '/reports';
        const page = pageOverride !== null ? pageOverride : invPagination.page;
        const params = new URLSearchParams({
            ...(invFilters.collectorId ? { collectorId: invFilters.collectorId } : {}),
            ...(invFilters.startDate ? { startDate: invFilters.startDate } : {}),
            ...(invFilters.endDate ? { endDate: invFilters.endDate } : {}),
            ...(invFilters.invoiceNumber ? { invoiceNumber: invFilters.invoiceNumber } : {}),
            ...(invFilters.clientSearch ? { clientSearch: invFilters.clientSearch } : {}),
            page: String(page),
            limit: invFilters.limit || '25'
        });
        try {
            const res = await fetch(`${apiBase}/invoices-by-collector?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            setInvData(json.data || []);
            setInvPagination(json.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
            setInvSummary(json.summary || { totalMonto: 0, totalCanceladas: 0, montoCancelado: 0, totalFacturas: 0 });
        } catch (e) {
            console.error('Facturas report error:', e);
        } finally {
            setInvLoading(false);
        }
    }, [invFilters, invPagination.page]);

    const handleInvSearch = () => fetchInvoices(1);
    const handleInvPageChange = (newPage) => {
        setInvPagination(prev => ({ ...prev, page: newPage }));
        fetchInvoices(newPage);
    };
    const handleInvReset = () => {
        setInvFilters({ collectorId: '', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], invoiceNumber: '', clientSearch: '', limit: '25' });
        setInvData([]);
        setInvSearched(false);
        setInvPagination({ total: 0, page: 1, limit: 25, totalPages: 1 });
        setInvSummary({ totalMonto: 0, totalCanceladas: 0, montoCancelado: 0, totalFacturas: 0 });
    };
    const handleInvExportXLS = () => {
        import('xlsx').then(XLSX => {
            const rows = invData.map(r => ({
                'N° Factura': r.numero_factura,
                'Fecha': new Date(r.fecha).toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true }),
                'Cliente': r.cliente,
                'Contrato': r.contrato,
                'Cobrador': r.cobrador,
                'Usuario': `@${r.usuario_cobrador}`,
                'Método Pago': r.metodo_pago,
                'Monto (NIO)': parseFloat(r.monto),
                'Estado': r.estado === 'CANCELLED' ? 'CANCELADO' : r.estado === 'SUCCESS' ? 'EXITOSO' : r.estado,
                'Motivo Cancelación': r.cancellation_reason || ''
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
            const collector = usersList.find(u => String(u.id) === String(invFilters.collectorId));
            const cName = collector ? `_${collector.username}` : '';
            XLSX.writeFile(wb, `Facturas${cName}_${invFilters.startDate || 'todo'}_${invFilters.endDate || ''}.xlsx`);
        });
    };
    // ─────────────────────────────────────────────────────────────────────────

    const invFormatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('es-NI', { timeZone: 'America/Managua', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const exportToExcelBI = () => {
        try {
            const wb = XLSX.utils.book_new();

            // 1. Resumen General
            const wsResumen = XLSX.utils.json_to_sheet([{
                "Fecha Inicio": startDate,
                "Fecha Fin": endDate,
                "Total Clientes (Base)": cableStats?.total_clientes || 0,
                "Clientes Al Día": cableStats?.al_dia || 0,
                "Clientes Morosos": cableStats?.morosos?.count || 0,
                "Deuda Morosos (NIO)": cableStats?.morosos?.deuda || 0,
                "Clientes Suspendidos": cableStats?.suspendidos || 0,
                "Ingresos Caja (NIO)": dailyClosing?.ingresos || 0,
                "Egresos Caja (NIO)": dailyClosing?.egresos || 0,
                "Balance Caja Neto (NIO)": dailyClosing?.balance_dia || 0,
                "Averías Pendientes": cableStats?.averias_pendientes || 0,
                "Averías Atendidas": cableStats?.averias_atendidas || 0,
                "Contactos Pendientes": cableStats?.contactos_pendientes || 0,
                "Contactos Atendidos": cableStats?.contactos_atendidos || 0,
            }]);
            XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen General");

            // 2. Movimientos Operativos
            const wsMovimientos = XLSX.utils.json_to_sheet([{
                "Cambios de Nombre": movements?.CHANGE_NAME || 0,
                "Traslados": movements?.CHANGE_ADDRESS || 0,
                "Solicitudes de Baja": movements?.DISCONNECT_REQ || 0,
                "Cortes por Mora": movements?.DISCONNECT_MORA || 0,
            }]);
            XLSX.utils.book_append_sheet(wb, wsMovimientos, "Movimientos Operativos");

            // 3. Órdenes de Servicio
            const ordersData = (orders?.byType || []).map(o => ({
                "Tipo de Orden": o.type,
                "Total Generadas": o.total
            }));
            const totalOrders = (orders?.byStatus || []).reduce((acc, curr) => acc + curr.total, 0);
            ordersData.push({ "Tipo de Orden": "TOTAL ÓRDENES", "Total Generadas": totalOrders });
            const wsOrders = XLSX.utils.json_to_sheet(ordersData);
            XLSX.utils.book_append_sheet(wb, wsOrders, "Órdenes de Servicio");

            // 4. Cierre de Caja por Usuario
            const cashData = (dailyClosing?.por_usuario || []).map(u => ({
                "Usuario": u.username,
                "Total Cobrado (NIO)": u.total,
                "Porcentaje del Ingreso Total": ((u.total / (dailyClosing?.ingresos || 1)) * 100).toFixed(2) + "%"
            }));
            const wsCash = XLSX.utils.json_to_sheet(cashData);
            XLSX.utils.book_append_sheet(wb, wsCash, "Ingresos por Cajero");

            // 5. Rendimiento de Cobradores
            const collectorData = (collectorPerformance || []).map(c => ({
                "Nombre Completo": c.full_name,
                "Usuario": c.username,
                "Total Cobrado (NIO)": c.total_cobrado,
                "Total Recibos Emitidos": c.total_recibos,
                "Promedio por Recibo (NIO)": c.promedio_recibo,
                "Último Cobro Registrado": c.ultimo_cobro ? new Date(c.ultimo_cobro).toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true }) : 'Sin cobros'
            }));
            const wsCollectors = XLSX.utils.json_to_sheet(collectorData);
            XLSX.utils.book_append_sheet(wb, wsCollectors, "Rendimiento Cobradores");

            // Guardar archivo Excel
            XLSX.writeFile(wb, `Inteligencia_Negocios_Americable_${startDate}_al_${endDate}.xlsx`);
        } catch (error) {
            console.error("Error al exportar a Excel:", error);
            alert("Hubo un error al generar el archivo Excel.");
        }
    };

    return (
        <PageWrapper>
            <Header>
                <div>
                    <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <FaArrowLeft /> Volver
                    </button>
                    <TitleHeader>Reportes Operativos</TitleHeader>
                    <p style={{ margin: 0, color: '#64748b' }}>Resumen de Caja, Morosidad y Estado de Red</p>
                </div>
                <HeaderControls>
                    <DateInputContainer>
                        <FaCalendarAlt style={{ color: '#94a3b8' }} />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '0.5rem' }}>Desde:</span>
                        <DateInput
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </DateInputContainer>
                    <DateInputContainer>
                        <FaCalendarAlt style={{ color: '#94a3b8' }} />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '0.5rem' }}>Hasta:</span>
                        <DateInput
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </DateInputContainer>
                    <ActionButton $variant="outline-primary" onClick={() => setShowDailyReport(true)}>
                        <FaChartBar /> Detalle Diario
                    </ActionButton>
                    <ActionButton
                        $variant="outline-success"
                        onClick={() => {
                            fetch('/api/clients/export-routes-xls')
                                .then(res => {
                                    if (!res.ok) throw new Error('Error en descarga');
                                    return res.blob();
                                })
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'Reporte_Rutas_Cobradores.xlsx';
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                })
                                .catch(err => alert('Error descargando reporte: ' + err.message));
                        }}>
                        <FaMoneyBillWave /> Rutas Cobradores
                    </ActionButton>
                    <ActionButton $variant="primary" onClick={() => setRefresh(prev => prev + 1)}>
                        <FaSync /> Actualizar
                    </ActionButton>
                    <ActionButton $variant="success" onClick={exportToExcelBI}>
                        <FaChartBar /> Exportar BI (Excel)
                    </ActionButton>
                </HeaderControls>
            </Header>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <SectionTitle style={{ marginBottom: 0 }}>Actividad Operativa ({startDate} - {endDate})</SectionTitle>
                <ActionButton
                    $variant="outline-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => {
                        try {
                            const wsMovimientos = XLSX.utils.json_to_sheet([{
                                "Cambios de Nombre": movements?.CHANGE_NAME || 0,
                                "Traslados": movements?.CHANGE_ADDRESS || 0,
                                "Solicitudes de Baja": movements?.DISCONNECT_REQ || 0,
                                "Cortes por Mora": movements?.DISCONNECT_MORA || 0,
                            }]);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, wsMovimientos, "Movimientos Operativos");
                            XLSX.writeFile(wb, `Movimientos_Operativos_${startDate}_al_${endDate}.xlsx`);
                        } catch (error) {
                            console.error("Error al exportar a Excel:", error);
                            alert("Hubo un error al generar el archivo Excel.");
                        }
                    }}>
                    📥 Exportar Movimientos
                </ActionButton>
            </div>
            <Grid>
                <Card>
                    <Label style={{ color: '#db2777' }}>📝 Cambios Nombre</Label>
                    <Value style={{ color: 'white' }}>{movements.CHANGE_NAME || 0}</Value>
                </Card>
                <Card>
                    <Label style={{ color: '#9333ea' }}>📍 Traslados</Label>
                    <Value style={{ color: 'white' }}>{movements.CHANGE_ADDRESS || 0}</Value>
                </Card>
                <Card>
                    <Label style={{ color: '#ef4444' }}>✂️ Solicitudes Baja</Label>
                    <Value style={{ color: 'white' }}>{movements.DISCONNECT_REQ || 0}</Value>
                </Card>
                <Card>
                    <Label style={{ color: '#f59e0b' }}>⚖️ Cortes Mora</Label>
                    <Value style={{ color: 'white' }}>{movements.DISCONNECT_MORA || 0}</Value>
                </Card>
            </Grid>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <SectionTitle style={{ marginBottom: 0 }}>Órdenes de Servicio ({startDate} - {endDate})</SectionTitle>
                <ActionButton
                    $variant="outline-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => {
                        try {
                            const ordersData = (orders?.byType || []).map(o => ({
                                "Tipo de Orden": o.type,
                                "Total Generadas": o.total
                            }));
                            const totalOrders = (orders?.byStatus || []).reduce((acc, curr) => acc + curr.total, 0);
                            ordersData.push({ "Tipo de Orden": "TOTAL ÓRDENES", "Total Generadas": totalOrders });
                            const wsOrders = XLSX.utils.json_to_sheet(ordersData);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, wsOrders, "Órdenes de Servicio");
                            XLSX.writeFile(wb, `Ordenes_Servicio_${startDate}_al_${endDate}.xlsx`);
                        } catch (error) {
                            console.error("Error al exportar a Excel:", error);
                            alert("Hubo un error al generar el archivo Excel.");
                        }
                    }}>
                    📥 Exportar Órdenes
                </ActionButton>
            </div>
            <Grid>
                <Card>
                    <Label style={{ color: '#3b82f6' }}>🛠️ Total Órdenes</Label>
                    <Value>{orders.byStatus.reduce((acc, curr) => acc + curr.total, 0)}</Value>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Generadas en periodo</div>
                </Card>
                {orders.byType.map((t, i) => (
                    <Card key={i}>
                        <Label>{t.type}</Label>
                        <Value style={{ fontSize: '1.5rem' }}>{t.total}</Value>
                    </Card>
                ))}
            </Grid>

            {/* Existing Sections Below */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <SectionTitle style={{ marginBottom: 0 }}>Cierre de Caja ({startDate} - {endDate})</SectionTitle>
                <ActionButton
                    $variant="outline-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => {
                        try {
                            const wsCierre = XLSX.utils.json_to_sheet([{
                                "Fecha Inicio": startDate,
                                "Fecha Fin": endDate,
                                "Ingresos (NIO)": dailyClosing?.ingresos || 0,
                                "Egresos (NIO)": dailyClosing?.egresos || 0,
                                "Balance Neto (NIO)": dailyClosing?.balance_dia || 0,
                            }]);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, wsCierre, "Cierre de Caja");
                            XLSX.writeFile(wb, `Cierre_Caja_${startDate}_al_${endDate}.xlsx`);
                        } catch (error) {
                            console.error("Error al exportar a Excel:", error);
                            alert("Hubo un error al generar el archivo Excel.");
                        }
                    }}>
                    📥 Exportar Cierre
                </ActionButton>
            </div>
            <Grid>
                <Card $highlight="linear-gradient(135deg, #059669 0%, #10b981 100%)">
                    <Label style={{ color: 'white' }}><FaCashRegister /> Ingresos</Label>
                    <Value>{formatCurrency(dailyClosing.ingresos)}</Value>
                    <div style={{ color: '#d1fae5', fontSize: '0.9rem' }}>Cobrado en transacciones</div>
                    <ActionButton
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                        onClick={() => {
                            fetch(`/api/reports/daily-details/export?startDate=${startDate}&endDate=${endDate}`)
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Bitacora_Detallada_${startDate}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Detalle
                    </ActionButton>
                </Card>
                <Card $highlight="linear-gradient(135deg, #dc2626 0%, #ef4444 100%)">
                    <Label style={{ color: 'white' }}><FaExchangeAlt /> Gastos</Label>
                    <Value>{formatCurrency(dailyClosing.egresos)}</Value>
                    <div style={{ color: '#fecaca' }}>Pagos y Salidas</div>
                    <ActionButton
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                        onClick={() => {
                            fetch(`/api/reports/daily-details/export?startDate=${startDate}&endDate=${endDate}`)
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Bitacora_Gastos_${startDate}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Detalle
                    </ActionButton>
                </Card>
                {/* Devoluciones - facturas anuladas, NO es gasto */}
                {dailyClosing.devoluciones > 0 && (
                    <Card style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
                        <Label style={{ color: 'white' }}><FaUndo /> Devoluciones</Label>
                        <Value>{formatCurrency(dailyClosing.devoluciones)}</Value>
                        <div style={{ color: '#ddd6fe', fontSize: '0.85rem' }}>Facturas anuladas (no es gasto)</div>
                    </Card>
                )}
                <Card>
                    <Label><FaMoneyBillWave /> Balance Neto</Label>
                    <Value style={{ color: dailyClosing.balance_dia >= 0 ? '#4ade80' : '#ef4444' }}>
                        {formatCurrency(dailyClosing.balance_dia)}
                    </Value>
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Diferencia (Caja Real)</div>
                    <ActionButton
                        $variant="outline-primary"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => {
                            fetch(`/api/reports/daily-details/export?startDate=${startDate}&endDate=${endDate}`)
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Bitacora_Balance_${startDate}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Detalle
                    </ActionButton>
                </Card>
            </Grid>

            {dailyClosing.por_usuario && dailyClosing.por_usuario.length > 0 && (
                <Card style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <Label>Desglose por Cajero (Periodo)</Label>
                        <ActionButton
                            $variant="outline-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            onClick={() => {
                                try {
                                    const cashData = (dailyClosing?.por_usuario || []).map(u => ({
                                        "Usuario": u.username,
                                        "Total Cobrado (NIO)": u.total,
                                        "Porcentaje del Ingreso Total": ((u.total / (dailyClosing?.ingresos || 1)) * 100).toFixed(2) + "%"
                                    }));
                                    const wsCash = XLSX.utils.json_to_sheet(cashData);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, wsCash, "Ingresos por Cajero");
                                    XLSX.writeFile(wb, `Ingresos_por_Cajero_${startDate}_al_${endDate}.xlsx`);
                                } catch (error) {
                                    console.error("Error al exportar a Excel:", error);
                                    alert("Hubo un error al generar el archivo Excel.");
                                }
                            }}>
                            📥 Exportar Excel
                        </ActionButton>
                    </div>
                    <OverflowWrapper>
                        <CashClosingTable>
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Total Cobrado</th>
                                    <th>% del Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyClosing.por_usuario.map((u, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 'bold', color: 'white' }}>{u.username}</td>
                                        <td style={{ color: '#4ade80', fontWeight: 'bold' }}>{formatCurrency(u.total)}</td>
                                        <td>{((u.total / dailyClosing.ingresos) * 100).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </CashClosingTable>
                    </OverflowWrapper>
                </Card>
            )}

            {dailyClosing.sesiones && dailyClosing.sesiones.length > 0 && (
                <Card style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)', border: '1px solid #eab30855' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <Label style={{ color: '#fbbf24', fontSize: '1rem' }}>🛡️ Auditoría de Cierres de Cajas</Label>
                        <ActionButton
                            $variant="outline-warning"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            onClick={() => {
                                try {
                                    const sessionData = (dailyClosing?.sesiones || []).map(s => ({
                                        "ID Sesión": s.id,
                                        "Caja": s.session_type,
                                        "Usuario": s.username,
                                        "Apertura": new Date(s.start_time).toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true }),
                                        "Cierre": s.end_time ? new Date(s.end_time).toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true }) : 'Abierta',
                                        "Monto Sistema (NIO)": s.end_amount_system || 0,
                                        "Monto Físico (NIO)": s.end_amount_physical || 0,
                                        "Diferencia (NIO)": s.difference || 0,
                                        "Justificación": s.closing_note || 'N/A'
                                    }));
                                    const wsSessions = XLSX.utils.json_to_sheet(sessionData);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, wsSessions, "Auditoría de Cierres");
                                    XLSX.writeFile(wb, `Auditoria_Cierres_${startDate}_al_${endDate}.xlsx`);
                                } catch (error) {
                                    console.error("Error al exportar a Excel:", error);
                                    alert("Hubo un error al generar el archivo Excel.");
                                }
                            }}>
                            📥 Exportar Auditoría
                        </ActionButton>
                    </div>
                    <OverflowWrapper>
                        <CashClosingTable>
                            <thead>
                                <tr>
                                    <th>Caja / Usuario</th>
                                    <th>Fecha y Hora</th>
                                    <th className="text-right">Sistema</th>
                                    <th className="text-right">Físico</th>
                                    <th className="text-right">Diferencia</th>
                                    <th>Justificación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyClosing.sesiones.map((s, i) => {
                                    const diff = parseFloat(s.difference) || 0;
                                    return (
                                        <tr key={i} style={{ opacity: s.status === 'open' ? 0.6 : 1 }}>
                                            <td>
                                                <div style={{ fontWeight: 'bold', color: 'white' }}>{s.session_type}</div>
                                                <small style={{ color: '#94a3b8' }}>@{s.username}</small>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}><span style={{ color: '#34d399' }}>A:</span> {new Date(s.start_time).toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true })}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}><span style={{ color: '#f87171' }}>C:</span> {s.status === 'closed' ? new Date(s.end_time).toLocaleString('es-NI', { timeZone: 'America/Managua', hour12: true }) : 'EN CURSO'}</div>
                                            </td>
                                            <td className="text-right" style={{ color: '#cbd5e1' }}>
                                                {s.status === 'closed' ? formatCurrency(s.end_amount_system) : '-'}
                                            </td>
                                            <td className="text-right" style={{ color: 'white', fontWeight: 'bold' }}>
                                                {s.status === 'closed' ? formatCurrency(s.end_amount_physical) : '-'}
                                            </td>
                                            <td className="text-right" style={{ fontWeight: 'bold', color: diff === 0 ? 'white' : (diff > 0 ? '#34d399' : '#f87171') }}>
                                                {s.status === 'closed' ? (diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)) : '-'}
                                            </td>
                                            <td style={{ maxWidth: '250px', whiteSpace: 'normal', fontSize: '0.85rem' }}>
                                                {s.closing_note ? (
                                                    <div style={{ background: 'rgba(234, 179, 8, 0.15)', borderLeft: '3px solid #eab308', padding: '6px 10px', color: '#fde047', borderRadius: '0 4px 4px 0' }}>
                                                        {s.closing_note}
                                                    </div>
                                                ) : <span style={{ color: '#64748b', fontStyle: 'italic' }}>Sin observaciones</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </CashClosingTable>
                    </OverflowWrapper>
                </Card>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <SectionTitle style={{ marginBottom: 0 }}>Rendimiento por Cobrador ({startDate} - {endDate})</SectionTitle>
                <ActionButton
                    $variant="outline-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => {
                        fetch(`/api/reports/collector-performance/export?startDate=${startDate}&endDate=${endDate}`)
                            .then(res => res.blob())
                            .then(blob => {
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Cierre_Cobradores_${startDate}.xlsx`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                            });
                    }}>
                    📥 Exportar Cierre Cobradores
                </ActionButton>
            </div>
            <Card style={{ marginBottom: '2rem' }}>
                <OverflowWrapper>
                    <CashClosingTable>
                        <thead>
                            <tr>
                                <th>Cobrador</th>
                                <th className="text-right">Total Cobrado</th>
                                <th className="text-center">Recibos</th>
                                <th className="text-right">Promedio</th>
                                <th className="text-right">Último Cobro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {collectorPerformance.length === 0 ? (
                                <tr><td colSpan="5" className="text-center">No hay datos de cobro en este periodo</td></tr>
                            ) : (
                                collectorPerformance.map((c, i) => (
                                    <tr key={c.id || i}>
                                        <td>
                                            <div style={{ fontWeight: 'bold', color: 'white' }}>{c.full_name}</div>
                                            <small className="text-muted">@{c.username}</small>
                                        </td>
                                        <td className="text-right" style={{ color: '#34d399', fontWeight: 'bold' }}>{formatCurrency(c.total_cobrado)}</td>
                                        <td className="text-center">{c.total_recibos}</td>
                                        <td className="text-right">{formatCurrency(c.promedio_recibo)}</td>
                                        <td className="text-right">
                                            {c.ultimo_cobro ? new Date(c.ultimo_cobro).toLocaleTimeString('es-NI', { timeZone: 'America/Managua', hour12: true, hour: '2-digit', minute: '2-digit'  }) : '-'}
                                            <br />
                                            <small className="text-muted">{c.ultimo_cobro ? new Date(c.ultimo_cobro).toLocaleDateString('es-NI', { timeZone: 'America/Managua' }) : ''}</small>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </CashClosingTable>
                </OverflowWrapper>
            </Card>




            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <SectionTitle style={{ marginBottom: 0 }}>Instalaciones y Servicio Técnico ({startDate} - {endDate})</SectionTitle>
                <ActionButton
                    $variant="outline-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => {
                        try {
                            const typesData = ['INSTALLATION', 'RECONNECTION', 'REPAIR', 'DISCONNECTION'].map(type => {
                                const found = orders.byType.find(t => t.type === type);
                                let label = type;
                                if (type === 'INSTALLATION') label = 'Instalaciones';
                                if (type === 'RECONNECTION') label = 'Reconexiones';
                                if (type === 'REPAIR') label = 'Reparaciones';
                                if (type === 'DISCONNECTION') label = 'Desconexiones';
                                return { "Tipo": label, "Total": found ? found.total : 0 };
                            });
                            typesData.push({
                                "Tipo": "TOTAL ÓRDENES",
                                "Total": orders.byStatus.reduce((acc, curr) => acc + curr.total, 0)
                            });
                            const wsTypes = XLSX.utils.json_to_sheet(typesData);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, wsTypes, "Instalaciones y Servicio");
                            XLSX.writeFile(wb, `Instalaciones_Servicio_${startDate}_al_${endDate}.xlsx`);
                        } catch (error) {
                            console.error("Error al exportar a Excel:", error);
                            alert("Hubo un error al generar el archivo Excel.");
                        }
                    }}>
                    📥 Exportar Instalaciones
                </ActionButton>
            </div>
            <Grid>
                <Card>
                    <Label style={{ color: '#3b82f6' }}>🛠️ Total Órdenes</Label>
                    <Value>{orders.byStatus.reduce((acc, curr) => acc + curr.total, 0)}</Value>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Generadas este mes</div>
                    <ActionButton
                        $variant="outline-primary"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => {
                            fetch(`/api/reports/orders/export?startDate=${startDate}&endDate=${endDate}`)
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Todas_Ordenes_${startDate}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Excel
                    </ActionButton>
                </Card>

                {/* Specific Types (Guaranteed Display) */}
                {['INSTALLATION', 'RECONNECTION', 'REPAIR', 'DISCONNECTION'].map((type, i) => {
                    const found = orders.byType.find(t => t.type === type);
                    const count = found ? found.total : 0;

                    let label = type;
                    let color = '#94a3b8';
                    let variant = 'outline-primary';
                    let fileName = type;

                    if (type === 'INSTALLATION') { label = 'Instalaciones'; color = '#10b981'; variant = 'outline-success'; fileName = 'Instalaciones'; }
                    if (type === 'RECONNECTION') { label = 'Reconexiones'; color = '#f59e0b'; variant = 'outline-warning'; fileName = 'Reconexiones'; }
                    if (type === 'REPAIR') { label = 'Reparaciones'; color = '#8b5cf6'; variant = 'outline-purple'; fileName = 'Reparaciones'; }
                    if (type === 'DISCONNECTION') { label = 'Desconexiones'; color = '#ef4444'; variant = 'outline-danger'; fileName = 'Desconexiones'; }

                    return (
                        <Card key={i}>
                            <Label style={{ color }}>{label}</Label>
                            <Value style={{ fontSize: '1.5rem' }}>{count}</Value>
                            <ActionButton
                                $variant={variant}
                                style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                                onClick={() => {
                                    fetch(`/api/reports/orders/export?startDate=${startDate}&endDate=${endDate}&type=${type}`)
                                        .then(res => res.blob())
                                        .then(blob => {
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `${fileName}_${startDate}.xlsx`;
                                            document.body.appendChild(a);
                                            a.click();
                                            a.remove();
                                        });
                                }}>
                                📥 Exportar Excel
                            </ActionButton>
                        </Card>
                    );
                })}
            </Grid>

            <SectionTitle>Notificaciones Web</SectionTitle>
            <Grid>
                {/* PENDING CARDS */}
                <Card>
                    <Label style={{ color: '#f59e0b' }}>⚠️ Averías Pendientes</Label>
                    <Value style={{ color: 'white' }}>{cableStats.averias_pendientes || 0}</Value>
                    <ActionButton
                        $variant="outline-warning"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => {
                            fetch('/api/notifications/averias/export?status=Pendiente')
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'Averias_Pendientes.xlsx';
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                <Card>
                    <Label style={{ color: '#3b82f6' }}>📞 Contactos Pendientes</Label>
                    <Value style={{ color: 'white' }}>{cableStats.contactos_pendientes || 0}</Value>
                    <ActionButton
                        $variant="outline-primary"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => {
                            fetch('/api/notifications/contactos/export?status=pending')
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'Contactos_Pendientes.xlsx';
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Excel
                    </ActionButton>
                </Card>

                {/* ATTENDED CARDS */}
                <Card>
                    <Label style={{ color: '#10b981' }}>✅ Averías Atendidas</Label>
                    <Value style={{ color: 'white' }}>{cableStats.averias_atendidas || 0}</Value>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>En periodo seleccionado</div>
                    <ActionButton
                        $variant="outline-success"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => {
                            fetch(`/api/notifications/averias/export?status=attended&startDate=${startDate}&endDate=${endDate}`)
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Averias_Atendidas_${startDate}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                <Card>
                    <Label style={{ color: '#8b5cf6' }}>✅ Contactos Atendidos</Label>
                    <Value style={{ color: 'white' }}>{cableStats.contactos_atendidos || 0}</Value>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>En periodo seleccionado</div>
                    <ActionButton
                        $variant="outline-purple"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => {
                            fetch(`/api/notifications/contactos/export?status=attended&startDate=${startDate}&endDate=${endDate}`)
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Contactos_Atendidos_${startDate}.xlsx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
            </Grid>

            <SectionTitle>Estado de Cartera de Clientes</SectionTitle>
            <Grid>
                {/* Clientes Activos - NUEVO */}
                {/* Clientes Activos */}
                <Card style={{ gridColumn: '1 / -1', background: 'rgba(34, 211, 238, 0.05)', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Label style={{ color: '#22d3ee', fontSize: '1.2rem' }}><FaUserCheck /> TOTAL CLIENTES ACTIVOS</Label>
                            <Value style={{ color: '#22d3ee', fontSize: '2.5rem' }}>{cableStats.clientes_activos || 0}</Value>
                            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Aquellos que actualmente reciben señal</div>
                        </div>
                        <ActionButton
                            $variant="outline-primary"
                            style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', borderColor: 'rgba(34,211,238,0.3)', color: '#22d3ee' }}
                            onClick={() => { fetch('/api/clients/export-xls?status=active').then(res => res.blob()).then(blob => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Clientes_Activos.xlsx'; document.body.appendChild(a); a.click(); a.remove(); }); }}
                        >
                            📥 Exportar Activos
                        </ActionButton>
                    </div>
                </Card>

                <Card>
                    <Label style={{ color: '#10b981' }}><FaUserCheck /> Activos: Al Día</Label>
                    <Value style={{ color: '#10b981' }}>{cableStats.al_dia || 0}</Value>
                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Activos sin pagos pendientes</div>
                    <ActionButton
                        $variant="outline-success"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => { fetch('/api/clients/export-xls?status=up_to_date').then(res => res.blob()).then(blob => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Clientes_Al_Dia.xlsx'; document.body.appendChild(a); a.click(); a.remove(); }); }}
                    >
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                <Card>
                    <Label style={{ color: '#ef4444' }}><FaUserTimes /> Activos: En Mora</Label>
                    <Value style={{ color: '#ef4444' }}>{cableStats.morosos?.count || 0}</Value>
                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Activos pero con deuda: <span style={{ color: 'white', fontWeight: 'bold' }}>{formatCurrency(cableStats.morosos?.deuda || 0)}</span></div>
                    <ActionButton
                        $variant="outline-danger"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => { fetch('/api/clients/export-xls?status=in_arrears').then(res => res.blob()).then(blob => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Clientes_Mora.xlsx'; document.body.appendChild(a); a.click(); a.remove(); }); }}
                    >
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                {/* Suspendidos = Cortado por Mora (status suspended) */}
                <Card>
                    <Label style={{ color: '#f59e0b' }}><FaUserTimes /> Cortados (Mora)</Label>
                    <Value style={{ color: '#f59e0b' }}>{cableStats.suspendidos || 0}</Value>
                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Conectores cortados por impago</div>
                    <ActionButton
                        $variant="outline-warning"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => { fetch('/api/clients/export-xls?status=suspended').then(res => res.blob()).then(blob => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Clientes_Suspendidos.xlsx'; document.body.appendChild(a); a.click(); a.remove(); }); }}
                    >
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                {/* Corte a Solicitud - diferente de suspenso por mora */}
                <Card>
                    <Label style={{ color: '#a78bfa' }}><FaUserTimes /> Cortados (Por Solicitud)</Label>
                    <Value style={{ color: '#a78bfa' }}>{cableStats.desconectados_solicitud || 0}</Value>
                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Bajas y desconexiones voluntarias</div>
                    <ActionButton
                        $variant="outline-purple"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => { fetch('/api/clients/export-xls?status=disconnected_by_request').then(res => res.blob()).then(blob => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Clientes_Desconectados_Solicitud.xlsx'; document.body.appendChild(a); a.click(); a.remove(); }); }}
                    >
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                <Card>
                    <Label style={{ color: '#64748b' }}><FaBan /> Clientes Retirados</Label>
                    <Value style={{ color: '#64748b' }}>{cableStats.retirados || 0}</Value>
                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Cables y equipos retirados físicamente</div>
                    <ActionButton
                        $variant="outline-secondary"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%', borderColor: 'rgba(148,163,184,0.3)', color: '#94a3b8' }}
                        onClick={() => { fetch('/api/clients/export-xls?status=retired').then(res => res.blob()).then(blob => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Clientes_Retirados.xlsx'; document.body.appendChild(a); a.click(); a.remove(); }); }}
                    >
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                <Card style={{ background: 'rgba(255, 255, 255, 0.05)', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Label style={{ color: 'white', fontSize: '1.2rem' }}><FaUserCheck /> TOTAL BASE INSTALADA (Todos)</Label>
                            <Value style={{ color: 'white', fontSize: '2.5rem' }}>{cableStats.total_clientes}</Value>
                            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>
                                Fila matemática exacta: Activos + Cortados (Mora) + Cortados (Solicitud) + Retirados
                            </div>
                        </div>
                        <ActionButton
                            $variant="outline-primary"
                            style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                            onClick={() => { fetch('/api/clients/export-xls?status=all').then(res => res.blob()).then(blob => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Total_Clientes.xlsx'; document.body.appendChild(a); a.click(); a.remove(); }); }}
                        >
                            📥 Exportar BD Completa
                        </ActionButton>
                    </div>
                </Card>
            </Grid>
            {showDailyReport && <DailyReportModal onClose={() => setShowDailyReport(false)} />}

            {/* ══════════════════════════════════════════════════════════════════
                SECCIÓN: FACTURAS POR COBRADOR — Búsqueda Avanzada
            ══════════════════════════════════════════════════════════════════ */}
            <div style={{ margin: '3rem 0 1rem 0', borderTop: '2px solid rgba(99,102,241,0.25)', paddingTop: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <SectionTitle style={{ marginBottom: 0, borderLeftColor: '#6366f1' }}>
                        🔍 Consulta de Facturas por Cobrador
                    </SectionTitle>
                    {invSearched && invData.length > 0 && (
                        <ActionButton $variant="outline-success" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={handleInvExportXLS}>
                            📥 Exportar Excel ({invPagination.total} registros)
                        </ActionButton>
                    )}
                </div>

                {/* ── Panel de filtros ── */}
                <InvFilterPanel>
                    <InvFilterGroup>
                        <label>Cobrador (Usuario)</label>
                        <select
                            value={invFilters.collectorId}
                            onChange={e => setInvFilters(f => ({ ...f, collectorId: e.target.value }))}
                        >
                            <option value="">— Todos los cobradores —</option>
                            {usersList.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.full_name || u.username} (@{u.username})
                                </option>
                            ))}
                        </select>
                    </InvFilterGroup>

                    <InvFilterGroup>
                        <label>Fecha Desde</label>
                        <input
                            type="date"
                            value={invFilters.startDate}
                            onChange={e => setInvFilters(f => ({ ...f, startDate: e.target.value }))}
                        />
                    </InvFilterGroup>

                    <InvFilterGroup>
                        <label>Fecha Hasta</label>
                        <input
                            type="date"
                            value={invFilters.endDate}
                            onChange={e => setInvFilters(f => ({ ...f, endDate: e.target.value }))}
                        />
                    </InvFilterGroup>

                    <InvFilterGroup>
                        <label>N° Factura</label>
                        <input
                            type="text"
                            placeholder="Ej: 00123"
                            value={invFilters.invoiceNumber}
                            onChange={e => setInvFilters(f => ({ ...f, invoiceNumber: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleInvSearch()}
                        />
                    </InvFilterGroup>

                    <InvFilterGroup>
                        <label>Cliente o Contrato</label>
                        <input
                            type="text"
                            placeholder="Nombre o N° contrato"
                            value={invFilters.clientSearch}
                            onChange={e => setInvFilters(f => ({ ...f, clientSearch: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleInvSearch()}
                        />
                    </InvFilterGroup>

                    <InvFilterGroup>
                        <label>Filas por Página</label>
                        <select
                            value={invFilters.limit}
                            onChange={e => setInvFilters(f => ({ ...f, limit: e.target.value }))}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </InvFilterGroup>

                    <InvFilterGroup style={{ justifyContent: 'flex-end' }}>
                        <label style={{ visibility: 'hidden' }}>Acción</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <ActionButton
                                $variant="primary"
                                style={{ flex: 1, justifyContent: 'center', padding: '0.65rem 1.2rem' }}
                                onClick={handleInvSearch}
                                disabled={invLoading}
                            >
                                {invLoading ? '⏳' : '🔍'} Buscar
                            </ActionButton>
                            <ActionButton
                                $variant="outline-danger"
                                style={{ padding: '0.65rem 0.9rem' }}
                                onClick={handleInvReset}
                                title="Limpiar filtros"
                            >
                                ✕
                            </ActionButton>
                        </div>
                    </InvFilterGroup>
                </InvFilterPanel>

                {/* ── Badges de resumen ── */}
                {invSearched && !invLoading && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                        <InvSummaryBadge $bg="rgba(99,102,241,0.1)" $color="#818cf8" $border="rgba(99,102,241,0.25)">
                            📋 {invSummary.totalFacturas} facturas encontradas
                        </InvSummaryBadge>
                        <InvSummaryBadge $bg="rgba(16,185,129,0.1)" $color="#34d399" $border="rgba(16,185,129,0.25)">
                            💵 Total cobrado: {formatCurrency(invSummary.totalMonto)}
                        </InvSummaryBadge>
                        {invSummary.totalCanceladas > 0 && (
                            <InvSummaryBadge $bg="rgba(239,68,68,0.1)" $color="#f87171" $border="rgba(239,68,68,0.25)">
                                🚫 {invSummary.totalCanceladas} canceladas ({formatCurrency(invSummary.montoCancelado)})
                            </InvSummaryBadge>
                        )}
                        <InvSummaryBadge $bg="rgba(148,163,184,0.07)" $color="#94a3b8" $border="rgba(148,163,184,0.15)">
                            📄 Pág. {invPagination.page} / {invPagination.totalPages || 1}
                        </InvSummaryBadge>
                    </div>
                )}

                {/* ── Tabla de resultados ── */}
                {invLoading ? (
                    <Card style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                        Consultando facturas...
                    </Card>
                ) : invSearched && invData.length === 0 ? (
                    <Card style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔎</div>
                        <div style={{ color: '#94a3b8', fontWeight: 600 }}>No se encontraron facturas con los filtros aplicados.</div>
                        <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.5rem' }}>Intenta ampliar el rango de fechas o ajustar los filtros.</div>
                    </Card>
                ) : invData.length > 0 ? (
                    <Card style={{ padding: '0', overflow: 'hidden' }}>
                        <OverflowWrapper>
                            <InvTable>
                                <thead>
                                    <tr>
                                        <th>N° Factura</th>
                                        <th>Fecha y Hora</th>
                                        <th>Cliente</th>
                                        <th>Contrato</th>
                                        <th>Cobrador</th>
                                        <th>Método</th>
                                        <th style={{ textAlign: 'right' }}>Monto</th>
                                        <th style={{ textAlign: 'center' }}>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invData.map((row, i) => {
                                        const cancelled = row.estado === 'CANCELLED';
                                        return (
                                            <tr key={row.id || i}>
                                                <td>
                                                    <span style={{ color: '#a5b4fc', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                                        {row.numero_factura}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                                                    {invFormatDate(row.fecha)}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: cancelled ? '#64748b' : '#e2e8f0' }}>
                                                        {row.cliente}
                                                    </div>
                                                </td>
                                                <td style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                                    {row.contrato}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: '#c4b5fd' }}>{row.cobrador}</div>
                                                    <small style={{ color: '#64748b' }}>@{row.usuario_cobrador}</small>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                                                        background: row.metodo_pago === 'cash' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                                                        color: row.metodo_pago === 'cash' ? '#34d399' : '#60a5fa'
                                                    }}>
                                                        {row.metodo_pago === 'cash' ? '💵 Efectivo' : row.metodo_pago === 'transfer' ? '🏦 Transferencia' : row.metodo_pago || '—'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: cancelled ? '#64748b' : '#4ade80', textDecoration: cancelled ? 'line-through' : 'none' }}>
                                                    {formatCurrency(row.monto)}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.7rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                                                        background: cancelled ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                                        color: cancelled ? '#f87171' : '#34d399'
                                                    }}>
                                                        {cancelled ? '🚫 Cancelado' : '✅ Exitoso'}
                                                    </span>
                                                    {cancelled && row.cancellation_reason && (
                                                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.3rem', maxWidth: '140px' }}>
                                                            {row.cancellation_reason}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </InvTable>
                        </OverflowWrapper>

                        {/* ── Paginación ── */}
                        <InvPagination style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                Mostrando <strong style={{ color: '#94a3b8' }}>
                                    {((invPagination.page - 1) * invPagination.limit) + 1}–{Math.min(invPagination.page * invPagination.limit, invPagination.total)}
                                </strong> de <strong style={{ color: '#94a3b8' }}>{invPagination.total}</strong> facturas
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <PageBtn
                                    onClick={() => handleInvPageChange(1)}
                                    disabled={invPagination.page <= 1 || invLoading}
                                    title="Primera página"
                                >«</PageBtn>
                                <PageBtn
                                    onClick={() => handleInvPageChange(invPagination.page - 1)}
                                    disabled={invPagination.page <= 1 || invLoading}
                                    title="Anterior"
                                >‹</PageBtn>

                                {/* Números de páginas */}
                                {Array.from({ length: Math.min(5, invPagination.totalPages) }, (_, i) => {
                                    const start = Math.max(1, Math.min(invPagination.page - 2, invPagination.totalPages - 4));
                                    const p = start + i;
                                    if (p < 1 || p > invPagination.totalPages) return null;
                                    return (
                                        <PageBtn
                                            key={p}
                                            $active={p === invPagination.page}
                                            onClick={() => handleInvPageChange(p)}
                                            disabled={invLoading}
                                        >{p}</PageBtn>
                                    );
                                })}

                                <PageBtn
                                    onClick={() => handleInvPageChange(invPagination.page + 1)}
                                    disabled={invPagination.page >= invPagination.totalPages || invLoading}
                                    title="Siguiente"
                                >›</PageBtn>
                                <PageBtn
                                    onClick={() => handleInvPageChange(invPagination.totalPages)}
                                    disabled={invPagination.page >= invPagination.totalPages || invLoading}
                                    title="Última página"
                                >»</PageBtn>
                            </div>
                        </InvPagination>
                    </Card>
                ) : null}
            </div>
            {/* ══════════════════════════════════════════════════════════════════ */}

            {showDailyReport && <DailyReportModal onClose={() => setShowDailyReport(false)} />}
        </PageWrapper >
    );
};

export default Reports;

