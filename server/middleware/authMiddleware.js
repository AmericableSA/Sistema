const jwt = require('jsonwebtoken');

exports.checkRole = (roles) => {
    return (req, res, next) => {
        // Assume authMiddleware/token validation happened before this or integrate it here.
        // Usually, a previous middleware like 'authenticateToken' populates req.user
        // If not, we should probably check headers here or rely on the fact that routes using this
        // are already protected by a general auth middleware.

        // Let's assume req.user is set. If not, we might need to parse token.
        // But looking at existing code (e.g. authContext), tokens are sent.
        // Let's verify if there is a global auth middleware.

        // For safety, let's implement basic token check if req.user is missing, 
        // OR just check req.user if we are sure it's there.
        // Given existing patterns (e.g. req.user?.id usage in controllers), likely there is one.
        // We'll proceed assuming req.user exists, but specific routes might need 'verifyToken' first.

        if (!req.user) {
            // Fallback: try to decode token if not already done
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.sendStatus(401);

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
                req.user = decoded;
            } catch (err) {
                return res.sendStatus(403);
            }
        }

        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ msg: 'Acceso Denegado: Rol insuficiente' });
        }
    };
};
