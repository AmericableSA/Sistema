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
    const [data, setData] = useState({ details: [], summary: {} });
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/daily-details?startDate=${date}&endDate=${date}`);
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, [date]);

    const formatMoney = (amount) => new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(amount);

    return (
        <ModalOverlay onClick={e => e.target === e.currentTarget && onClose()}>
            <ModalContent className="animate-slide-up">
                <Header>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>📜</span> Bitácora Diaria
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
                    </div>
                    <button onClick={onClose} className="btn-icon" style={{ fontSize: '1.5rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                </Header>

                <Content>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Cargando movimientos...</div>
                    ) : data.details.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
                            No hay movimientos registrados en esta fecha.
                        </div>
                    ) : (
                        <Table>
                            <thead>
                                <tr>
                                    <th>Hora</th>
                                    <th>Tipo</th>
                                    <th>Cliente / Descripción</th>
                                    <th>Cajero</th>
                                    <th>Método</th>
                                    <th style={{ textAlign: 'right' }}>Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.details.map((row, i) => {
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
                    )}
                </Content>

                <Footer>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Cobrado</div>
                            <div style={{ fontSize: '1.2rem', color: '#34d399', fontWeight: 'bold' }}>{formatMoney(data.summary?.totalSales)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ingresos Manuales</div>
                            <div style={{ fontSize: '1.2rem', color: '#34d399', fontWeight: 'bold' }}>{formatMoney(data.summary?.totalManualIn)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Salidas</div>
                            <div style={{ fontSize: '1.2rem', color: '#f87171', fontWeight: 'bold' }}>{formatMoney(data.summary?.totalManualOut)}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Balance Neto</div>
                        <div style={{ fontSize: '2rem', color: 'white', fontWeight: 'bold' }}>{formatMoney(data.summary?.netBalance)}</div>
                    </div>
                </Footer>
            </ModalContent>
        </ModalOverlay>
    );
};

export default DailyReportModal;
