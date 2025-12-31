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

const Reports = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [cableStats, setCableStats] = useState({ morosos: { count: 0, deuda: 0 }, retirados: 0, instalaciones_mes: 0 });
    const [dailyClosing, setDailyClosing] = useState({ ingresos: 0, egresos: 0, balance_dia: 0, por_usuario: [] });
    const [topCollectors, setTopCollectors] = useState([]);
    const [movements, setMovements] = useState({});
    const [orders, setOrders] = useState({ byType: [], byStatus: [] });
    const [refresh, setRefresh] = useState(0);

    // Date range state for reports
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const formatCurrency = (val) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(val || 0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api') + '/reports';
        const headers = { 'Authorization': `Bearer ${token}` };

        // Dates for Month Range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        try {
            const [statsRes, closingRes, topRes, moveRes, ordersRes] = await Promise.all([
                fetch(`${apiBaseUrl}/cable-stats`, { headers }),
                fetch(`${apiBaseUrl}/daily-closing?date=${selectedDate}`, { headers }),
                fetch(`${apiBaseUrl}/sales-by-user?startDate=${startOfMonth}&endDate=${endOfMonth}`, { headers }),
                fetch(`${apiBaseUrl}/movements?mode=daily&date=${selectedDate}`, { headers }),
                fetch(`${apiBaseUrl}/orders?mode=daily&date=${selectedDate}`, { headers })
            ]);

            setCableStats(await statsRes.json());
            setDailyClosing(await closingRes.json());
            setTopCollectors(await topRes.json());
            setMovements(await moveRes.json());
            setOrders(await ordersRes.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [refresh, selectedDate]);

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
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* Date Range Inputs */}
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid #475569', padding: '0.5rem', borderRadius: '8px' }}
                    />
                    <span style={{ margin: '0 0.5rem', color: '#94a3b8' }}>hasta</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid #475569', padding: '0.5rem', borderRadius: '8px' }}
                    />
                    {/* Quick-select Buttons */}
                    <button onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setStartDate(today);
                        setEndDate(today);
                    }} style={{ background: '#3b82f6', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', color: 'white', marginLeft: '0.5rem' }}>Hoy</button>
                    <button onClick={() => {
                        const today = new Date();
                        const oneMonthAgo = new Date();
                        oneMonthAgo.setMonth(today.getMonth() - 1);
                        const ago = oneMonthAgo.toISOString().split('T')[0];
                        const now = today.toISOString().split('T')[0];
                        setStartDate(ago);
                        setEndDate(now);
                    }} style={{ background: '#3b82f6', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', color: 'white', marginLeft: '0.5rem' }}>Hace un mes</button>
                    <button onClick={() => {
                        const today = new Date();
                        const first = new Date(today.getFullYear(), today.getMonth(), 1);
                        const start = first.toISOString().split('T')[0];
                        const end = today.toISOString().split('T')[0];
                        setStartDate(start);
                        setEndDate(end);
                    }} style={{ background: '#3b82f6', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', color: 'white', marginLeft: '0.5rem' }}>Mes actual</button>
                    <button onClick={() => setRefresh(prev => prev + 1)} style={{ background: '#3b82f6', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaSync /> Actualizar
                    </button>
                </div>
            </Header>

            <SectionTitle>Actividad Operativa ({startDate} - {endDate})</SectionTitle>
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

            <SectionTitle>Órdenes de Servicio ({selectedDate})</SectionTitle>
            <Grid>
                <Card>
                    <Label style={{ color: '#3b82f6' }}>🛠️ Total Órdenes</Label>
                    <Value>{orders.byStatus.reduce((acc, curr) => acc + curr.total, 0)}</Value>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Generadas en fecha</div>
                </Card>
                {orders.byType.map((t, i) => (
                    <Card key={i}>
                        <Label>{t.type}</Label>
                        <Value style={{ fontSize: '1.5rem' }}>{t.total}</Value>
                    </Card>
                ))}
            </Grid>

            {/* Existing Sections Below */}
            <SectionTitle>Cierre de Caja ({startDate})</SectionTitle>
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

            <SectionTitle>Actividad Operativa (Hoy)</SectionTitle>
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

            <SectionTitle>Órdenes de Servicio (Mes Actual)</SectionTitle>
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

            <SectionTitle>Estado de Cartera de Clientes</SectionTitle>
            <Grid>
                <Card>
                    <Label style={{ color: '#ef4444' }}><FaUserTimes /> Cortados por Mora</Label>
                    <Value style={{ color: '#ef4444' }}>{cableStats.morosos.count}</Value>
                    <div style={{ color: '#94a3b8' }}>Deuda: <span style={{ color: 'white', fontWeight: 'bold' }}>{formatCurrency(cableStats.morosos.deuda)}</span></div>
                </Card>
                <Card>
                    <Label style={{ color: '#f59e0b' }}><FaUserTimes /> Cortado a solicitud del cliente</Label>
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

        </PageWrapper>
    );
};

export default Reports;

