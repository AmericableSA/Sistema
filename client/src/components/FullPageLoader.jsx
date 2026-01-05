import React from 'react';

const FullPageLoader = () => {
    return (
        <div className="full-page-loader">
            <div className="spinner"></div>
            <h3 style={{ marginTop: '1rem', color: 'white', fontWeight: 'bold' }}>Cargando...</h3>
        </div>
    );
};

export default FullPageLoader;
