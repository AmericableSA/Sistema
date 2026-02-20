import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { FaPrint, FaTimes, FaCalendarAlt, FaSearch } from 'react-icons/fa';

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(50px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  z-index: 1000;
  display: flex; justify-content: center; align-items: center;
  padding: clamp(0rem, 2vw, 1rem); /* Full width on mobile, padded on larger screens */
`;

const ModalContent = styled.div`
  background: radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%);
  width: 100%; max-width: 1000px;
  height: 100vh;
  border-radius: 0;
  border: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: ${slideUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  @media (min-width: 768px) {
    height: 90vh;
    border-radius: 24px;
  }
`;

const Header = styled.div`
  padding: clamp(1rem, 3vw, 1.5rem);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex; justify-content: space-between; align-items: flex-start;
  flex-direction: column;
  gap: 1rem;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(16px);
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: clamp(1rem, 3vw, 1.5rem);
  background: transparent;
  
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
`;

const Footer = styled.div`
  padding: clamp(1rem, 3vw, 1.5rem);
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex; justify-content: space-between; align-items: flex-start;
  flex-direction: column;
  gap: 1.5rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 0;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%; border-collapse: separate; border-spacing: 0; min-width: 600px;
  th, td { padding: 1.2rem 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; }
  th { position: sticky; top: 0; background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(8px); font-weight: 600; color: #94a3b8; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; z-index: 10; }
  tr { transition: background-color 0.2s; }
  tr:hover td { background-color: rgba(255,255,255,0.03); }
  tr:last-child td { border-bottom: none; }
`;

const Badge = styled.span`
  padding: 0.35rem 0.65rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em;
  ${props => props.type === 'IN' && `background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);`}
  ${props => props.type === 'OUT' && `background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);`}
  ${props => props.type === 'SALE' && `background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);`}
`;

const InputGroup = styled.div`
  display: flex; align-items: center; gap: 0.5rem;
  background: rgba(15, 23, 42, 0.6); padding: 0.6rem 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  &:focus-within {
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ActionButton = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.6rem 1.2rem; border-radius: 12px; font-weight: 600; font-size: 0.9rem;
  cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
  width: 100%;
  
  @media (min-width: 768px) { width: auto; }

  &:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4); }
  &:active { transform: translateY(0); }
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
            <div style={{ marginBottom: '2.5rem', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(12px)', borderRadius: '20px', border: `1px solid ${colorTheme}30`, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)' }}>
                {/* Section Header */}
                <div style={{ padding: '1.2rem', borderBottom: `1px solid ${colorTheme}20`, background: `linear-gradient(90deg, ${colorTheme}15 0%, transparent 100%)`, borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0, color: colorTheme, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
                        {icon} {title}
                    </h3>
                    {/* Session Info Badge */}
                    {mainSession ? (
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', textAlign: 'right' }}>
                            <div>
                                <span style={{ opacity: 0.7 }}>Iniciada por:</span> <strong style={{ color: 'white' }}>{mainSession.username}</strong>
                                <span style={{ marginLeft: '10px', fontSize: '0.8rem', opacity: 0.5, backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>{new Date(mainSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                            <TableWrapper style={{ maxHeight: '400px', marginBottom: '1.5rem' }}>
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
                            </TableWrapper>

                            {/* Section Summary */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', padding: '1.5rem', background: 'rgba(0,0,0,0.25)', borderRadius: '14px', flexWrap: 'wrap' }}>
                                <div style={{ textAlign: 'right', flex: '1 1 auto' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingresos</div>
                                    <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '1.1rem' }}>{formatMoney(summary.totalSales + summary.totalManualIn)}</div>
                                </div>
                                <div style={{ textAlign: 'right', flex: '1 1 auto' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salidas</div>
                                    <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: '1.1rem' }}>{formatMoney(summary.totalManualOut)}</div>
                                </div>
                                <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1.5rem', flex: '1 1 auto' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total {title}</div>
                                    <div style={{ color: 'white', fontWeight: '900', fontSize: '1.4rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{formatMoney(summary.net)}</div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', width: '100%' }}>
                        <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', flex: '1 1 100%' }}>
                            <span>📜</span> Bitácora Diaria (2 Cajas)
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
                            <InputGroup>
                                <FaCalendarAlt color="#94a3b8" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'white', fontFamily: 'inherit', outline: 'none', fontWeight: '500' }}
                                />
                            </InputGroup>
                            <ActionButton id="btn-export-daily" onClick={handleExport}>
                                <FaPrint /> Exportar Excel
                            </ActionButton>
                            <button onClick={onClose} className="btn-icon" style={{ fontSize: '1.5rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}>
                                <FaTimes />
                            </button>
                        </div>
                    </div>
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
                    <div style={{ display: 'flex', gap: '1.5rem', flex: '1 1 auto', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>💰</span>
                            <div style={{ lineHeight: '1.2' }}>
                                <div style={{ fontWeight: '800', color: 'white', fontSize: '1.1rem' }}>Llevar Todo</div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>Suma de ambas cajas</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(1rem, 3vw, 3rem)', alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-start', '@media (min-width: 768px)': { justifyContent: 'flex-end' } }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Global Ingresos</div>
                            <div style={{ fontSize: '1.2rem', color: '#34d399', fontWeight: 'bold' }}>{formatMoney(data.grandTotal?.sales + data.grandTotal?.entries)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Global Salidas</div>
                            <div style={{ fontSize: '1.2rem', color: '#f87171', fontWeight: 'bold' }}>{formatMoney(data.grandTotal?.exits)}</div>
                        </div>
                        <div style={{ borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 'clamp(1rem, 3vw, 2rem)' }}>
                            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gran Total Efectivo</div>
                            <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', color: '#fbbf24', fontWeight: '900', textShadow: '0 4px 10px rgba(251, 191, 36, 0.3)', lineHeight: '1' }}>{formatMoney(data.grandTotal?.net)}</div>
                        </div>
                    </div>
                </Footer>
            </ModalContent>
        </ModalOverlay >
    );
};

export default DailyReportModal;
