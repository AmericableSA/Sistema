const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'americable_secret_jwt_key_2026_secure';

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ msg: 'Token no proporcionado o sesión no autorizada.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'La sesión ha expirado. Inicie sesión nuevamente.', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ msg: 'Token de autenticación inválido o manipulado.', code: 'INVALID_TOKEN' });
    }
};

exports.JWT_SECRET = JWT_SECRET;
