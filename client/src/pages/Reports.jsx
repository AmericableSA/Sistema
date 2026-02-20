import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import {
    FaCalendarAlt, FaChartBar, FaUserTimes, FaUserCheck,
    FaMoneyBillWave, FaArrowLeft, FaSync, FaCashRegister, FaExchangeAlt
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

const Reports = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [cableStats, setCableStats] = useState({ morosos: { count: 0, deuda: 0 }, retirados: 0, instalaciones_mes: 0 });
    const [dailyClosing, setDailyClosing] = useState({ ingresos: 0, egresos: 0, balance_dia: 0, por_usuario: [] });
    const [topCollectors, setTopCollectors] = useState([]);
    const [collectorPerformance, setCollectorPerformance] = useState([]);
    const [movements, setMovements] = useState({});
    const [orders, setOrders] = useState({ byType: [], byStatus: [] });
    const [showDailyReport, setShowDailyReport] = useState(false);
    const [refresh, setRefresh] = useState(0);

    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
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
                "Último Cobro Registrado": c.ultimo_cobro ? new Date(c.ultimo_cobro).toLocaleString('es-NI') : 'Sin cobros'
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
            <SectionTitle>Cierre de Caja ({startDate} - {endDate})</SectionTitle>
            <Grid>
                <Card $highlight="linear-gradient(135deg, #059669 0%, #10b981 100%)">
                    <Label style={{ color: 'white' }}><FaCashRegister /> Ingresos</Label>
                    <Value>{formatCurrency(dailyClosing.ingresos)}</Value>
                    <div style={{ color: '#d1fae5', fontSize: '0.9rem' }}>Cobrado en transacciones</div>
                </Card>
                <Card $highlight="linear-gradient(135deg, #dc2626 0%, #ef4444 100%)">
                    <Label style={{ color: 'white' }}><FaExchangeAlt /> Gastos</Label>
                    <Value>{formatCurrency(dailyClosing.egresos)}</Value>
                    <div style={{ color: '#fecaca' }}>Pagos y Salidas</div>
                </Card>
                <Card>
                    <Label><FaMoneyBillWave /> Balance Neto</Label>
                    <Value style={{ color: dailyClosing.balance_dia >= 0 ? '#4ade80' : '#ef4444' }}>
                        {formatCurrency(dailyClosing.balance_dia)}
                    </Value>
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Diferencia (Caja Real)</div>
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
                                            {c.ultimo_cobro ? new Date(c.ultimo_cobro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            <br />
                                            <small className="text-muted">{c.ultimo_cobro ? new Date(c.ultimo_cobro).toLocaleDateString() : ''}</small>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </CashClosingTable>
                </OverflowWrapper>
            </Card>




            <Grid>
                <Card>
                    <Label style={{ color: '#3b82f6' }}>🛠️ Total Órdenes</Label>
                    <Value>{orders.byStatus.reduce((acc, curr) => acc + curr.total, 0)}</Value>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Generadas este mes</div>
                </Card>

                {/* Specific Types (Guaranteed Display) */}
                {['INSTALLATION', 'RECONNECTION', 'REPAIR', 'DISCONNECTION'].map((type, i) => {
                    const found = orders.byType.find(t => t.type === type);
                    const count = found ? found.total : 0;

                    let label = type;
                    let color = '#94a3b8';

                    if (type === 'INSTALLATION') { label = 'Instalaciones'; color = '#10b981'; }
                    if (type === 'RECONNECTION') { label = 'Reconexiones'; color = '#f59e0b'; }
                    if (type === 'REPAIR') { label = 'Reparaciones'; color = '#8b5cf6'; }
                    if (type === 'DISCONNECTION') { label = 'Desconexiones'; color = '#ef4444'; }

                    return (
                        <Card key={i}>
                            <Label style={{ color }}>{label}</Label>
                            <Value style={{ fontSize: '1.5rem' }}>{count}</Value>
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
                <Card>
                    <Label style={{ color: '#10b981' }}><FaUserCheck /> Clientes al Día</Label>
                    <Value style={{ color: '#10b981' }}>{cableStats.al_dia || 0}</Value>
                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Sin pagos pendientes</div>
                    <ActionButton
                        $variant="outline-success"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => {
                            fetch('/api/clients/export-xls?status=up_to_date')
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'Clientes_Al_Dia.xlsx';
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                <Card>
                    <Label style={{ color: '#ef4444' }}><FaUserTimes /> Cortados por Mora</Label>
                    <Value style={{ color: '#ef4444' }}>{cableStats.morosos.count}</Value>
                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Deuda: <span style={{ color: 'white', fontWeight: 'bold' }}>{formatCurrency(cableStats.morosos.deuda)}</span></div>
                    <ActionButton
                        $variant="outline-danger"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => {
                            fetch('/api/clients/export-xls?status=in_arrears')
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'Clientes_Mora.xlsx';
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                <Card>
                    <Label style={{ color: '#f59e0b' }}><FaUserTimes /> Cortado a solicitud del cliente</Label>
                    <Value style={{ color: '#f59e0b' }}>{cableStats.suspendidos}</Value>
                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Servicio suspendido</div>
                    <ActionButton
                        $variant="outline-warning"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                        onClick={() => {
                            fetch('/api/clients/export-xls?status=suspended')
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'Clientes_Suspendidos.xlsx';
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
                <Card>
                    <Label style={{ color: '#64748b' }}><FaUserCheck /> Total Clientes</Label>
                    <Value style={{ color: 'white' }}>{cableStats.total_clientes}</Value>
                    <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Base instalada total</div>
                    <ActionButton
                        $variant="outline-primary"
                        style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%', borderColor: 'rgba(148, 163, 184, 0.3)', color: '#94a3b8' }}
                        onClick={() => {
                            fetch('/api/clients/export-xls?status=all')
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'Total_Clientes.xlsx';
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                });
                        }}>
                        📥 Exportar Excel
                    </ActionButton>
                </Card>
            </Grid>
            {showDailyReport && <DailyReportModal onClose={() => setShowDailyReport(false)} />}
        </PageWrapper >
    );
};

export default Reports;

