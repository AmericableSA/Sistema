import React from 'react';
import styled from 'styled-components';

// Overlay stays full-screen dark background
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start; /* align to top */
  justify-content: center;
  padding-top: 2rem; /* slight offset from top */
  z-index: 1000;
`;

// Modal appears near the top of the viewport
const Modal = styled.div`
  background: #1e293b;
  padding: 2rem;
  border-radius: 12px;
  width: 320px;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
`

const Title = styled.h2`
  margin: 0 0 1rem 0;
  color: #f8fafc;
  font-size: 1.4rem;
  text-align: center;
`;

const Button = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  background: #3b82f6;
  color: white;
  &:hover { background: #2563eb; }
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
`;

const ExportModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const download = (type) => {
    const link = document.createElement('a');
    link.href = `/api/clients/export?type=${type}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  return (
    <Overlay>
      <Modal>
        <CloseBtn onClick={onClose}>✖</CloseBtn>
        <Title>Exportar Clientes</Title>
        <Button onClick={() => download('active')}>Clientes al Día (Activos)</Button>
        <Button onClick={() => download('mora')}>Clientes en Mora</Button>
        <Button onClick={() => download('total')}>Todos los Clientes</Button>
      </Modal>
    </Overlay>
  );
};

export default ExportModal;
