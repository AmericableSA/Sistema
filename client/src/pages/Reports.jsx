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

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const getTodayISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Managua' });

const fadeIn = keyframes`from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); }`;

const PageWrapper = styled.div`
  padding: clamp(1rem, 3vw, 2.5rem);
  background-color: #0f172a; 
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: #f8fafc;
  animation: ${fadeIn} 0.6s ease-out;
`;

const Header = styled.header`
  display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem;
  background: rgba(30, 41, 59, 0.4); backdrop-filter: blur(12px);
  padding: 1.5rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);
  @media (min-width: 1024px) { flex-direction: row; justify-content: space-between; align-items: center; }
`;

const TitleHeader = styled.h1`
  font-size: 1.8rem; color: white; margin: 0; font-weight: 800;
  background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
`;

const Grid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;
`;

const Card = styled.div`
  background: rgba(30, 41, 59, 0.4); padding: 1.5rem; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s;
  &:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.1); }
  ${props => props.$highlight && css`background: ${props.$highlight}; border: none;`}
`;

const Value = styled.div`font-size: 2rem; font-weight: 800; color: white; margin: 0.5rem 0;`;
const Label = styled.div`font-size: 0.9rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.5rem;`;

const SectionTitle = styled.h2`font-size: 1.25rem; color: #e2e8f0; margin-bottom: 1rem; font-weight: 700; border-left: 4px solid #3b82f6; padding-left: 1rem;`;

const CashClosingTable = styled.table`
    width: 100%; border-collapse: collapse; margin-top: 1rem;
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; }
    th { font-weight: 600; color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
`;

import { API_URL } from '../service/api';

