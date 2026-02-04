import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaPrint, FaTimes, FaCalendarAlt, FaSearch } from 'react-icons/fa';

const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex; justify-content: center; align-items: center;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: #1e293b;
  width: 100%; max-width: 1000px;
  height: 90vh;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex; justify-content: space-between; align-items: center;
  background: #0f172a;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

const Footer = styled.div`
  padding: 1.5rem;
  background: #0f172a;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex; justify-content: space-between; align-items: center;
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse;
  th, td { padding: 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; }
  th { position: sticky; top: 0; background: #1e293b; font-weight: 600; color: #94a3b8; text-transform: uppercase; font-size: 0.85rem; }
  tr:hover td { background: rgba(255,255,255,0.02); }
`;

const Badge = styled.span`
  padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: bold;
  ${props => props.type === 'IN' && `background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);`}
  ${props => props.type === 'OUT' && `background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);`}
  ${props => props.type === 'SALE' && `background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);`}
`;

const InputGroup = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
  background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
`;

const DailyReportModal = ({ onClose }) => {
    // Default to today
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    // Initialize structure for new split
    const [data, setData] = useState({
        office: { data: [], sessions: [], summary: {} },
        collectors: { data: [], sessions: [], summary: {} },
        grandTotal: {}
    });
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/daily-details?startDate=${date}&endDate=${date}`);
            const json = await res.json();
            // Handle both legacy (array) and new (object) structures gracefully during potential transition
            if (json.office) {
                setData(json);
            } else {
                // Fallback for old API response style (should not happen after deploy)
                setData({
                    office: { data: json.details || [], sessions: [], summary: json.summary || {} },
                    collectors: { data: [], sessions: [], summary: {} },
                    grandTotal: json.summary || {}
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, [date]);

    const formatMoney = (amount) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(amount || 0);

    const handleExport = async () => {
        const btn = document.getElementById('btn-export-daily');
        if (btn) btn.innerText = '⌛...';

        try {
            const res = await fetch(`/api/reports/daily-details/export?startDate=${date}&endDate=${date}`);
            if (!res.ok) throw new Error('Error generando reporte');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bitacora_Diaria_${date}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export Failed:', error);
            alert('Error al exportar el archivo');
        } finally {
            if (btn) btn.innerText = '📊 Exportar Excel';
        }
    };

    // Helper: Render Section
    const renderSection = (title, icon, groupData, colorTheme) => {
        const { data: rows, sessions, summary } = groupData;
        const hasData = rows.length > 0;

        // Find latest session for display
        const mainSession = sessions.length > 0 ? sessions[0] : null;

        return (
            <div style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: `1px solid ${colorTheme}30` }}>
                {/* Section Header */}
                <div style={{ padding: '1rem', borderBottom: `1px solid ${colorTheme}20`, background: `${colorTheme}10`, borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: colorTheme, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {icon} {title}
                    </h3>
                    {/* Session Info Badge */}
                    {mainSession ? (
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', textAlign: 'right' }}>
                            <div>
                                <span style={{ opacity: 0.6 }}>Iniciada por:</span> <strong style={{ color: 'white' }}>{mainSession.username}</strong>
                                <span style={{ marginLeft: '10px', fontSize: '0.8rem', opacity: 0.5 }}>({new Date(mainSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                            </div>
                            {mainSession.status === 'closed' && (
                                <div style={{ color: '#f87171' }}>
                                    <span style={{ opacity: 0.6 }}>Cerrada con:</span> <strong>{formatMoney(mainSession.end_amount_physical)}</strong>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Sin sesión formal iniciada</div>
                    )}
                </div>

                {/* Data Content */}
                <div style={{ padding: '1rem' }}>
                    {!hasData ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontStyle: 'italic' }}>
                            No hay movimientos registrados en {title}
                        </div>
                    ) : (
                        <>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>Hora</th>
                                            <th>Tipo</th>
                                            <th>Cliente / Razón</th>
                                            <th>Responsable</th>
                                            <th>Método</th>
                                            <th style={{ textAlign: 'right' }}>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, i) => {
                                            const isIncome = row.type === 'SALE' || row.type === 'IN' || row.category === 'TRANSACTION';
                                            return (
                                                <tr key={i}>
                                                    <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                                                        {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td>
                                                        <Badge type={row.category === 'TRANSACTION' ? 'SALE' : row.type}>
                                                            {row.category === 'TRANSACTION' ? 'COBRO' : (row.type === 'IN' ? 'INGRESO' : 'SALIDA')}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: '500', color: 'white' }}>{row.client_name || row.description}</div>
                                                        {row.client_name && row.description && row.client_name !== row.description && (
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.description}</div>
                                                        )}
                                                        {row.contract_number && <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>#{row.contract_number}</div>}
                                                    </td>
                                                    <td>{row.collector}</td>
                                                    <td style={{ textTransform: 'capitalize' }}>{row.payment_method}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: isIncome ? '#34d399' : '#f87171' }}>
                                                        {isIncome ? '+' : '-'} {Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            </div>

                            {/* Section Summary */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Ingresos</div>
                                    <div style={{ color: '#34d399', fontWeight: 'bold' }}>{formatMoney(summary.totalSales + summary.totalManualIn)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Salidas</div>
                                    <div style={{ color: '#f87171', fontWeight: 'bold' }}>{formatMoney(summary.totalManualOut)}</div>
                                </div>
                                <div style={{ textAlign: 'right', borderLeft: '1px solid #334155', paddingLeft: '1rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total {title}</div>
                                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>{formatMoney(summary.net)}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <ModalOverlay onClick={e => e.target === e.currentTarget && onClose()}>
            <ModalContent className="animate-slide-up">
                <Header>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>📜</span> Bitácora Diaria (2 Cajas)
                        </h2>
                        <InputGroup>
                            <FaCalendarAlt color="#94a3b8" />
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontFamily: 'inherit', outline: 'none' }}
                            />
                        </InputGroup>
                        <button
                            id="btn-export-daily"
                            onClick={handleExport}
                            style={{
                                background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399',
                                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            📊 Exportar Excel
                        </button>
                    </div>
                    <button onClick={onClose} className="btn-icon" style={{ fontSize: '1.5rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                </Header>

                <Content>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Cargando cajas...</div>
                    ) : (
                        <>
                            {/* CAJA OFICINA */}
                            {renderSection('Caja Oficina', '🏢', data.office, '#3b82f6')}

                            {/* CAJA COLECTORES */}
                            {renderSection('Caja Colectores', '🏍️', data.collectors, '#f59e0b')}
                        </>
                    )}
                </Content>

                <Footer>
                    <div style={{ display: 'flex', gap: '2rem', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '2rem' }}>💰</span>
                            <div style={{ lineHeight: '1.2' }}>
                                <div style={{ fontWeight: 'bold', color: 'white' }}>Llevar Todo</div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Suma de ambas cajas</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '3rem' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Global Ingresos</div>
                            <div style={{ fontSize: '1.1rem', color: '#34d399', fontWeight: 'bold' }}>{formatMoney(data.grandTotal?.sales + data.grandTotal?.entries)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Global Salidas</div>
                            <div style={{ fontSize: '1.1rem', color: '#f87171', fontWeight: 'bold' }}>{formatMoney(data.grandTotal?.exits)}</div>
                        </div>
                        <div style={{ borderLeft: '1px solid #475569', paddingLeft: '1.5rem' }}>
                            <div style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 'bold', textTransform: 'uppercase' }}>Gran Total Efectivo</div>
                            <div style={{ fontSize: '2rem', color: '#fbbf24', fontWeight: 'bold' }}>{formatMoney(data.grandTotal?.net)}</div>
                        </div>
                    </div>
                </Footer>
            </ModalContent>
        </ModalOverlay >
    );
};

export default DailyReportModal;
