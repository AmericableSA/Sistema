import React from 'react';

const FullPageLoader = () => {
    return (
        <div className="full-page-loader" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <div className="spinner"></div>
            <h3 style={{ marginTop: '1rem', color: 'white', fontWeight: 'bold' }}>Cargando...</h3>
        </div>
    );
};

export default FullPageLoader;