const Reports = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [cableStats, setCableStats] = useState({ morosos: { count: 0, deuda: 0 }, retirados: 0, instalaciones_mes: 0 });
    const [dailyClosing, setDailyClosing] = useState({ ingresos: 0, egresos: 0, balance_dia: 0, por_usuario: [] });
    const [topCollectors, setTopCollectors] = useState([]);
    const [cashHistory, setCashHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'history'
    const [refresh, setRefresh] = useState(0);

    const formatCurrency = (val) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(val || 0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const apiBaseUrl = `${API_URL}/reports`;
        const headers = { 'Authorization': `Bearer ${token}` };

        // Dates for Month Range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        try {
            if (activeTab === 'summary') {
                const [statsRes, closingRes, topRes] = await Promise.all([
                    fetch(`${apiBaseUrl}/cable-stats`, { headers }),
                    fetch(`${apiBaseUrl}/daily-closing`, { headers }),
                    fetch(`${apiBaseUrl}/sales-by-user?startDate=${startOfMonth}&endDate=${endOfMonth}`, { headers })
                ]);
                setCableStats(await statsRes.json());
                setDailyClosing(await closingRes.json());
                setTopCollectors(await topRes.json());
            } else if (activeTab === 'history') {
                const histRes = await fetch(`${apiBaseUrl}/cash-history`, { headers });
                setCashHistory(await histRes.json());
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [refresh, activeTab]);

    useEffect(() => { fetchData(); }, [fetchData]);

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
                <button onClick={() => setRefresh(prev => prev + 1)} style={{ background: '#3b82f6', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaSync /> Actualizar Datos
                </button>
            </Header>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('summary')}
                    style={{
                        padding: '1rem 2rem', background: activeTab === 'summary' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                        border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    Resumen Operativo
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '1rem 2rem', background: activeTab === 'history' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                        border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    📜 Historial de Cajas
                </button>
            </div>

            {activeTab === 'history' && (
                <div className="animate-slide-up">
                    <Card style={{ overflowX: 'auto' }}>
                        <CashClosingTable>
                            <thead>
                                <tr>
                                    <th>Fecha Cierre</th>
                                    <th>Responsable</th>
                                    <th>Total Sistema</th>
                                    <th>Clientes</th>
                                    <th className="text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</td></tr>}
                                {!loading && cashHistory.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No hay cierres registrados aún.</td></tr>}
                                {cashHistory.map((row) => (
                                    <tr key={row.id}>
                                        <td>{new Date(row.closing_date).toLocaleString()}</td>
                                        <td>{row.username || 'Sistema'}</td>
                                        <td style={{ color: '#4ade80', fontWeight: 'bold' }}>{formatCurrency(row.total_cash)}</td>
                                        <td>{row.client_count}</td>
                                        <td className="text-right">
                                            <span style={{ padding: '0.3rem 0.8rem', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontSize: '0.85rem' }}>
                                                CERRADO
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </CashClosingTable>
                    </Card>
                </div>
            )}

            {activeTab === 'summary' && (
                <>

                    <SectionTitle>Mejores Colectores (Mes Actual)</SectionTitle>
                    <Grid>
                        {topCollectors.length > 0 ? topCollectors.map((c, i) => (
                            <Card key={i} $highlight={i === 0 ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" : undefined}>
                                <Label style={i === 0 ? { color: 'white' } : {}}><FaUserCheck /> {i + 1}º Lugar</Label>
                                <Value style={i === 0 ? { color: 'white' } : { color: '#f8fafc' }}>{c.nombre_usuario || 'Desconocido'}</Value>
                                <div style={i === 0 ? { color: '#bfdbfe' } : { color: '#94a3b8' }}>
                                    Recaudado: <span style={{ fontWeight: 'bold' }}>{formatCurrency(c.total_vendido)}</span>
                                </div>
                            </Card>
                        )) : <p style={{ color: '#94a3b8', paddingLeft: '1rem' }}>No hay datos de recaudación este mes.</p>}
                    </Grid>

                    <SectionTitle>Cierre de Caja (Hoy)</SectionTitle>
                    <Grid>
                        <Card $highlight="linear-gradient(135deg, #059669 0%, #10b981 100%)">
                            <Label style={{ color: 'white' }}><FaCashRegister /> Ingresos Hoy</Label>
                            <Value>{formatCurrency(dailyClosing.ingresos)}</Value>
                            <div style={{ color: '#d1fae5', fontSize: '0.9rem' }}>Cobrado en transacciones</div>
                        </Card>
                        <Card $highlight="linear-gradient(135deg, #dc2626 0%, #ef4444 100%)">
                            <Label style={{ color: 'white' }}><FaExchangeAlt /> Gastos Hoy</Label>
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
                            <Label>Desglose por Cajero (Solo Hoy)</Label>
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
                        </Card>
                    )}

                    <SectionTitle>Estado de Cartera de Clientes</SectionTitle>
                    <Grid>
                        <Card>
                            <Label style={{ color: '#ef4444' }}><FaUserTimes /> Morosos (Vencidos)</Label>
                            <Value style={{ color: '#ef4444' }}>{cableStats.morosos.count}</Value>
                            <div style={{ color: '#94a3b8' }}>Deuda: <span style={{ color: 'white', fontWeight: 'bold' }}>{formatCurrency(cableStats.morosos.deuda)}</span></div>
                        </Card>
                        <Card>
                            <Label style={{ color: '#f59e0b' }}><FaUserTimes /> Cortados</Label>
                            <Value style={{ color: '#f59e0b' }}>{cableStats.suspendidos}</Value>
                            <div style={{ color: '#94a3b8' }}>Servicio suspendido</div>
                        </Card>
                        <Card>
                            <Label style={{ color: '#64748b' }}><FaUserCheck /> Total Clientes</Label>
                            <Value style={{ color: 'white' }}>{cableStats.total_clientes}</Value>
                            <div style={{ color: '#94a3b8' }}>Base instalada total</div>
                        </Card>
                        <Card>
                            <Label style={{ color: '#3b82f6' }}><FaUserCheck /> Nuevas (Mes)</Label>
                            <Value style={{ color: '#3b82f6' }}>{cableStats.instalaciones_mes}</Value>
                            <div style={{ color: '#94a3b8' }}>Instalaciones del mes</div>
                        </Card>
                    </Grid>

                </>
            )}

        </PageWrapper>
    );
};

export default Reports;
